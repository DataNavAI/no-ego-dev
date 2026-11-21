import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hermesFixture,until} from './fixture.js';

test('real Hermes agent streams model-only stub output before verified Core completion',{timeout:60000},async t=>{
  const fixture=await hermesFixture();t.after(()=>fixture.close());
  const barrier=fixture.barrier('NED_STREAM_CASE','delta');
  fixture.mock.onMessage('NED_STREAM_CASE',{content:'Hermes streamed answer.'});
  const run=await fixture.attempt('NED_STREAM_CASE');
  await barrier.reached.promise;
  let partial;
  try{partial=await until(()=>fixture.request(run.path+'/result'),value=>value.text.length>0,'Core partial text');}
  catch(error){throw new Error(`${error.message}; observation=${JSON.stringify(await fixture.observationSnapshot(run))}`,{cause:error});}
  assert.ok(partial.text.length<'Hermes streamed answer.'.length);
  assert.equal((await fixture.request(run.path)).state,'running');
  barrier.release.resolve();
  const settled=await until(()=>fixture.request(run.path),value=>value.state==='awaiting_verification','Hermes completion');
  assert.ok(settled.runId);assert.ok(settled.sessionId);assert.equal(settled.bindings[0].sessionId,settled.sessionId);
  assert.equal((await fixture.request(run.path+'/result')).text,'Hermes streamed answer.');
  await fixture.request(run.taskPath+'/complete',{method:'POST',body:{evidence:[{kind:'test',reference:'premature'}]},status:409});
  await fixture.request(run.path+'/verify',{method:'POST',body:{accepted:true,evidence:[{kind:'test',reference:'real Hermes/model stub'}]}});
  await fixture.request(run.taskPath+'/complete',{method:'POST',body:{evidence:[{kind:'test',reference:'verified'}]}});
  assert.equal((await fixture.request(fixture.scope+'/work')).items.find(item=>item.id===run.item.id).status,'done');
  assert.ok(fixture.mock.getRequests().some(entry=>entry.body?.stream===true));
  await fixture.close();await fixture.assertClosed();
});

test('real Hermes executes a file tool and returns its output to the stub model',{timeout:60000},async t=>{
  const fixture=await hermesFixture();t.after(()=>fixture.close());
  const file=path.join(fixture.project,'fixture.txt');await writeFile(file,'NED_FILE_TOOL_RESULT');
  fixture.mock.on({userMessage:'NED_TOOL_CASE',hasToolResult:false},{toolCalls:[{id:'ned_file_call',name:'read_file',arguments:JSON.stringify({path:file})}]});
  fixture.mock.on({userMessage:'NED_TOOL_CASE',hasToolResult:true},{content:'Verified the real file tool.'});
  const run=await fixture.attempt('NED_TOOL_CASE');
  await until(()=>fixture.request(run.path),value=>value.state==='awaiting_verification','file tool completion');
  assert.equal((await fixture.request(run.path+'/result')).text,'Verified the real file tool.');
  assert.ok(fixture.requests.some(entry=>entry.body?.messages?.some(message=>message.role==='tool'&&JSON.stringify(message.content).includes('NED_FILE_TOOL_RESULT'))));
  await fixture.close();await fixture.assertClosed();
});

