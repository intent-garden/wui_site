// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/smoke.mjs [site root]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium,firefox,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const engine=process.env.WUI_BROWSER || 'chromium';
const screenshots=process.env.SCREENSHOT_DIR || '/private/tmp/wui-site-screenshots';
await fs.mkdir(screenshots,{recursive:true});
const server=http.createServer(async(req,res)=>{
    try {
        let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
        if(!file.startsWith(root+path.sep) && file!==root) throw Error('Path');
        if((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');
        const data=await fs.readFile(file);
        res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.ico':'image/x-icon'})[path.extname(file)]||'application/octet-stream'});res.end(data);
    } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
    browser=await ({chromium,firefox,webkit})[engine].launch({headless:true});
    for(const lang of ['en','ru']) {
        const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        page.on('console',e=>{if(e.type()==='error') errors.push(e.text());});
        await page.goto(`${base}/${lang==='ru'?'main_ru':'main'}/`);
        const ready=async()=>{
            await page.locator('.loading').waitFor({state:'hidden'});
            const iframe=await page.locator('.stage iframe').elementHandle();
            const f=await iframe.contentFrame();
            await f.waitForFunction(()=>Module.wui.windows.size>0 && [...Module.wui.images.values()].every(i=>i.complete&&i.naturalWidth));
            return f;
        };
        await page.locator('#playground').scrollIntoViewIfNeeded();
        let app=await ready();
        assert.match(app.url(),/wasm\/demo/,'Showcase loads by default');
        assert.equal(await page.locator('[role=tab]').first().getAttribute('data-app'),'demo');
        assert.equal(await page.locator('[data-app=demo]').getAttribute('aria-selected'),'true');
        assert.match(await page.locator('#open-demo').getAttribute('href'),/wasm\/demo/);
        assert.equal(await app.locator('.wui-canvas').count(),1);
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(screenshots,`${lang}-${engine}-desktop.png`),fullPage:true});
        await page.locator('[data-app=simple]').click();app=await ready();
        assert.match(app.url(),/wasm\/simple/);
        await page.locator('[data-app=hello_world]').click();app=await ready();
        const canvas=app.locator('.wui-canvas');
        await canvas.click({position:{x:170,y:130}});
        await page.keyboard.press('Control+a');await page.keyboard.insertText('Site 🦊');
        await page.keyboard.press('Control+a');
        const copied=await app.evaluate(()=>{
            const e=new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:new DataTransfer()});
            document.activeElement.dispatchEvent(e);return e.clipboardData.getData('text/plain');
        });
        assert.equal(copied,'Site 🦊','Real Unicode input and clipboard in embedded C++ application');
        await page.keyboard.press('Shift+Escape');
        await page.waitForFunction(()=>document.activeElement?.dataset.app==='hello_world');
        await canvas.click({position:{x:170,y:350}});
        await app.waitForTimeout(200);
        if(engine==='firefox') await page.screenshot({path:path.join(screenshots,`${lang}-firefox-dialog.png`)});
        await page.keyboard.press('Enter');
        await page.locator('#retry').waitFor({state:'visible'});
        assert.match(await page.locator('#demo-status').textContent(),/closed|закрыто/);
        // Inspect that this is a live application with a browser input bridge.
        assert.equal(await app.locator('.wui-input').count(),0,'Closed app releases its input bridge');
        await page.locator('#restart').click();app=await ready();
        assert.equal(await page.locator('.stage iframe').count(),1);
        await page.locator('[data-app=demo]').click();await ready();
        await page.setViewportSize({width:390,height:844});
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.loading').isVisible(),false,'Demo survives responsive resize');
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(screenshots,`${lang}-${engine}-mobile.png`),fullPage:true});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page overflow');
        const embedded=await (await page.locator('.stage iframe').elementHandle()).contentFrame();
        assert.equal(await embedded.evaluate(()=>{
            const w=Module.wui.windows.values().next().value;
            return w.x>=0 && w.x+w.width<=document.querySelector('#wui').clientWidth;
        }),true,'Whole application fits the mobile iframe');
        await page.locator('[data-app=simple]').focus();await page.keyboard.press('ArrowLeft');
        assert.equal(await page.locator('[data-app=demo]').getAttribute('aria-selected'),'true');
        await ready();
        assert.deepEqual(errors,[]);
        console.log(`${lang}/${engine}: desktop, mobile, three live examples, restart, keyboard tabs passed`);
        await page.close();
    }
    const failure=await browser.newPage();
    await failure.route('**/wasm/demo/*.wasm',route=>route.abort());
    await failure.goto(`${base}/main/`);await failure.locator('#playground').scrollIntoViewIfNeeded();
    await failure.locator('#retry').waitFor({state:'visible'});
    assert.match(await failure.locator('#demo-status').textContent(),/could not load/);
    await failure.unrouteAll();await failure.locator('#retry').click();
    await failure.locator('.loading').waitFor({state:'hidden'});
    await failure.close();
    const fallback=await browser.newPage({javaScriptEnabled:false});
    await fallback.goto(base);assert.equal(await fallback.locator('a').count(),2);
    await fallback.goto(`${base}/main/`);assert.equal(await fallback.locator('noscript').count(),1);
    await fallback.close();
    console.log(`${engine}: failed download recovery and no-JavaScript fallback passed`);
} finally {await browser?.close();await new Promise(r=>server.close(r));}
