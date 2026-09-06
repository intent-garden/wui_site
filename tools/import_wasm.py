#!/usr/bin/env python3
"""Import built WUI examples into this static site. No compiler needed here."""
import argparse
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('build_dir', type=Path, help='WUI CMake build directory, e.g. ../wui/build-wasm-release')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
apps = ('demo', 'simple', 'hello_world')
# Validate the complete build before updating any existing assets.
sources = [(app, ext, args.build_dir / 'examples' / app / (app + '.' + ext))
           for app in apps for ext in ('js', 'wasm', 'data')]
for _, _, source in sources:
    if not source.is_file():
        parser.error('Missing build artifact: ' + str(source))
manifest = {}
for app in apps:
    target = root / 'wasm' / app
    target.mkdir(parents=True, exist_ok=True)
    manifest[app] = {}
    for name, ext, source in sources:
        if name == app:
            shutil.copy2(source, target / source.name)
            manifest[app][ext] = source.stat().st_size
    (target / 'index.html').write_text('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WUI / APP</title><meta name="robots" content="noindex"><link rel="icon" href="../../favicon.ico"><link rel="stylesheet" href="../../assets/css/demo.css">
<script src="../../assets/js/demo-frame.js" defer></script><script src="APP.js" defer></script></head>
<body data-app="APP"><header><a id="back" href="../../main/#playground">Back to WUI</a><span id="frame-hint">C++ / WebAssembly</span><button data-restart>Restart</button></header>
<main id="wui" aria-label="WUI application"></main><div class="frame-status"><p id="status" role="status">Loading...</p><button data-restart hidden>Restart</button></div>
<noscript>This application requires JavaScript and WebAssembly.</noscript></body></html>'''.replace('APP', app), encoding='utf-8')
(root / 'wasm' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('Imported ' + ', '.join(apps) + ' into ' + str(root / 'wasm'))
