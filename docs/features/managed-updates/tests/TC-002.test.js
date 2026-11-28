import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createManagedMaintenance} from '../../../../apps/core/src/maintenance.js';
import {createManagedProcessInspector} from '../../../../apps/core/src/maintenance-processes.js';
import {createMaintenanceControl} from '../../../../apps/com/src/maintenance-control.js';
import {createCoreServer} from '../../../../apps/core/src/index.js';
import http from 'node:http';
import {WebSocketServer} from 'ws';
import {startHubConnection} from '../../../../apps/com/src/hub.js';
import {createCommunicatorServer} from '../../../../apps/com/src/server.js';
import {configuredModelSetup} from '../../communicator/tests/model-fixture.js';
import {endStream} from '../../communicator/tests/stream-fixtures.js';
import {chromium,expect} from 'playwright/test';

const instanceId='11111111-1111-4111-8111-111111111111';
const intent={instanceId,generation:1,requestId:'22222222-2222-4222-8222-222222222222',targetImage:'registry.example/ned@sha256:'+'a'.repeat(64)};
function root(t){const dir=mkdtempSync(path.join(tmpdir(),'ned-maintenance-api-'));const cleanup=[];t.after(async()=>{for(const close of cleanup.reverse())await close();rmSync(dir,{recursive:true,force:true});});return {dir,cleanup};}

