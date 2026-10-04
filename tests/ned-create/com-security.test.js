import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startCom } from '../../src/com/server.js';

test('recursive approved list excludes private paths, symlinks and unknown types; updates newest first', async t => {
 const root = await mkdtemp(join(tmpdir(), 'com-safe-')); t.after(() => rm(root,{recursive:true,force:true}));
 for (const name of ['a.md','z.md','.env','auth.json','owner-access.md','settings.md','inspection.md','backup.md','runtime.db','bad.exe']) await writeFile(join(root,name),'data');
 await mkdir(join(root,'private')); await writeFile(join(root,'private','report.md'),'private');
 await mkdir(join(root,'reports')); await writeFile(join(root,'reports','한 글 #%.txt'),'report');
 await symlink('/etc/passwd',join(root,'escape.txt'));
 await symlink(join(root,'a.md'),join(root,'alias.md'));
 await utimes(join(root,'a.md'),new Date(),new Date(Date.now()+10000));
 const app = await startCom({root,local:true}); t.after(() => app.close());
 const list = () => fetch(app.url+'api/artifacts').then(r=>r.json());
 const first = await list();
 assert.deepEqual(first.artifacts.map(a=>a.path).sort(),['a.md','reports/한 글 #%.txt','z.md']);
 assert.equal(first.artifacts[0].path,'a.md');
 await writeFile(join(root,'new.md'),'new'); await utimes(join(root,'new.md'),new Date(),new Date(Date.now()+20000));
 assert.equal((await list()).artifacts[0].path,'new.md');
 for (const path of ['../a.md','/etc/passwd','escape.txt','alias.md','private/report.md','.env','auth.json','bad.exe','reports/../a.md']) {
  assert.equal((await fetch(app.url+'api/artifact?path='+encodeURIComponent(path))).status,404,path);
 }
 const response = await fetch(app.url+'api/artifact?path='+encodeURIComponent('reports/한 글 #%.txt'));
 assert.equal(response.status,200); assert.equal(await response.text(),'report');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.ok(response.headers.get('content-security-policy').includes("default-src 'none'"));
 assert.equal((await fetch(app.url+'api/artifacts',{method:'POST'})).status,405);
});

test('receipt cannot be listed or read even with an innocent filename inside approved root', async t => {
 const root=await mkdtemp(join(tmpdir(),'com-receipt-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const state=join(root,'output.json');const app=await startCom({root,state,local:true});t.after(()=>app.close());
 assert.equal((await fetch(app.url+'api/artifact?path=output.json')).status,404);
 assert.deepEqual((await (await fetch(app.url+'api/artifacts')).json()).artifacts,[]);
 for(const name of ['privateOwner.md','apiCredentials.json','backupCopy.txt','debugLog.md','data.bak.md']) {
  await writeFile(join(root,name),'private');
  assert.equal((await fetch(app.url+'api/artifact?path='+name)).status,404,name);
 }
});

test('raw media supports byte ranges and enforces size and scan limits', async t => {
 const root = await mkdtemp(join(tmpdir(),'com-range-')); t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'sample.mp4'),'0123456789'); await writeFile(join(root,'large.txt'),'x'.repeat(21));
 const app = await startCom({root,local:true,maxFileBytes:20,maxScanEntries:20}); t.after(()=>app.close());
 const url = app.url+'api/artifact?path=sample.mp4';
 const r = await fetch(url,{headers:{Range:'bytes=2-5'}});
 assert.equal(r.status,206); assert.equal(r.headers.get('content-range'),'bytes 2-5/10'); assert.equal(await r.text(),'2345');
 assert.equal((await fetch(url,{headers:{Range:'bytes=50-'}})).status,416);
 assert.equal((await fetch(app.url+'api/artifact?path=large.txt')).status,413);
 const bounded = await startCom({root,local:true,maxScanEntries:1}); t.after(()=>bounded.close());
 assert.equal((await fetch(bounded.url+'api/artifacts')).status,413);
});
