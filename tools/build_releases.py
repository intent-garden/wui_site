#!/usr/bin/env python3
"""Build release news from the library changelog and available Git history."""
import argparse
from datetime import datetime
from html import escape
import json
from pathlib import Path
import re
import subprocess

import markdown

REPOSITORY = 'https://github.com/intent-garden/wui'
HEADINGS = re.compile(r'^# (\d+\.\d+\.\d{6})\s*$', re.MULTILINE)
SUMMARIES = {
    '1.5.261116': {
        'en': ('A steadier UI. Native media on macOS.', 'Timers on the UI thread, faster long lists, optional microphone, speaker, camera and screen APIs on macOS, and Windows/Linux CI. Cleanly rebuild WUI and your application together.'),
        'ru': ('Отзывчивый UI и устройства macOS.', 'Таймеры на UI-потоке, быстрые длинные списки, опциональные API микрофона, динамиков, камеры и экрана на macOS, CI Windows/Linux. WUI и приложение нужно полностью пересобрать вместе.'),
    },
    '1.4.260907': {
        'en': ('WUI arrives on macOS and in the browser.', 'Experimental AppKit and WebAssembly backends, three live C++ examples, a new Showcase and improvements to text editing and scrollbars.'),
        'ru': ('WUI на macOS и в браузере.', 'Экспериментальные порты AppKit и WebAssembly, три живых примера C++, новый Showcase, улучшения ввода текста и прокрутки.'),
    },
    '1.3.260902': {
        'en': ('Images, scaled and cached.', 'Linux gains graphic::draw_image for scaled PNG images with a per-path surface cache.'),
        'ru': ('Изображения с масштабированием и кешем.', 'В Linux появился graphic::draw_image: масштабирование PNG и кеширование поверхностей по пути к файлу.'),
    },
}


def git(source, *args):
    return subprocess.check_output(['git', '-C', str(source), *args], text=True).strip()


def read_releases(source):
    content = (source / 'ChangeLog.md').read_text(encoding='utf-8-sig')
    headings = list(HEADINGS.finditer(content))
    if not headings:
        raise ValueError('No version headings in ChangeLog.md')
    # A commit containing a record is evidence of that record, not of a release
    # tag or publication date. Prefer the final snapshot headed by that version.
    commits = git(source, 'log', '--format=%H', '--', 'ChangeLog.md').splitlines()
    evidence, headed = {}, {}
    for commit in commits:
        snapshot = git(source, 'show', f'{commit}:ChangeLog.md')
        found = list(HEADINGS.finditer(snapshot))
        if found:
            headed.setdefault(found[0].group(1), commit)
        for heading in found:
            evidence[heading.group(1)] = commit
    tags = set(git(source, 'tag', '--list').splitlines())
    entries = []
    for index, heading in enumerate(headings):
        version = heading.group(1)
        body = content[heading.end():headings[index + 1].start() if index + 1 < len(headings) else None].strip()
        commit = headed.get(version) or evidence.get(version)
        if not commit or not body:
            raise ValueError(f'Missing history or release notes for {version}')
        date = datetime.strptime(version.rsplit('.', 1)[1], '%y%m%d').date().isoformat()
        tag = f'v{version}'
        entries.append(dict(version=version, date=date, body=body, commit=commit,
                            source_url=f'{REPOSITORY}/blob/{commit}/ChangeLog.md',
                            release_url=f'{REPOSITORY}/releases/tag/{tag}' if tag in tags else None))
    return entries


def summary(entry, language):
    return SUMMARIES.get(entry['version'], {}).get(language, (
        f"WUI {entry['version']}",
        re.sub(r'^\d+\.\s*', '', entry['body'].splitlines()[0])))


def card(entry, language):
    title, text = summary(entry, language)
    archive = 'news_ru' if language == 'ru' else 'news'
    label = 'Что изменилось' if language == 'ru' else 'What changed'
    return (f'<article class="release-card"><div class="release-meta"><span>WUI {entry["version"]}</span>'
            f'<time datetime="{entry["date"]}">{entry["date"]}</time></div>'
            f'<h3>{escape(title)}</h3><p>{escape(text)}</p>'
            f'<a class="release-link" href="../{archive}/#v{entry["version"]}">{label} ↗</a></article>')


