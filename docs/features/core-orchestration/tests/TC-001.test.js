import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,chmodSync,symlinkSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCoreHandler} from '../../../../apps/core/src/http.js';
import {verifyBridges} from './transport-bridges.js';
import {verifyStream} from './transport-stream.js';
import {createCoreServer} from '../../../../apps/core/src/index.js';
import {createTaskService} from '../../../../src/tasks.js';
import {createCommunicatorServer} from '../../../../apps/com/src/server.js';
import {loadOperatorCredential,coreNamespace,authorized} from '../../../../apps/core/src/auth.js';

test('TC-001: operator token is stable, private and runtime-isolated; unsafe storage fails closed',t=>{
  const root=mkdtempSync(path.join(tmpdir(),'ned-core-auth-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const first=loadOperatorCredential({home:path.join(root,'a'),env:{}});
  assert.equal(loadOperatorCredential({home:path.join(root,'a'),env:{}}),first);
  assert.notEqual(loadOperatorCredential({home:path.join(root,'b'),env:{}}),first);
  assert.equal(authorized(`Bearer ${first}`,first),true);
  assert.equal(authorized(`Bearer ${first}x`,first),false);
  chmodSync(path.join(root,'a','.ned','core','operator-token'),0o644);
  assert.throws(()=>loadOperatorCredential({home:path.join(root,'a'),env:{}}),/credential/);
  mkdirSync(path.join(root,'c'),{mode:0o700});symlinkSync(path.join(root,'b','.ned'),path.join(root,'c','.ned'));
  assert.throws(()=>loadOperatorCredential({home:path.join(root,'c'),env:{}}),/Unsafe/);
});

test('TC-001: bridges identify encoded and dot-normalized privileged namespaces',()=>{
  for(const value of ['/api/core','/api/core/v1/health','/%61pi/core/v1','/api/%2563ore/v1','/other/../api/core/v1','/api//core/v1','/api/core%2fv1','/api/core%5cv1','/%zz'])assert.equal(coreNamespace(value).blocked,true,value);
  assert.equal(coreNamespace('/api/chat/sessions').blocked,false);
});

test('TC-001: real HTTP rejects unauthenticated, hostile and oversized mutations before facade effects',async t=>{
  let calls=0,url;const credential='a'.repeat(64);
  const service={createTask:async(project,input,key)=>{calls++;return {id:'task-1',project,title:input.title,key};},work:async()=>({items:[]})};
  const handler=createCoreHandler({service,credential,boundOrigin:()=>url});
  const server=http.createServer((req,res)=>handler(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
  t.after(()=>{handler.close();server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const send=(body,headers={},route='/projects/p/tasks')=>fetch(url+'/api/core/v1'+route,{method:'POST',headers:{authorization:`Bearer ${credential}`,'content-type':'application/json','idempotency-key':'task-create-1',...headers},body:JSON.stringify(body)});
  assert.equal((await send({title:'Synthetic'},{authorization:''})).status,401);
  assert.equal((await send({title:'Synthetic'},{origin:'http://foreign.invalid'})).status,403);
  const hostileHost=await new Promise((resolve,reject)=>{const request=http.request(url+'/api/core/v1/health',{headers:{host:'foreign.invalid',authorization:`Bearer ${credential}`}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});request.on('error',reject);request.end();});
  assert.equal(hostileHost,403);
  assert.equal((await send({title:'Synthetic',gateway:'http://evil.invalid'})).status,400);
  assert.equal((await send({title:'x'.repeat(65536)})).status,413);
  assert.equal((await send({title:'Synthetic'},{'idempotency-key':''})).status,400);
  for(const route of ['/health?cursor=ignored','/projects?after=ignored','/projects/p/work?limit=1','/projects/p/attempts?taskId=ignored','/projects/p/attempts?after=ignored','/projects/p/events?cursor=ignored','/projects/p/automations?limit=1&limit=2']){
    assert.equal((await fetch(url+'/api/core/v1'+route,{headers:{authorization:`Bearer ${credential}`}})).status,400,route);
  }
  assert.equal((await send({title:'Synthetic'},{},'/projects/p/tasks?limit=1')).status,400);
  assert.equal(calls,0);
  const response=await send({title:'Synthetic'});assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{data:{id:'task-1',project:'p',title:'Synthetic',key:'task-create-1'}});
  assert.equal(calls,1);assert.equal(response.headers.get('access-control-allow-origin'),null);
  assert.equal((await fetch(url+'/api/core/v1/health',{headers:{authorization:`Bearer ${credential}`}})).status,200);
});

test('TC-001: actual public and Hub bridges deny Core while preserving ordinary traffic',{timeout:10000},verifyBridges);
test('TC-001: ledger SSE heartbeats, bounded slow-subscriber queues and cursor replay',verifyStream);

test('TC-001: assembled Core API and legacy COM share canonical work without executing backlog',async t=>{
  const home=mkdtempSync(path.join(tmpdir(),'ned-core-consumer-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
  const project=path.join(home,'project');mkdirSync(project);
  const databasePath=path.join(home,'.ned','ned.sqlite');
  const task=await createTaskService({project,databaseUrl:databasePath,actor:'agent:ned-core'});await task.initialize();t.after(()=>task.close());
  const core=await createCoreServer({home,env:{},databasePath,gateway:{}});t.after(()=>core.close());const url=await core.listen();
  const credential=loadOperatorCredential({home,env:{}}),headers={authorization:`Bearer ${credential}`,'content-type':'application/json','idempotency-key':'consumer-create'};
  const created=await fetch(`${url}/api/core/v1/projects/${task.project.id}/tasks`,{method:'POST',headers,body:JSON.stringify({title:'Shared synthetic task'})});
  assert.equal(created.status,200);const item=(await created.json()).data;
  assert.equal((await task.getItem(item.id)).title,'Shared synthetic task');
  const repeat=await fetch(`${url}/api/core/v1/projects/${task.project.id}/tasks`,{method:'POST',headers,body:JSON.stringify({title:'Shared synthetic task'})});assert.deepEqual((await repeat.json()).data,item);
  const com=createCommunicatorServer({home,env:{},databasePath});t.after(()=>com.close());const comUrl=await com.listen();
  const work=await(await fetch(`${comUrl}/api/projects/${task.project.id}/work`)).json();assert.equal(work.items[0].id,item.id);
  const privateHealth=await fetch(`${comUrl}/api/core/v1/health`,{headers:{authorization:`Bearer ${credential}`}});assert.equal(privateHealth.status,200);
  assert.equal((await fetch(`${comUrl}/api/core/v1/health`)).status,401);
  const apiWork=await(await fetch(`${url}/api/core/v1/projects/${task.project.id}/work`,{headers})).json();assert.deepEqual(apiWork.data,work);
  assert.equal(core.service.store.sql.prepare('SELECT COUNT(*) AS count FROM ned_core_attempts').get().count,0);
  assert.equal(core.service.store.sql.prepare('SELECT COUNT(*) AS count FROM ned_core_tick_requests').get().count,0);
  await fetch(`${url}/api/core/v1/projects/${task.project.id}/tasks/${item.id}/enrollment`,{method:'PUT',headers:{...headers,'idempotency-key':'stream-enroll'},body:'{"enabled":true}'});
  const controller=new AbortController();
  const events=await fetch(`${url}/api/core/v1/projects/${task.project.id}/events/stream`,{headers,signal:controller.signal});
  assert.equal(events.headers.get('content-type'),'text/event-stream');
  const reader=events.body.getReader();
  try{const chunk=new TextDecoder().decode((await reader.read()).value);assert.match(chunk,/id: [A-Za-z0-9_-]+\ndata: /);assert.match(chunk,/enrollment/);}finally{controller.abort();await reader.cancel().catch(()=>{});}
  const html=await(await fetch(comUrl)).text();assert.equal(html.includes(credential),false);
});

test('TC-001: standalone core CLI serves private HTTP and terminates cleanly',{timeout:10000},async t=>{
  const home=mkdtempSync(path.join(tmpdir(),'ned-core-cli-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
  const child=spawn(process.execPath,['bin/ned.js','core','serve','--port','0'],{cwd:new URL('../../../../',import.meta.url),env:{PATH:process.env.PATH,NED_AGENT_HOME:home},stdio:['ignore','pipe','pipe']});
  const closed=once(child,'close');t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
  let output='',errors='';child.stderr.on('data',chunk=>{errors+=chunk;});
  const url=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',()=>reject(new Error('CLI exited before readiness: '+errors)));child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/NED Core: (http:\/\/127\.0\.0\.1:\d+)/);if(match)resolve(match[1]);});});
  const credential=loadOperatorCredential({home,env:{}});
  assert.equal(output.includes(credential),false);assert.equal(errors,'');
  assert.equal((await fetch(url+'/api/core/v1/health')).status,401);
  assert.equal((await fetch(url+'/api/core/v1/health',{headers:{authorization:`Bearer ${credential}`}})).status,200);
  child.kill('SIGTERM');assert.deepEqual(await closed,[0,null]);
});
