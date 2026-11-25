import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createPreviewService} from '../../../../apps/core/src/preview.js';
import {apiFixture,appFixture,mutate,status} from './helpers.js';

test('TC-001: registration observes real HTTP and persists one selected-home preview without creating tasks',{timeout:15000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true});let code=404;const requests=[];
  const app=await appFixture(context,(req,res)=>{requests.push({method:req.method,path:req.url,auth:req.headers.authorization});res.writeHead(code).end();});
  const memory=createPreviewService({home:f.home,env:f.env,databasePath:':memory:'});context.after(()=>memory.close());await assert.rejects(memory.status(),{code:'preview_database_unavailable'});
  assert.deepEqual(await status(f),{revision:0,preview:null,delivery:{mode:'local-link',remoteAvailable:false}});
  const input={project:f.project,port:app.port,name:'Shop',expectedRevision:0};
  const first=await mutate(f,'PUT',input);assert.equal(first.status,200);assert.equal(first.body.revision,1);assert.equal(first.body.preview.status,'available');assert.equal(first.body.preview.name,'Shop');assert.equal(first.body.preview.localUrl,`http://127.0.0.1:${app.port}/`);
  assert.deepEqual((await mutate(f,'PUT',input)).body,first.body);
  const reopened=createPreviewService({home:f.home,env:f.env,databasePath:f.databasePath});context.after(()=>reopened.close());
  assert.deepEqual(await reopened.status(),first.body);
  const other=path.join(f.root,'other-home');await mkdir(other,{mode:0o700});const foreign=createPreviewService({home:other,env:{NED_AGENT_HOME:other},databasePath:f.databasePath});context.after(()=>foreign.close());assert.equal((await foreign.status()).preview,null);
  assert.deepEqual(await f.task.getItems(),[]);assert.ok(requests.every(row=>row.method==='HEAD'&&row.path==='/'&&row.auth===undefined));
  code=503;assert.equal((await status(f)).preview.status,'app_error');code=401;assert.equal((await status(f)).preview.status,'available');
  await new Promise(resolve=>app.server.close(resolve));assert.equal((await status(f)).preview.status,'stopped');
  await rm(f.project,{recursive:true});assert.equal((await status(f)).preview.status,'unavailable');
  await assert.rejects(()=>import('node:fs/promises').then(fs=>fs.stat(f.project)),{code:'ENOENT'});
});

test('TC-001: Core and COM reject invalid or unauthorized preview publication without state changes',{timeout:15000},async context=>{
  for(const kind of ['core','com']){
    const f=await apiFixture(context,{kind});const app=await appFixture(context);const valid={project:f.project,port:app.port,expectedRevision:0};
    for(const route of ['/api/v1/preview','/api/v1/preview/unknown']){const denied=await f.request(route,{authenticated:false});assert.equal(denied.status,401);await denied.body.cancel();}
    for(const headers of [{},{origin:'null'},{origin:'https://evil.test'}]){const r=await f.request('/api/v1/preview',{method:'PUT',body:valid,headers});assert.equal(r.status,403);await r.body.cancel();}
    for(const [override,code] of [[{port:0},400],[{port:65536},400],[{port:'3000'},400],[{port:18791},400],[{port:8642},400],[{port:Number(new URL(f.app.url).port)},400],[{name:' '},400],[{name:'x'.repeat(81)},400],[{name:'x\ny'},400],[{url:'http://evil.test'},400],[{expectedRevision:-1},400],[{project:'relative'},400],[{project:path.join(f.root,'missing')},400],[{replace:'yes'},400],[{name:'x'.repeat(5000)},413]]){
      const r=await mutate(f,'PUT',{...valid,...override});assert.equal(r.status,code,JSON.stringify(override));assert.equal((await status(f)).revision,0);
    }
    f.env.API_SERVER_PORT=String(app.port);assert.equal((await mutate(f,'PUT',valid)).status,400);delete f.env.API_SERVER_PORT;
    const query=await f.request('/api/v1/preview?port=3000');assert.equal(query.status,404);await query.body.cancel();
    const invalid=await f.request('/api/v1/preview',{method:'POST',body:valid,headers:{origin:f.app.url}});assert.equal(invalid.status,405);await invalid.body.cancel();
  }
});

test('TC-001: HTTP deadline and credential revocation during readiness never publish a registration',{timeout:15000},async context=>{
  const f=await apiFixture(context,{kind:'com'});
  const hanging=await appFixture(context,()=>{});
  assert.equal((await mutate(f,'PUT',{project:f.project,port:hanging.port,expectedRevision:0})).status,503);assert.equal((await status(f)).revision,0);
  let release,seen;const ready=new Promise(resolve=>seen=resolve);const app=await appFixture(context,(req,res)=>{release=()=>res.writeHead(200).end();seen();});
  const pending=mutate(f,'PUT',{project:f.project,port:app.port,expectedRevision:0});await ready;
  await writeFile(path.join(f.home,'.ned/core/operator-token'),'b'.repeat(64)+'\n',{mode:0o600});release();
  assert.equal((await pending).status,401);assert.equal((await status(f)).preview,null);
});