def build(source, destination):
    entries = read_releases(source)
    for language, landing, archive in [('en', 'main', 'news'), ('ru', 'main_ru', 'news_ru')]:
        ru = language == 'ru'
        title = 'Новости релизов' if ru else 'Release news'
        intro = ('Развитие WUI: новые возможности и исправления из истории проекта.' if ru else
                 'How WUI evolves: new capabilities and fixes from the project history.')
        label = 'Вся история релизов' if ru else 'All release notes'
        home = destination / landing / 'index.html'
        page = home.read_text()
        marker = '<!-- RELEASE_NEWS -->'
        if page.count(marker) != 1:
            raise ValueError(f'Expected one release marker in {home}')
        section = (f'<section class="wrap section release-news" id="releases" aria-labelledby="release-heading">'
                   f'<div class="section-heading"><div><div class="eyebrow">04 / WUI</div><h2 id="release-heading">{title}</h2></div>'
                   f'<div><p>{intro}</p><a class="release-link" href="../{archive}/">{label} ↗</a></div></div>'
                   f'<div class="release-grid">{"".join(card(e, language) for e in entries[:3])}</div></section>')
        home.write_text(page.replace(marker, section))
        header = page.split('<main id="content">', 1)[0]
        header = re.sub(r'<title>.*?</title>', f'<title>{title} — WUI</title>', header)
        for original, translated in [('main', 'news'), ('main_ru', 'news_ru')]:
            header = header.replace(f'https://libwui.org/{original}/', f'https://libwui.org/{translated}/')
        header = re.sub(r'(<meta name="description" content=")[^"]*', r'\g<1>' + escape(intro, quote=True), header)
        header = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>' + title + ' — WUI', header)
        header = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\g<1>' + escape(intro, quote=True), header)
        header = re.sub(r'<script src="\.\./assets/js/site.js" defer></script>', '', header)
        header = header.replace(' class="no-js"', '')
        header = header.replace('href="./"', f'href="../{landing}/"')
        for anchor in ('playground', 'approach', 'start', 'releases'):
            header = header.replace(f'href="#{anchor}"', f'href="../{landing}/#{anchor}"')
        header = header.replace('href="../main/" lang="en"', 'href="../news/" lang="en"')
        header = header.replace('href="../main_ru/" lang="ru"', 'href="../news_ru/" lang="ru"')
        note = ('Архив восстановлен по ChangeLog.md и доступной Git-истории. Дата соответствует номеру версии; '
                'это не подтверждение даты публикации удалённого GitHub Release. Оригинальные заметки сохранены на английском. '
                'Ссылки на GitHub Releases показаны только для существующих тегов.' if ru else
                'This archive is reconstructed from ChangeLog.md and available Git history. Dates are encoded in version numbers; '
                'they do not establish when a deleted GitHub Release was published. Original changelog notes are preserved. '
                'GitHub Release links are shown only for existing tags.')
        articles = []
        for index, entry in enumerate(entries):
            version = entry['version']
            release_link = (f'<a class="release-link" href="{entry["release_url"]}">GitHub Release ↗</a>'
                            if entry['release_url'] else '')
            source_label = 'Запись в Git' if ru else 'Record in Git'
            heading = summary(entry, language)[0]
            notes = markdown.markdown(escape(entry['body'], quote=False))
            details_label = 'Оригинальные изменения' if ru else 'Original changelog'
            details = (f'<details{" open" if index == 0 else ""}><summary>{details_label}</summary>'
                       f'<div class="release-notes">{notes}</div></details>')
            articles.append(f'<article class="release-entry" id="v{version}"><div class="release-meta">'
                            f'<span>WUI {version}</span><time datetime="{entry["date"]}">{entry["date"]}</time></div>'
                            f'<h2>{escape(heading)}</h2><p>{escape(summary(entry, language)[1])}</p>{details}'
                            f'<div class="release-links">{release_link}<a class="release-link" href="{entry["source_url"]}">{source_label} ↗</a></div></article>')
        footer = page[page.index('<footer '):page.index('</footer>') + len('</footer>')]
        footer = footer.replace('href="./"', f'href="../{landing}/"')
        output = destination / archive
        output.mkdir(parents=True, exist_ok=True)
        (output / 'index.html').write_text(header + f'<main id="content" class="wrap release-archive">'
                                        f'<div class="eyebrow">WUI / {title}</div><h1>{title}</h1><p class="release-intro">{intro}</p>'
                                        f'<p class="archive-note">{note}</p>{"".join(articles)}</main>{footer}</body></html>')
    data = [{k: v for k, v in entry.items() if k != 'body'} for entry in entries]
    (destination / 'releases.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Built release news in EN/RU: {len(entries)} entries, latest {entries[0]["version"]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path, help='WUI Git checkout with complete history and tags')
    parser.add_argument('--output', required=True, type=Path, help='Prepared website directory')
    args = parser.parse_args()
    build(args.source.resolve(), args.output.resolve())
