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

Документация на `/doc/` и `/doc_ru/` размещается отдельно. Обновление лендинга не должно удалять эти каталоги и существующие загрузки `/download/`. Ссылки на документацию ведут на действующий `https://libwui.org`.

`tz.md` — архив старого задания. Источник актуального поведения сайта — страницы и этот README.

Текущие примеры и ссылки на новые порты закреплены на коммите WUI `6d3cb0b2ab08c0f97d194a1544ebccb7e290a59a`: на момент обновления порты ещё находятся в ветке I-94. При обновлении примеров также обновляйте ревизию в командах быстрого старта и ссылках на руководства.

## Автодеплой GitHub Actions

`.github/workflows/deploy.yml` публикует сайт при push в `main`. Ручной запуск доступен через Actions → Deploy website to Yandex Object Storage → Run workflow (ветка `main`).

Используются repository secrets `YC_BUCKET_NAME`, `YC_ACCESS_KEY_ID` и `YC_SECRET_ACCESS_KEY`. Бакет и публичный доступ настраиваются отдельно. Workflow использует AWS CLI из Ubuntu 24.04 runner и endpoint `https://storage.yandexcloud.net`.

Перед загрузкой проверяются страницы, ресурсы, размеры артефактов из `wasm/manifest.json` и заголовки WASM. В пакет попадают только публичные каталоги и явно перечисленные корневые файлы; `.git`, workflow и инструменты остаются в репозитории.

Деплои выполняются последовательно. Файлы загружаются через `s3 cp`, без удаления посторонних объектов: `/doc/` и `/doc_ru/` по-прежнему публикуются из репозитория библиотеки. Ресурсы идут первыми, HTML — последним; для WASM задан `application/wasm`, для данных — `application/octet-stream`, для всех загружаемых объектов — `Cache-Control: no-cache`. Загрузка файлов не является атомарной сменой всей версии сайта; старые объекты автоматически не удаляются.