test('TC-002: committed Core rejects authenticated API work before effects but preserves reads and auth boundaries',async t=>{
 const {dir,cleanup}=root(t);let now=1000;
 const env={NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'},databasePath=path.join(dir,'ned.sqlite');
 const maintenance=createManagedMaintenance({env,databasePath,clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const token='a'.repeat(64),app=await createCoreServer({home:dir,env,databasePath,backendOnly:true,operatorCredential:token,maintenance});await app.listen();cleanup.push(()=>app.close());
 const request=(resource,body,headers={})=>fetch(app.url+resource,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const interaction={kind:'interaction',clientId:'33333333-3333-4333-8333-333333333333',hasDraft:false};
 now=301000;assert.equal(maintenance.prepare(intent).ready,true);
 let response=await request('/api/v1/activity/interaction',interaction,{Origin:'https://foreign.example'});assert.equal(response.status,403);await response.body.cancel();assert.equal(maintenance.status(intent).state,'prepared');
 response=await request('/api/v1/activity/interaction',interaction,{Authorization:'Bearer '+'b'.repeat(64)});assert.equal(response.status,401);await response.body.cancel();assert.equal(maintenance.status(intent).state,'prepared');
 response=await request('/api/v1/activity/interaction',interaction);assert.equal(response.status,200);assert.deepEqual(await response.json(),{accepted:true});assert.equal(maintenance.status(intent).reason,'recent_activity');
 now=601000;maintenance.prepare(intent);maintenance.commit(intent);
 response=await request('/api/v1/coordinator/reconcile',{});assert.equal(response.status,503);assert.equal((await response.json()).error.code,'instance_updating');
 response=await request('/api/v1/activity/interaction',interaction);assert.equal(response.status,503);await response.body.cancel();
 response=await request('/api/v1/maintenance/commit',intent);assert.equal(response.status,404);await response.body.cancel();
 response=await request('/api/v1/context');assert.equal(response.status,200);await response.body.cancel();assert.equal(maintenance.status(intent).state,'committed');
});

test('TC-002: maintenance control rejects malformed and stale authority and bounds response work',t=>{
 const {dir,cleanup}=root(t);let now=1000,authorized=true;
 const maintenance=createManagedMaintenance({databasePath:path.join(dir,'ned.sqlite'),env:{NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'},clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const replies=[],control=createMaintenanceControl({maintenance,authorized:()=>authorized,send:value=>replies.push(value),clock:()=>now});control.announce();assert.deepEqual(replies.pop(),{type:'maintenance-capabilities',version:1,supported:true});
 const request={type:'maintenance-request',version:1,id:'a'.repeat(43),action:'prepare',input:intent};now=301000;
 control.receive({...request,input:{...intent,generation:2}});assert.equal(replies.pop().errorCode,'maintenance_invalid');assert.equal(maintenance.status(intent).state,'none');
 control.receive(request);assert.equal(replies.pop().result.state,'prepared');control.receive({...request,action:'commit'});assert.equal(replies.pop().result.state,'committed');
 authorized=false;control.receive({...request,action:'release'});assert.equal(replies.length,0);assert.equal(maintenance.status(intent).state,'committed');
 authorized=true;for(let i=0;i<20;i++)control.receive({...request,action:'status'});assert.equal(replies.length,5);
 assert.equal(JSON.stringify(replies).includes(intent.targetImage),false);now+=1000;control.receive({...request,action:'release'});assert.equal(replies.at(-1).result.released,true);
});

test('TC-002: Linux process inventory permits fixed platform identities and health but defers user commands and uncertainty',t=>{
 const {dir}=root(t);
 const process=(id,parent,started=100,cmd='node\0/opt/ned/core.js\0')=>{const folder=path.join(dir,String(id));mkdirSync(folder,{recursive:true});writeFileSync(path.join(folder,'stat'),`${id} (node) ${['S',parent,...Array(17).fill('0'),started].join(' ')}`);writeFileSync(path.join(folder,'cmdline'),cmd);};
 process(1,0);process(2,1);process(3,1);const inspect=createManagedProcessInspector({procRoot:dir,pid:2,platform:'linux',env:{NED_PLATFORM_PIDS:'1,3'}});assert.deepEqual(inspect(),{idle:true});
 process(4,1,100,'node\0/opt/ned-managed/health.js\0');assert.deepEqual(inspect(),{idle:true});
 process(5,2,101,'python\0user-job.py\0');assert.deepEqual(inspect(),{idle:false,reason:'active_command'});rmSync(path.join(dir,'5'),{recursive:true});
 process(3,1,999);assert.deepEqual(inspect(),{idle:false,reason:'unknown_activity'});
 assert.deepEqual(createManagedProcessInspector({procRoot:dir,pid:2,platform:'linux',env:{}})(),{idle:false,reason:'unknown_activity'});
});

test('TC-002: background chat remains busy after202 until the provider stream finishes',{timeout:10000},async t=>{
 const {dir,cleanup}=root(t);let now=1000,started;
 const startedPromise=new Promise(resolve=>{started=resolve;});
 const gateway=http.createServer((req,res)=>{assert.equal(req.url,'/api/sessions/nedcom-main/chat/stream');started(res);});
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));cleanup.push(()=>{gateway.closeAllConnections();return new Promise(resolve=>gateway.close(resolve));});
 const databasePath=path.join(dir,'ned.sqlite'),env={NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'};
 const maintenance=createManagedMaintenance({databasePath,env,clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const app=createCommunicatorServer({home:dir,env,databasePath,maintenance,modelSetup:configuredModelSetup(),gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();cleanup.push(()=>app.close());
 const headers={Authorization:'Bearer '+app.apiCredential,Origin:app.url,'Content-Type':'application/json'};
 const response=await fetch(app.url+'/api/v1/chat/sessions/nedcom-main/chat',{method:'POST',headers,body:JSON.stringify({input:'Synthetic fixture only.'})});assert.equal(response.status,202);const data=await response.json();
 const provider=await startedPromise;now=901000;assert.equal(maintenance.prepare(intent).reason,'active_work');
 endStream(provider,'nedcom-main','Synthetic complete.');
 const completed=await fetch(app.url+`/api/v1/chat/sessions/nedcom-main/turns/${data.turn.id}?wait=1`,{headers,signal:AbortSignal.timeout(5000)});assert.equal(completed.status,200);await completed.body.cancel();
 assert.equal(maintenance.status(intent).reason,'recent_activity');now+=300000;assert.equal(maintenance.prepare(intent).ready,true);
});

test('TC-002: actual Native managed control carries Core maintenance but disconnect never clears a committed barrier',{timeout:10000},async t=>{
 const {dir,cleanup}=root(t);let now=1000,connected;
 const connectedPromise=new Promise(resolve=>{connected=resolve;});
 let origin;
 const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({instance:{id:instanceId,kind:'managed'},tunnelUrl:origin.replace('http:','ws:')+'/tunnel/control?slug=fixture'}));});
 const ws=new WebSocketServer({server,maxPayload:65536,perMessageDeflate:false});ws.on('connection',socket=>connected(socket));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
 cleanup.push(()=>{for(const client of ws.clients)client.terminate();ws.close();server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 const maintenance=createManagedMaintenance({databasePath:path.join(dir,'ned.sqlite'),env:{NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'},clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const connection=startHubConnection({hub:new URL(origin),proxy:new URL(origin),instance:new URL(origin),slug:'fixture',name:'Fixture',token:'ned_'+'x'.repeat(32)},'http://127.0.0.1:1/',{apiCredential:'a'.repeat(64),maintenance});cleanup.push(()=>connection.close());
 const control=await connectedPromise;
 const receive=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Control response deadline')),3000);control.once('message',data=>{clearTimeout(timer);resolve(JSON.parse(data));});});
 let reply=receive();control.send(JSON.stringify({type:'ready'}));assert.equal((await reply).supported,true);now=301000;
 for(const action of ['prepare','commit']){reply=receive();control.send(JSON.stringify({type:'maintenance-request',version:1,id:'b'.repeat(43),action,input:intent}));assert.equal((await reply).result.ready,true);}
 await connection.close();assert.equal(maintenance.status(intent).state,'committed');assert.throws(()=>maintenance.enter('task'),{code:'instance_updating'});
});

test('TC-002: served browser forwards trusted keyboard activity without sending user content',{timeout:20000},async t=>{
 const {dir,cleanup}=root(t);let now=1000;
 const env={NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'},databasePath=path.join(dir,'ned.sqlite');
 const maintenance=createManagedMaintenance({databasePath,env,clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const app=createCommunicatorServer({home:dir,env,databasePath,maintenance,modelSetup:configuredModelSetup(),gateway:{key:''}});await app.listen();cleanup.push(()=>app.close());
 const browser=await chromium.launch({headless:true});cleanup.push(()=>browser.close());const context=await browser.newContext({extraHTTPHeaders:{Authorization:'Bearer '+app.apiCredential}}),page=await context.newPage();
 const initial=page.waitForResponse(response=>response.url().endsWith('/api/v1/activity/interaction'));await page.goto(app.url);assert.equal((await initial).status(),200);
 now=301000;assert.equal(maintenance.prepare(intent).ready,true);
 const activity=page.waitForResponse(response=>response.url().endsWith('/api/v1/activity/interaction')&&response.request().postDataJSON()?.kind==='interaction');await page.keyboard.press('Tab');const response=await activity;
 assert.equal(response.status(),200);const body=response.request().postDataJSON();assert.deepEqual(Object.keys(body).sort(),['clientId','hasDraft','kind']);assert.equal(body.hasDraft,false);assert.equal(maintenance.status(intent).state,'none');assert.equal(maintenance.status(intent).reason,'recent_activity');
});

test('TC-002: unsaved provider keys defer maintenance without leaking values; clearing or saving releases pending input',{timeout:20000},async t=>{
 const {dir,cleanup}=root(t);let now=1000,saved=false;
 const env={NED_MANAGED_INSTANCE_ID:instanceId,NED_MANAGED_GENERATION:'1'},databasePath=path.join(dir,'ned.sqlite');
 const maintenance=createManagedMaintenance({databasePath,env,clock:()=>now,inspectProcesses:()=>({idle:true})});cleanup.push(()=>maintenance.close());
 const state=()=>({configured:saved,source:'profile',provider:'openai',model:'fixture-model',nonce:'n'.repeat(43),deviceLogin:false,models:{openai:['fixture-model']}});
 const secret='synthetic-unsaved-provider-key';
 const modelSetup={...configuredModelSetup(),async handle(req,_res,send){if(req.method==='POST'){let text='';for await(const chunk of req)text+=chunk;assert.equal(JSON.parse(text).apiKey,secret);saved=true;}send(200,state());}};
 const app=createCommunicatorServer({home:dir,env,databasePath,maintenance,modelSetup,gateway:{key:''}});await app.listen();cleanup.push(()=>app.close());
 const browser=await chromium.launch({headless:true});cleanup.push(()=>browser.close());const context=await browser.newContext({extraHTTPHeaders:{Authorization:'Bearer '+app.apiCredential}}),page=await context.newPage(),bodies=[];
 page.on('request',request=>{if(request.url().endsWith('/api/v1/activity/interaction'))bodies.push(request.postDataJSON());});
 // Capture the real server acknowledgement outside the document's CDP response
 // lifetime: a later navigation can discard a page Response before json() reads it.
 let clearClientId,onCleared;
 await page.route('**/api/v1/activity/interaction',async route=>{
  const input=route.request().postDataJSON();
  const observe=input.hasDraft===false&&input.clientId===clearClientId?onCleared:null;
  const response=await route.fetch(),body=await response.json();
  await route.fulfill({response});
  observe?.(body);
 });
 cleanup.push(()=>page.unrouteAll({behavior:'wait'}));
 const initial=page.waitForResponse(response=>response.url().endsWith('/api/v1/activity/interaction'));await page.goto(app.url);await initial;
 const key=page.getByLabel('API key',{exact:true});await expect(key).toBeVisible();now=301000;await key.fill(secret);
 await expect.poll(()=>maintenance.status(intent).reason,{timeout:2000}).toBe('pending_draft');assert.equal(maintenance.prepare(intent).ready,false);
 assert.equal(JSON.stringify(bodies).includes(secret),false);await expect.poll(()=>bodies.some(body=>body.hasDraft)).toBe(true);now+=300000;assert.equal(maintenance.prepare(intent).ready,false);
 const cleared=new Promise(resolve=>{onCleared=resolve;});clearClientId=bodies.findLast(body=>body.hasDraft===true).clientId;assert.equal(typeof clearClientId,'string');await key.fill('');assert.equal((await cleared).accepted,true);onCleared=undefined;assert.notEqual(maintenance.status(intent).reason,'pending_draft');now+=300000;assert.equal(maintenance.prepare(intent).ready,true);maintenance.release(intent);
 await key.fill(secret);await expect.poll(()=>maintenance.status(intent).reason).toBe('pending_draft');await page.getByRole('button',{name:'Connect provider',exact:true}).click();
 await expect(key).not.toBeVisible();await expect.poll(()=>maintenance.status(intent).reason).toBe('recent_activity');assert.equal(saved,true);assert.equal(JSON.stringify(bodies).includes(secret),false);
 now+=300000;assert.equal(maintenance.prepare(intent).ready,true);
});