test('real Hermes stop settles a held model call and test failure teardown removes the gateway',{timeout:60000},async t=>{
  const fixture=await hermesFixture();t.after(()=>fixture.close());
  fixture.mock.onMessage('NED_STOP_CASE',{content:'Should not complete normally.'});
  const barrier=fixture.barrier('NED_STOP_CASE','hold');
  const run=await fixture.attempt('NED_STOP_CASE');await barrier.reached.promise;
  await fixture.request(run.path+'/stop',{method:'POST',body:{},status:202});
  const settled=await until(()=>fixture.request(run.path),value=>value.state==='cancelled','Hermes cancellation');
  assert.equal(settled.state,'cancelled');
  const snapshot=await fixture.observationSnapshot(run);
  assert.equal(snapshot.state,'cancelled');assert.equal(snapshot.hasRunId,true);
  assert.deepEqual(Object.keys(snapshot).sort(),['errorCode','forwardedTextChars','gatewayOutputChars','gatewayStatus','hasRunId','modelRequests','resultChars','state'].sort());
  assert.equal(JSON.stringify(snapshot).includes('NED_STOP_CASE'),false);
  await assert.rejects(async()=>{try{throw new Error('intentional assertion failure');}finally{await fixture.close();}},/intentional assertion failure/);
  await fixture.assertClosed();
  const unavailable=await fixture.observationSnapshot(run);
  assert.equal(unavailable.state,null);assert.equal(unavailable.resultChars,null);assert.equal(unavailable.gatewayStatus,null);
});

test('Hermes startup failure rejects rather than skipping or attaching to the host gateway',{timeout:40000},async()=>{
  let failure;try{await hermesFixture({badSource:true});}catch(error){failure=error;}
  assert.match(failure?.message||'',/Hermes exited before readiness/);
  await assert.rejects(access(failure.fixtureRoot),{code:'ENOENT'});
});

test('real Hermes delegation emits child session identities bound to the Core attempt',{timeout:60000},async t=>{
  const fixture=await hermesFixture();t.after(()=>fixture.close());
  fixture.mock.on({userMessage:'NED_PARENT_CASE',hasToolResult:false},{toolCalls:[{id:'ned_delegate_call',name:'delegate_task',arguments:JSON.stringify({tasks:[{goal:'NED_CHILD_CASE',toolsets:[]}]})}]});
  fixture.mock.onMessage('NED_CHILD_CASE',{content:'Child completed its synthetic work.'});
  fixture.mock.on({userMessage:'NED_PARENT_CASE',hasToolResult:true},{content:'Parent dispatched the child.'});
  const run=await fixture.attempt('NED_PARENT_CASE');
  const settled=await until(()=>fixture.request(run.path),value=>value.state==='awaiting_verification','delegated completion');
  const child=settled.bindings.find(binding=>binding.role==='child');
  assert.ok(child,'authoritative child lifecycle must produce a binding');
  assert.equal(child.parentSessionId,settled.sessionId);assert.ok(child.delegationId);
  assert.notEqual(child.sessionId,settled.sessionId);
  await until(()=>fixture.gatewayRequest('/api/sessions/'+child.sessionId+'/messages'),value=>JSON.stringify(value).includes('Child completed its synthetic work.'),'persisted child output');
  assert.ok(fixture.requests.some(entry=>entry.body?.messages?.some(message=>message.role==='user'&&message.content==='NED_CHILD_CASE')));
  await fixture.close();await fixture.assertClosed();
});

test('TERM during real inference tears down the owned gateway and disposable profile',{timeout:40000},async t=>{
  const worker=spawn(process.execPath,[fileURLToPath(new URL('./interrupt-worker.js',import.meta.url))],{env:process.env,stdio:['ignore','pipe','pipe']});
  const closed=new Promise(resolve=>worker.once('close',(code,signal)=>resolve({code,signal})));
  t.after(async()=>{if(worker.exitCode===null&&worker.signalCode===null){worker.kill('SIGTERM');await closed;}});
  const ready=await new Promise((resolve,reject)=>{
    let output='',error='';worker.stderr.on('data',chunk=>{error=(error+chunk).slice(-16000);});
    worker.once('error',reject);worker.once('close',()=>reject(new Error('Interrupt worker failed: '+error)));
    worker.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/NED_INTERRUPT_READY (\{[^\n]+\})/);if(match)resolve(JSON.parse(match[1]));});
  });
  worker.kill('SIGTERM');assert.equal((await closed).code,143);
  await assert.rejects(access(ready.root),{code:'ENOENT'});
  assert.throws(()=>process.kill(ready.pid,0),{code:'ESRCH'});
  await assert.rejects(fetch(ready.url+'/health',{signal:AbortSignal.timeout(1000)}));
});

