import test from 'node:test';
import assert from 'node:assert/strict';
import {apiFixture,appFixture,mutate,status} from './helpers.js';

test('TC-002: changed previews require explicit replacement and concurrent stale writers cannot overwrite the winner',{timeout:15000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true}),app=await appFixture(context),other=await appFixture(context);
  const a={project:f.project,port:app.port,name:'A',expectedRevision:0};const first=await mutate(f,'PUT',a);assert.equal(first.status,200);
  const b={...a,port:other.port,name:'B',expectedRevision:1};assert.equal((await mutate(f,'PUT',b)).status,409);
  const outcomes=await Promise.all([mutate(f,'PUT',{...b,replace:true}),mutate(f,'PUT',{...b,name:'C',replace:true})]);assert.deepEqual(outcomes.map(row=>row.status).sort(),[200,409]);
  const current=await status(f);assert.equal(current.revision,2);assert.notEqual(current.preview.id,first.body.preview.id);assert.ok(['B','C'].includes(current.preview.name));
  assert.equal((await mutate(f,'DELETE',{expectedRevision:1})).status,409);assert.deepEqual(await status(f),current);
  const dead=await appFixture(context);await new Promise(resolve=>dead.server.close(resolve));
  assert.equal((await mutate(f,'PUT',{...b,port:dead.port,replace:true,expectedRevision:2})).status,503);assert.deepEqual(await status(f),current);
});

test('TC-002: a late observation cannot mark a replacement as healthy using the old app response',{timeout:15000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true});let delay=false,release,seen;
  const ready=new Promise(resolve=>seen=resolve);const a=await appFixture(context,(req,res)=>{if(delay){release=()=>res.writeHead(200).end();seen();}else res.writeHead(200).end();});const b=await appFixture(context);
  await mutate(f,'PUT',{project:f.project,port:a.port,expectedRevision:0});delay=true;
  const pending=f.request('/api/v1/preview');await ready;
  assert.equal((await mutate(f,'PUT',{project:f.project,port:b.port,expectedRevision:1,replace:true})).status,200);release();
  const old=await pending;assert.equal(old.status,409);assert.equal((await old.json()).error.code,'preview_changed');assert.equal((await status(f)).preview.port,b.port);
});
