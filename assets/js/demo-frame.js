'use strict';
const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
const russian = params.get('lang') === 'ru';
const app = document.body.dataset.app;
if (embedded) document.documentElement.classList.add('embedded');
document.documentElement.lang = russian ? 'ru' : 'en';
document.querySelector('#back').href = russian ? '../../main_ru/#playground' : '../../main/#playground';
document.querySelector('#back').textContent = russian ? '← На сайт WUI' : '← Back to WUI';
document.querySelector('#frame-hint').textContent = russian ? 'Пример на C++ / WebAssembly' : 'C++ / WebAssembly example';
const overlay = document.querySelector('.frame-status');
const status = document.querySelector('#status');
status.textContent = russian ? 'Загружаем приложение…' : 'Loading the application…';
for (const button of document.querySelectorAll('[data-restart]')) {
    button.textContent = russian ? 'Заново' : 'Restart';
    button.addEventListener('click', () => location.reload());
}
function notify(type) { if (embedded) parent.postMessage({type, app}, location.origin); }
let failed = false, ready = false, timer;
function error() {
    if (failed) return;
    failed = true;
    clearInterval(timer);
    overlay.hidden = false;
    status.textContent = russian ? 'Не удалось запустить пример. Проверьте соединение и повторите попытку.' : 'Could not start the example. Check your connection and try again.';
    overlay.querySelector('button').hidden = false;
    notify('wui-error');
}
window.addEventListener('error', event => {
    if (event.message?.startsWith('ResizeObserver loop')) return;
    error();
});
window.addEventListener('unhandledrejection', error);
setTimeout(() => { if (!ready) error(); }, 25000);
// Module must be a global before the Emscripten script executes.
window.Module = {
    setStatus(text) { if (text && !ready) status.textContent = text; },
    onAbort: error,
    onRuntimeInitialized() {
        let ticks = 0;
        timer = setInterval(() => {
            const windows = window.Module.wui?.windows;
            if (!ready && windows?.size) {
                ready = true;
                centerWindow();
                overlay.hidden = true;
                notify('wui-ready');
            } else if (ready && windows?.size === 0) {
                clearInterval(timer);
                status.textContent = russian ? 'Приложение закрыто.' : 'Application closed.';
                overlay.hidden = false;
                overlay.querySelector('button').hidden = false;
                notify('wui-closed');
            } else if (!ready && ++ticks > 250) error();
        }, 100);
    }
};
window.addEventListener('keydown', event => {
    // Canvas applications own Tab. Shift+Escape returns focus to the site's tabs.
    if (embedded && event.key === 'Escape' && event.shiftKey) {
        event.preventDefault(); event.stopImmediatePropagation(); notify('wui-exit-focus');
    }
}, true);

function centerWindow() {
    if (!ready) return;
    const appWindow = Module.wui?.windows.values().next().value;
    if (!appWindow) return;
    const container = document.querySelector('#wui');
    Module._wui_position(appWindow.id,
        Math.max(0, Math.round((container.clientWidth - appWindow.width) / 2)),
        Math.max(0, Math.round((container.clientHeight - appWindow.height) / 2)),
        appWindow.width, appWindow.height);
}
new ResizeObserver(() => setTimeout(centerWindow, 0)).observe(document.querySelector('#wui'));

// Restore the iframe's browsing-context focus before the Canvas cancels pointerdown.
// Focusing an already-active textarea alone does not do this in Firefox.
document.querySelector('#wui').addEventListener('pointerdown', () => window.focus(), true);
