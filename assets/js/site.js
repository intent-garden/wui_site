'use strict';
document.documentElement.classList.remove('no-js');
const lang = document.documentElement.lang;
const demoData = JSON.parse(document.querySelector('#demo-data').textContent);
const playground = document.querySelector('.playground');
const stage = document.querySelector('.stage');
const cover = document.querySelector('.loading');
const status = document.querySelector('#demo-status');
const retry = document.querySelector('#retry');
const tabs = [...document.querySelectorAll('[role=tab]')];
const examples = {demo: {width: 880, height: 660}, simple: {width: 960, height: 660}, hello_world: {width: 460, height: 460}};
let selected = 'simple', frame, timeout, started = false;

function resize() {
    if (!frame) return;
    const {width, height} = examples[selected];
    const available = stage.clientWidth;
    const virtualWidth = Math.max(width, available);
    const scale = available / virtualWidth;
    stage.style.height = `${Math.ceil(height * scale)}px`;
    frame.style.width = `${virtualWidth}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = `scale(${scale})`;
}
function showStatus(message, failed = false) {
    status.textContent = message;
    cover.hidden = false;
    cover.querySelector('.spinner').hidden = failed;
    retry.hidden = !failed;
}
function load(app = selected) {
    started = true;
    selected = app;
    clearTimeout(timeout);
    frame?.remove();
    showStatus(playground.dataset.loading);
    tabs.forEach(tab => {
        const active = tab.dataset.app === app;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
    });
    document.querySelector('#demo-panel').setAttribute('aria-labelledby', `tab-${app}`);
    document.querySelector('#demo-hint').textContent = demoData.hints[app];
    document.querySelector('#open-demo').href = `../wasm/${app}/?lang=${lang}`;
    frame = document.createElement('iframe');
    frame.title = `WUI — ${tabs.find(t => t.dataset.app === app).textContent}`;
    frame.allow = 'clipboard-read; clipboard-write';
    frame.src = `../wasm/${app}/?embed=1&lang=${lang}`;
    stage.prepend(frame);
    resize();
    timeout = setTimeout(() => showStatus(playground.dataset.failed, true), 25000);
}
window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.app !== selected) return;
    if (event.data.type === 'wui-ready') {
        clearTimeout(timeout);
        cover.hidden = true;
    } else if (event.data.type === 'wui-error' || event.data.type === 'wui-closed') {
        clearTimeout(timeout);
        showStatus(playground.dataset[event.data.type === 'wui-error' ? 'failed' : 'closed'], true);
    } else if (event.data.type === 'wui-exit-focus') {
        tabs.find(t => t.dataset.app === selected).focus({preventScroll: true});
    }
});
tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { if (selected !== tab.dataset.app || !started) load(tab.dataset.app); });
    tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        load(tabs[next].dataset.app);
    });
});
document.querySelector('#restart').addEventListener('click', () => load());
retry.addEventListener('click', () => load());
let observedWidth = -1;
new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== observedWidth) {
        observedWidth = width;
        setTimeout(resize, 0);
    }
}).observe(stage);
const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { if (!started) load(); observer.disconnect(); }
}, {rootMargin: '300px'});
observer.observe(stage);
for (const button of document.querySelectorAll('[data-copy-target]')) {
    button.addEventListener('click', async () => {
        const code = document.getElementById(button.dataset.copyTarget);
        try {
            await navigator.clipboard.writeText(code.textContent);
            button.textContent = document.body.dataset.copied + ' ✓';
        } catch {
            const range = document.createRange();
            range.selectNodeContents(code);
            const selection = window.getSelection();
            selection.removeAllRanges(); selection.addRange(range);
            button.textContent = lang === 'ru' ? 'Ctrl/Cmd+C' : 'Press Ctrl/Cmd+C';
        }
        setTimeout(() => { button.textContent = document.body.dataset.copy + ' ↗'; }, 2200);
    });
}
