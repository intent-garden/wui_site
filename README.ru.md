# libwui.org

Статический сайт библиотеки WUI: страницы EN/RU и настоящие C++-примеры, собранные в WebAssembly. Без npm, фреймворка и серверного приложения.

## Локальный запуск

Из корня сайта:

```sh
python3 -m http.server 8081 --bind 127.0.0.1
```

Открыть http://localhost:8081. Корневая страница выбирает язык браузера; `/main/` и `/main_ru/` доступны напрямую. Без JavaScript корень показывает обе ссылки, а страницы — текст и документацию.

## Структура

- `main/index.html`, `main_ru/index.html` — английская и русская страницы.
- `assets/css/site.css`, `assets/js/site.js` — оформление и переключение примеров.
- `assets/css/demo.css`, `assets/js/demo-frame.js` — оболочка настоящего WUI-приложения.
- `wasm/{demo,simple,hello_world}/` — автономные приложения: HTML, JS, WASM, ресурсы `.data`.
- `tools/import_wasm.py` — обновление примеров из CMake-сборки WUI.
- `tools/smoke.mjs` — браузерные проверки сайта с Playwright.

## Обновить WASM

В репозитории библиотеки, после активации Emscripten:

```sh
emcmake cmake -S . -B build-wasm-release -DCMAKE_BUILD_TYPE=Release
cmake --build build-wasm-release --target wui_web_site --parallel
```

В репозитории сайта:

```sh
python3 tools/import_wasm.py ../wui/build-wasm-release
```

Скрипт сначала проверяет наличие всех артефактов, затем копирует их и создаёт HTML-оболочки и `wasm/manifest.json` с размерами файлов. Обновляйте `.js`, `.wasm` и `.data` вместе. Собранные примеры включены в сайт: для размещения компилятор не нужен.

Примеры загружаются при приближении к песочнице. В каждый момент существует только один iframe. Вкладки можно переключать стрелками, Home и End. `Shift+Escape` возвращает фокус из приложения к вкладкам сайта. Canvas-интерфейс самого WUI пока не имеет полноценного дерева доступности. На телефонах демо масштабируется; отдельно открытое приложение даёт рабочую область с прокруткой.

## Проверки

Нужен установленный Playwright и его браузеры. Можно использовать установку из соседнего репозитория WUI:

```sh
PLAYWRIGHT_MODULE="$PWD/../wui/tests/wasm/node_modules/playwright/index.mjs" node tools/smoke.mjs
WUI_BROWSER=firefox PLAYWRIGHT_MODULE="$PWD/../wui/tests/wasm/node_modules/playwright/index.mjs" node tools/smoke.mjs
WUI_BROWSER=webkit PLAYWRIGHT_MODULE="$PWD/../wui/tests/wasm/node_modules/playwright/index.mjs" node tools/smoke.mjs
```

Проверяются RU/EN, мобильная ширина, запуск трёх приложений, перезапуск, клавиатурные вкладки, обработка ошибки загрузки с повторной попыткой и сценарий без JavaScript. Скриншоты сохраняются в `/private/tmp/wui-site-screenshots` (переменная `SCREENSHOT_DIR` меняет каталог).

## Размещение

Размещайте как обычную статику по HTTPS. Сервер должен отдавать `.wasm` с MIME `application/wasm`, `.js` — как JavaScript, `.data` — `application/octet-stream`. SharedArrayBuffer и COOP/COEP не нужны: текущий порт однопоточный. Не используйте SPA-fallback для отсутствующих WASM-файлов: пусть сервер вернёт 404, чтобы оболочка показала ошибку.

Для файлов с неизменными именами (`index.html`, `.js`, `.wasm`, `.data`) используйте `Cache-Control: no-cache` либо обновляйте их атомарно и инвалидируйте CDN-кеш. Долгое `immutable`-кеширование без хешей в именах приведёт к смешению версий.

Документация на `/doc/` и `/doc_ru/` собирается вместе с сайтом из публичного репозитория `intent-garden/wui`, ветка `main`. Публикация также включает загрузки `/download/` и все WASM-примеры.

`tz.md` — архив старого задания. Источник актуального поведения сайта — страницы и этот README.

Быстрый старт закреплён на релизе WUI `v1.5.261116`. Ссылки на руководства
ведут на опубликованную документацию, а roadmap — на актуальную `main`.
WASM-примеры сайта пересобраны из `v1.5.261116`. Следующие обновления импортируются
через `tools/import_wasm.py` и проверяются по `wasm/manifest.json`; выпуск новой
библиотеки сам по себе их не пересобирает.

## Новости релизов

`tools/build_releases.py` строит три карточки на главной, архивы `/news/` и
`/news_ru/` и `/releases.json` из `ChangeLog.md` репозитория WUI. Нужна полная
Git-история и теги (`fetch-depth: 0`). Исторические записи содержат ссылку на
сохранившийся changelog в конкретном коммите. Даты берутся из номера версии;
скрипт не выдаёт их за даты публикации удалённых GitHub Releases и не создаёт
несуществующие теги. Новые записи появляются при обновлении changelog и сайта.
Краткие описания последних выпусков переводятся в `SUMMARIES` скрипта.

```sh
python3 tools/prepare_site.py /tmp/wui-site-preview
# Python-окружение с зависимостями из ../wui/doc/requirements.txt:
python3 tools/build_releases.py --source ../wui --output /tmp/wui-site-preview
```

## Автодеплой GitHub Pages

`.github/workflows/deploy.yml` публикует весь сайт при push в `master`.
Pull request проверяет сборку без публикации. Документация берётся из `main`
репозитория `intent-garden/wui` и собирается в строгом режиме для обоих языков.
Ежедневный запуск подхватывает изменения документации; для немедленного обновления:

```sh
gh workflow run deploy.yml --repo intent-garden/wui_site --ref master
```

В Settings → Pages выбран источник **GitHub Actions**, домен `libwui.org`.
После обновления DNS и выпуска сертификата включается **Enforce HTTPS**.
A-записи `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153`; `www` — CNAME `intent-garden.github.io`.

Отдельные ключи S3 для Pages не нужны. Перед публикацией проверяются публичные
страницы, ресурсы, размеры и заголовки WASM из `wasm/manifest.json`.
В артефакт входят главная, обе версии документации и WASM-примеры; служебные
файлы и исходники WUI остаются за его пределами. Pages публикует артефакт целиком.
Ревизия документации доступна в `/wui-documentation-revision.txt`.

## Резервный ручной деплой в S3

`upd_s3.sh` публикует готовую статику в корень `libwui.org`. Используется локальный AWS CLI с текущим профилем (`AWS_PROFILE`) или переменными окружения AWS; ключей в скрипте нет.

```sh
./upd_s3.sh --dry-run
./upd_s3.sh
```

Скрипт проверяет сайт через `tools/prepare_site.py`, загружает ресурсы перед HTML, сохраняет существующую документацию и после загрузки сравнивает страницы с объектами S3 и проверяет MIME/размер всех трёх WASM-файлов. Для другого назначения можно явно задать `WUI_SITE_BUCKET` (только имя бакета), `S3_ENDPOINT_URL`, `AWS_DEFAULT_REGION`.