test('model-setup: running Hermes SDK uses an inherited scoped Hub capability after private configuration',{timeout:60000},async t=>{
  const {createModelSetup}=await import('../../../../../apps/core/src/model-setup.js');
  const {createCommunicatorServer}=await import('../../../../../apps/com/src/server.js');
  const {randomUUID}=await import('node:crypto');
  const {readFile}=await import('node:fs/promises');
  const id=randomUUID(),connection={id:randomUUID(),version:randomUUID(),provider:'openai',model:'ned-test-model'},token='ned_'+'c'.repeat(43);
  let metadataCalls=0,inferenceCalls=0;
  const fixture=await hermesFixture({configureProfile(config){delete config.model;delete config.delegation;},handleModelRequest(req,res,{modelUrl,body}){
    if(req.url===`/api/models/instances/${id}?verify=1`){metadataCalls++;assert.equal(req.headers.authorization,'Bearer '+token);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({configured:true,connection,baseUrl:`${modelUrl}/api/models/instances/${id}/v1`}));return true;}
    if(req.url===`/api/models/instances/${id}/v1/chat/completions`){inferenceCalls++;assert.equal(req.headers.authorization,'Bearer '+token);assert.equal(body.model,'ned-test-model');assert.equal(body.stream,true);return '/v1/chat/completions';}
    throw Error('Unexpected model route');
  }});t.after(()=>fixture.close());
  const env={HERMES_HOME:fixture.home,NED_HERMES_URL:fixture.url,NED_HERMES_API_KEY:'ned-test-gateway-key-0123456789'};
  const models=createModelSetup({home:fixture.root,env});t.after(()=>models.close());
  assert.equal((await models.status()).configured,false);
  // The fixture's fixed proxy is the only model-network destination admitted by
  // its Python audit guard. This is a synthetic Hub protocol boundary, not AWS.
  const configText=await readFile(path.join(fixture.home,'config.yaml'),'utf8');assert(!configText.includes(token));
  const proxyOrigin=fixture.modelUrl;
  await models.register({origin:proxyOrigin,id,token,kind:'hosted'});
  assert.equal((await models.status()).configured,true);
  const app=createCommunicatorServer({home:fixture.root,env,modelSetup:models,databasePath:path.join(fixture.root,'model-chat.sqlite'),initializeDatabase:true});await app.listen();t.after(()=>app.close());
  fixture.mock.onMessage('NED_ACCOUNT_MODEL_CASE',{content:'Account model connection works.'});
  const call=async(route,body)=>{const response=await fetch(app.url+'/api/v1/chat/sessions'+route,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});assert(response.ok,`NED API ${response.status}`);return response.json();};
  await call('/fixed',{});const accepted=await call('/nedcom-main/chat',{input:'NED_ACCOUNT_MODEL_CASE'});
  let result;try{result=await until(async()=>{const response=await fetch(app.url+'/api/v1/chat/sessions/nedcom-main/turns/'+accepted.turn.id);return response.json();},v=>v.turn.status!=='pending','inherited model completion');}catch(error){throw new Error(error.message+'; inferenceCalls='+inferenceCalls+'; paths='+JSON.stringify(fixture.requests.map(r=>r.path))+'; gateway='+fixture.diagnostics().slice(-6000),{cause:error});}
  assert.equal(result.turn.status,'completed');assert.equal(result.message.content,'Account model connection works.');assert(metadataCalls>=2);assert(inferenceCalls>=1);
  const profile=await readFile(path.join(fixture.home,'config.yaml'),'utf8');assert(profile.includes(token));assert(!profile.includes('test-only-model'));assert(!profile.includes('synthetic-provider-key'));
});
