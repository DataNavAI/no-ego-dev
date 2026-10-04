import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startCom } from '../../src/com/server.js';

test('reader shell and local assets enforce CSP; Markdown sanitized and type routes available', async t => {
 const root=await mkdtemp(join(tmpdir(),'com-ui-')); t.after(()=>rm(root,{recursive:true,force:true}));
 const app=await startCom({root,local:true}); t.after(()=>app.close());
 const shell=await fetch(app.url); assert.equal(shell.status,200);
 assert.match(await shell.text(),/NED COM/); assert.match(shell.headers.get('content-security-policy'),/script-src 'self'/);
 const script=await fetch(app.url+'app.js'); assert.equal(script.status,200); assert.match(await script.text(),/DOMPurify/);
 const { renderMarkdown } = await import('../../src/com/markdown.js');
 const { marked } = await import('marked');
 const { JSDOM } = await import('jsdom');
 const { default: createDOMPurify } = await import('dompurify');
 const html=renderMarkdown('# Hello\n\n<script>alert(1)</script><img src="https://evil.test/pixel" onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n![remote](https://evil.test/image.png)', marked, createDOMPurify(new JSDOM('').window));
 assert.match(html,/<h1>Hello<\/h1>/); assert.doesNotMatch(html,/<script|<img|onerror|javascript:/);
 assert.equal((await fetch(app.url+'vendor/marked.js')).status,200);
 assert.equal((await fetch(app.url+'vendor/purify.js')).status,200);
});

test('Markdown rewrites only manifest-approved local dependencies into capability URLs', async()=>{
 const {renderMarkdown}=await import('../../src/com/markdown.js');const {marked}=await import('marked');
 const {JSDOM}=await import('jsdom');const {default:createDOMPurify}=await import('dompurify');
 const window=new JSDOM('').window;const purify=createDOMPurify(window);
 const baseUrl='https://review.test/s/fixture/';
 const image='assets/한 글 #?%.PNG', report='reports/nested/한 글 #?%.md';
 const context={path:'reports/start.md',baseUrl,artifacts:[{path:image,type:'image'},{path:report,type:'markdown'},{path:'reports/active.svg',type:'text'}]};
 const output=renderMarkdown(`![Image](../assets/${encodeURIComponent('한 글 #?%.PNG')})\n\n[Report](nested/${encodeURIComponent('한 글 #?%.md')})\n\n[External](https://example.com/)\n\n![SVG](active.svg)\n\n![Remote](https://evil.test/pixel.png)\n\n![Escaping](../../assets/no.png)\n\n[Malformed external](https://)\n\n[Escape](%2e%2e/%2e%2e/report.md)\n\n[Encoded separator](nested%2Freport.md)\n\n[Denied](auth.json)`,marked,purify,context);
 const doc=new JSDOM(output).window.document;
 assert.equal(doc.querySelectorAll('img').length,1);
 const src=new URL(doc.querySelector('img').src);assert.equal(src.pathname,'/s/fixture/api/artifact');assert.equal(src.searchParams.get('path'),image);
 const links=[...doc.querySelectorAll('a')];const href=new URL(links[0].href);assert.equal(href.pathname,'/s/fixture/');assert.equal(href.searchParams.get('artifact'),report);
 assert.equal(links[0].hasAttribute('target'),false);assert.equal(links[1].target,'_blank');assert.equal(links[1].getAttribute('referrerpolicy'),'no-referrer');
 for(const link of links.slice(2))assert.equal(link.hasAttribute('href'),false);
});
