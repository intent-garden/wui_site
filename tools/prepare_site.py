#!/usr/bin/env python3
import json
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description='Prepare and validate the public WUI website files.')
parser.add_argument('destination', type=Path)
parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
root = args.source.resolve()
destination = args.destination.resolve()
# Explicit public files: never publish .git, workflows or tooling.
entries = [
    'index.html', 'doc.html', 'main', 'main_ru', 'assets', 'wasm',
    'download', 'ai-agents.json', 'llms.txt', 'site.webmanifest',
    'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png',
    'apple-touch-icon.png', 'android-chrome-192x192.png',
    'android-chrome-512x512.png',
]
required = [
    'main/index.html', 'main_ru/index.html',
    'assets/css/site.css', 'assets/css/demo.css',
    'assets/js/site.js', 'assets/js/demo-frame.js',
]
manifest = json.loads((root / 'wasm/manifest.json').read_text())
for app in ('demo', 'simple', 'hello_world'):
    required.append(f'wasm/{app}/index.html')
    for extension in ('js', 'wasm', 'data'):
        file = root / f'wasm/{app}/{app}.{extension}'
        if file.stat().st_size != manifest[app][extension]:
            raise RuntimeError(f'WASM build does not match manifest: {file}')
        if extension == 'wasm':
            with file.open('rb') as stream:
                if stream.read(8) != b'\x00asm\x01\x00\x00\x00':
                    raise RuntimeError(f'Invalid WASM binary: {file}')
for name in required:
    if not (root / name).is_file() or (root / name).stat().st_size == 0:
        raise RuntimeError(f'Missing or empty website file: {name}')
destination.mkdir(parents=True, exist_ok=False)
for name in entries:
    source = root / name
    if source.is_dir():
        shutil.copytree(source, destination / name)
    else:
        shutil.copy2(source, destination / name)
print(f'Prepared {sum(p.is_file() for p in destination.rglob("*"))} public files')
