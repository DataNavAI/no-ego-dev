import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, symlink, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startCom } from '../src/com/server.js';

const launch = () => chromium.launch(process.env.NED_COM_CHROME ? {executablePath:process.env.NED_COM_CHROME} : {});

test('browser handles missing deep links rather than leaving welcome state', async t => {
 const root=await mkdtemp(join(tmpdir(),'com-browser-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const app=await startCom({root,local:true});t.after(()=>app.close());
 const browser=await launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.goto(app.url+'?artifact=missing.md');
 await page.waitForFunction(()=>document.getElementById('content').textContent.includes('unavailable'),{},{timeout:3000});
 assert.match(await page.locator('#content').innerText(),/unavailable/);
});

test('real browser renders safe Markdown, inert HTML/SVG, native media, live updates and mobile layout', async t => {
 const root=await mkdtemp(join(tmpdir(),'com-browser-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'report #%.md'),'# Reviewed output\n\n**Passed**\n\n<script>window.pwned=1</script><img src="https://evil.test/pixel" onerror="window.pwned=1">\n\n![remote](https://evil.test/image.png)\n\n[Reference](https://example.com)');
 for(const name of ['sample.html','sample.svg'])await writeFile(join(root,name),'<script>window.pwned=1</script>');
 await writeFile(join(root,'image.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64'));
 for(const name of ['clip.mp4','sound.mp3','document.pdf'])await writeFile(join(root,name),'test browser routing fixture');
 const app=await startCom({root,local:true});t.after(()=>app.close());
 const browser=await launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{
  // Chrome's native PDF viewer loads bundled browser resources, not network
  // content from the artifact. Keep every external HTTP(S) request forbidden.
  const url=r.url();
  const nativePdf=url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/') || url.startsWith('chrome://resources/');
  if(!url.startsWith(app.receipt.localOrigin) && !nativePdf)external.push(url);
 });
 await page.goto(app.url+'?artifact='+encodeURIComponent('report #%.md'));
 await page.locator('#content h1').waitFor();assert.equal(await page.locator('#content h1').innerText(),'Reviewed output');
 assert.equal(await page.locator('#content img, #content script').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);
 assert.equal(await page.locator('#content a').getAttribute('rel'),'noopener noreferrer');
 for(const name of ['sample.html','sample.svg']){await page.getByRole('link').filter({hasText:name}).click();await page.locator('#content pre').waitFor();assert.match(await page.locator('#content pre').innerText(),/<script>/);}
 for(const [name,tag] of [['image.png','img'],['clip.mp4','video'],['sound.mp3','audio'],['document.pdf','iframe']]){await page.getByRole('link').filter({hasText:name}).click();await page.locator('#content '+tag).waitFor();assert.ok((await page.locator('#content '+tag).getAttribute('src')).includes('api/artifact'));}
 await page.getByRole('link').filter({hasText:'report #%.md'}).click();await page.locator('#content h1').waitFor();
 await writeFile(join(root,'new-report.md'),'# New');await page.waitForFunction(()=>document.getElementById('artifacts').textContent.includes('new-report.md'),{},{timeout:6000});
 assert.equal(new URL(page.url()).searchParams.get('artifact'),'report #%.md');assert.equal(await page.locator('#content h1').innerText(),'Reviewed output');
 await rm(join(root,'report #%.md'));await page.waitForFunction(()=>document.getElementById('content').textContent.includes('unavailable'),{},{timeout:6000});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
});

test('Markdown relative dependencies stay in capability reader and approved root', async t => {
 const root=await mkdtemp(join(tmpdir(),'com-dependencies-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'reports'));await mkdir(join(root,'assets'));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64');
 await writeFile(join(root,'assets','한 글 #%.png'),png);
 await writeFile(join(root,'reports','next 한 글.md'),'# Nested report');
 await writeFile(join(root,'reports','auth.png'),png);await symlink(join(root,'assets','한 글 #%.png'),join(root,'reports','alias.png'));
 await writeFile(join(root,'reports','active.svg'),'<svg onload="window.pwned=1"/>');
 await writeFile(join(root,'reports','start.md'),`# Start

![approved](../assets/%ED%95%9C%20%EA%B8%80%20%23%25.png)

[Next report](next%20%ED%95%9C%20%EA%B8%80.md)

![remote](https://evil.test/pixel.png)
![protocol](//evil.test/pixel.png)
![data](data:image/png;base64,AAAA)
![escape](../../escape.png)
![encoded escape](%2e%2e/%2e%2e/escape.png)
![denied](auth.png)
![symlink](alias.png)
![active](active.svg)
![absolute](/assets/test.png)

[escape link](../../escape.md)
[denied link](auth.png)
[scheme](javascript:alert%281%29)
[encoded scheme](javascript%3Aalert%281%29)
[protocol link](//evil.test/file.md)
[backslash](..%5Cescape.md)
[malformed](https://)
<img src="https://evil.test/raw.png" onerror="window.pwned=1">
<script>window.pwned=1</script>`);
 const app=await startCom({root,local:true});t.after(()=>app.close());
 const browser=await launch();t.after(()=>browser.close());const page=await browser.newPage();
 const requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.url+'?artifact=reports%2Fstart.md');await page.locator('#content h1').waitFor();
 const image=page.locator('#content img');assert.equal(await image.count(),1,'only approved local raster image renders');
 await page.waitForFunction(()=>document.querySelector('#content img')?.naturalWidth===1);
 const src=new URL(await image.getAttribute('src'));assert.equal(src.pathname,new URL(app.url).pathname+'api/artifact');assert.equal(src.searchParams.get('path'),'assets/한 글 #%.png');
 if(process.env.NED_COM_EVIDENCE_DIR) {await mkdir(process.env.NED_COM_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:join(process.env.NED_COM_EVIDENCE_DIR,'relative-dependencies.png'),fullPage:true});}
 for(const label of ['escape link','denied link','scheme','encoded scheme','protocol link','backslash'])assert.equal(await page.locator('#content a').filter({hasText:new RegExp('^'+label+'$')}).getAttribute('href'),null,label);
 const link=page.getByRole('link',{name:'Next report',exact:true});assert.equal(new URL(await link.getAttribute('href')).searchParams.get('artifact'),'reports/next 한 글.md');
 await link.click();await page.waitForFunction(()=>document.querySelector('#content h1')?.textContent==='Nested report');
 assert.equal(new URL(page.url()).searchParams.get('artifact'),'reports/next 한 글.md');assert.equal(await page.locator('#title').innerText(),'reports/next 한 글.md');
 await page.goBack();await page.waitForFunction(()=>document.querySelector('#content h1')?.textContent==='Start');
 assert.equal(await page.evaluate(()=>window.pwned),undefined);
 assert.deepEqual(requests.filter(url=>!url.startsWith(app.receipt.localOrigin)),[]);assert.deepEqual(errors,[]);
 assert.equal(requests.filter(url=>url.includes('api/artifact')&&url.includes('escape')).length,0);
});
