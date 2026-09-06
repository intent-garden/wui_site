#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BUCKET=${WUI_SITE_BUCKET:-libwui.org}
ENDPOINT=${S3_ENDPOINT_URL:-https://storage.yandexcloud.net}
REGION=${AWS_DEFAULT_REGION:-ru-central1}
AWS_BIN=${AWS_BIN:-aws}
PYTHON_BIN=${PYTHON_BIN:-python3}
DRY_RUN=false
if [[ $# -gt 1 ]]; then
    echo "Usage: $0 [--dry-run]" >&2
    exit 2
fi
case "${1:-}" in
    --dry-run) DRY_RUN=true ;;
    '') ;;
    *) echo "Usage: $0 [--dry-run]" >&2; exit 2 ;;
esac
command -v "$AWS_BIN" >/dev/null || { echo 'AWS CLI is required.' >&2; exit 127; }
command -v "$PYTHON_BIN" >/dev/null || { echo 'Python 3 is required.' >&2; exit 127; }
if [[ -z "$BUCKET" || "$BUCKET" == */* ]]; then
    echo 'WUI_SITE_BUCKET must be a bucket name without a URL or path.' >&2
    exit 2
fi

# Use the configured AWS profile or environment. Never store keys in this file.
export AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED
export AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED
DEPLOY_TMP=$(mktemp -d "${TMPDIR:-/tmp}/wui-deploy.XXXXXX")
trap 'rm -rf "$DEPLOY_TMP"' EXIT
SITE_DIR="$DEPLOY_TMP/site"
"$PYTHON_BIN" "$SCRIPT_DIR/tools/prepare_site.py" "$SITE_DIR"
AWS=("$AWS_BIN" --endpoint-url="$ENDPOINT" --region "$REGION")
OPTIONS=(--no-progress)
if "$DRY_RUN"; then OPTIONS+=(--dryrun); fi
printf 'Publishing to s3://%s/ via %s (dry-run: %s)\n' "$BUCKET" "$ENDPOINT" "$DRY_RUN"

upload() {
    "${AWS[@]}" s3 cp "$SITE_DIR/" "s3://$BUCKET/" \
        --recursive --no-follow-symlinks --cache-control no-cache \
        "${OPTIONS[@]}" "$@"
}
# Preserve independently published /doc/, /doc_ru/ and other existing objects.
upload --exclude '*.html' --exclude '*.wasm' --exclude '*.data'
upload --exclude '*' --include '*.wasm' --content-type application/wasm
upload --exclude '*' --include '*.data' --content-type application/octet-stream
upload --exclude '*' --include '*.html' --content-type 'text/html; charset=utf-8'

if "$DRY_RUN"; then
    echo 'Dry run completed; nothing uploaded.'
    exit 0
fi

# Compare actual S3 bytes, not just the exit status of the upload command.
for key in main/index.html main_ru/index.html assets/css/site.css wasm/manifest.json; do
    "${AWS[@]}" s3 cp "s3://$BUCKET/$key" "$DEPLOY_TMP/verify" --no-progress --only-show-errors
    cmp "$SITE_DIR/$key" "$DEPLOY_TMP/verify"
    printf 'Verified S3 content: %s\n' "$key"
done
for app in demo simple hello_world; do
    key="wasm/$app/$app.wasm"
    "${AWS[@]}" s3api head-object --bucket "$BUCKET" --key "$key" \
        --query '{size:ContentLength,type:ContentType,cache:CacheControl}' --output json > "$DEPLOY_TMP/meta.json"
    "$PYTHON_BIN" - "$SITE_DIR/$key" "$DEPLOY_TMP/meta.json" <<'PY'
import json
import sys
from pathlib import Path
file = Path(sys.argv[1])
metadata = json.loads(Path(sys.argv[2]).read_text())
if metadata != {'size': file.stat().st_size, 'type': 'application/wasm', 'cache': 'no-cache'}:
    raise SystemExit(f'Unexpected S3 metadata for {file.name}: {metadata}')
print(f'Verified WASM metadata: {file.name}')
PY
done
printf 'Published and verified s3://%s/\n' "$BUCKET"
