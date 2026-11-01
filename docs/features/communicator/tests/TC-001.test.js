import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const load = () => import('../../../../src/communicator/server.js');
const request = (url, path, options = {}) => new Promise((resolve, reject) => {
  const req = http.request(new URL(url), {path, ...options}, res => {
    let body = ''; res.setEncoding('utf8'); res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({status:res.statusCode, headers:res.headers, body}));
  }); req.on('error', reject); req.end();
});
test('TC-001: loopback lifecycle and read-only HTTP perimeter', async t => {
  const {createCommunicatorServer} = await load();
  const directory = await mkdtemp(join(tmpdir(),'nedcom-')); t.after(() => rm(directory,{recursive:true,force:true}));
  await writeFile(join(directory,'sentinel.txt'),'unchanged');
  for (const options of [{host:'0.0.0.0'}, {port:-1}, {port:1.5}, {port:65536}]) assert.throws(() => createCommunicatorServer(options));
  const app = createCommunicatorServer(); t.after(() => app.close());
  assert.equal(app.url, null); await app.listen();
  assert.equal(app.server.address().address, '127.0.0.1');
  const port = app.server.address().port;
  for (const [path, type] of [['/','text/html'], ['/styles.css','text/css'], ['/app.js','text/javascript'], ['/state.js','text/javascript'], ['/chat-entry.js','text/javascript'], ['/chat-ui.js','text/javascript'], ['/history.js','text/javascript'], ['/api/health','application/json'], ['/api/capabilities','application/json']]) {
    const get = await request(app.url,path); const head = await request(app.url,path,{method:'HEAD'});
    assert.equal(get.status,200); assert.ok(get.headers['content-type'].startsWith(type));
    assert.equal(head.status,200); assert.equal(head.body,''); assert.equal(head.headers['content-type'],get.headers['content-type']);
    assert.equal(get.headers['cache-control'],'no-store'); assert.equal(get.headers['x-content-type-options'],'nosniff');
    assert.ok(get.headers['content-security-policy'].includes("frame-ancestors 'none'")); assert.equal(get.headers['access-control-allow-origin'],undefined);
  }
  assert.deepEqual(JSON.parse((await request(app.url,'/api/health')).body),{status:'ok',service:'nedcom'});
  assert.deepEqual(JSON.parse((await request(app.url,'/api/capabilities')).body),{service:'nedcom',readOnly:false,capabilities:{projects:true,tasks:true,artifacts:false,preview:true,chat:true}});
  for (const headers of [{Host:'evil.test'}, {Origin:'null'}, {Origin:'https://evil.test'}]) assert.equal((await request(app.url,'/api/health',{headers,method:'POST'})).status,403);
  assert.equal((await request(app.url,'/api/health',{headers:{Origin:app.url}})).status,200);
  for (const method of ['POST','PUT','PATCH','DELETE','OPTIONS']) { const res = await request(app.url,'/absent',{method}); assert.equal(res.status,405); assert.equal(res.headers.allow,'GET, HEAD'); }
  for (const path of ['/../package.json','/%2e%2e/package.json','/app.js/extra','/%ZZ']) {
    const res = await request(app.url,path); assert.equal(res.status,404); assert.deepEqual(JSON.parse(res.body),{error:{code:'not_found',message:'Not found.'}});
  }
  assert.equal((await request(app.url,'/app.js?file=../package.json')).status,200);
  const occupied = createCommunicatorServer({port}); await assert.rejects(occupied.listen(),/Unable to start NEDCOM/); await occupied.close();
  await Promise.all([request(app.url,'/'),request(app.url,'/api/health')]);
  await app.close(); await app.close(); assert.equal(app.url,null);
  await assert.rejects(request(`http://127.0.0.1:${port}`,'/'));
  const restarted = createCommunicatorServer({port}); t.after(() => restarted.close()); await restarted.listen();
  assert.deepEqual(await readdir(directory),['sentinel.txt']); assert.equal(await readFile(join(directory,'sentinel.txt'),'utf8'),'unchanged');
});
