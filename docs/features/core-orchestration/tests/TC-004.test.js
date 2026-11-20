import test from 'node:test';
import assert from 'node:assert/strict';
import {readRunEvents} from '../../../../apps/core/src/hermes.js';
import {runtimeFixture} from './runtime-fixture.js';
import {fork} from 'node:child_process';
import {once} from 'node:events';

async function until(predicate){const deadline=Date.now()+3000;while(!predicate()){if(Date.now()>deadline)throw new Error('Synthetic observable state did not arrive.');await new Promise(resolve=>setImmediate(resolve));}}

function barrier(){let enter,resolve,reject;const entered=new Promise(ready=>{enter=ready;}),promise=new Promise((accept,fail)=>{resolve=accept;reject=fail;});return {entered,resolve,reject,wait(){enter();return promise;}};}

async function worker(fixture){const env={...process.env};delete env.NODE_TEST_CONTEXT;const processChild=fork(new URL('./runtime-service-child.js',import.meta.url),[fixture.root,fixture.databasePath,fixture.gatewayUrl],{execArgv:[],env,stdio:['ignore','ignore','inherit','ipc']});const first=(await once(processChild,'message'))[0];return {process:processChild,first,async send(message){const result=once(processChild,'message');processChild.send(message);return (await result)[0];},async kill(){if(processChild.exitCode===null&&!processChild.signalCode){const exit=once(processChild,'exit');processChild.kill('SIGKILL');await exit;}}};}

async function* chunks(text,size=3){const buffer=Buffer.from(text);for(let index=0;index<buffer.length;index+=size)yield buffer.subarray(index,index+size);}

test('TC-004: fragmented Hermes run SSE preserves UTF-8 and child lifecycle',async()=>{
  const expected=[{event:'message.delta',run_id:'run_synthetic',delta:'Hello 🌙'},{event:'subagent.start',run_id:'run_synthetic',child_session_id:'child_1',parent_id:'ned_parent',delegation_id:'delegation_1'}];
  const events=[];for await(const event of readRunEvents(chunks(expected.map(value=>`data: ${JSON.stringify(value)}\r\n\r\n`).join(''))))events.push(event);
  assert.deepEqual(events,expected);
});

test('TC-004: accepted run outlives tick, child graph correlates actual subagent parents and ignores tools',{timeout:10000},async t=>{
  const fixture=await runtimeFixture(t);const attempt=await fixture.attempt();const tick=await fixture.tick();assert.equal(tick.state,'completed');
  const runId=fixture.core.getAttempt(fixture.projectId,attempt.id).runId;await fixture.waitSubscriber(runId);
  fixture.sessions.set('child_one',{id:'child_one',title:'child',source:'subagent'});fixture.sessions.set('child_two',{id:'child_two',title:'nested',source:'subagent'});
  fixture.emit(runId,{event:'message.delta',delta:'Hello 🌙'},{fragment:true});
  fixture.emit(runId,{event:'tool.started',arguments:{secret:'never metadata'}});
  fixture.emit(runId,{event:'subagent.start',subagent_id:'agent_one',child_session_id:'child_one',delegation_id:'delegation_one',depth:0});
  fixture.emit(runId,{event:'subagent.start',subagent_id:'agent_two',child_session_id:'child_two',delegation_id:'delegation_two',parent_id:'agent_one',depth:1});
  await until(()=>fixture.core.getAttempt(fixture.projectId,attempt.id).bindings.length===3);
  let row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.resultText,'Hello 🌙');assert.equal(row.bindings.find(binding=>binding.sessionId==='child_two').parentSessionId,'child_one');
  fixture.emit(runId,{event:'subagent.start',subagent_id:'forged',child_session_id:'foreign',delegation_id:'delegation_bad',parent_id:row.sessionId,depth:1});
  await until(()=>!fixture.core.getAttempt(fixture.projectId,attempt.id).mappingComplete);
  await fixture.runtime.maintenance();row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.bindings.length,3);assert.ok(row.bindings.every(binding=>binding.namingState==='confirmed'));
  assert.equal(JSON.stringify(fixture.core.events(fixture.projectId)).includes('never metadata'),false);
  fixture.runs.get(runId).status='completed';fixture.runs.get(runId).output='Final synthetic output';await fixture.runtime.maintenance();
  assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).state,'awaiting_verification');assert.equal((await fixture.task.getItem(attempt.taskId)).status,'working');
  fixture.core.verify(fixture.projectId,attempt.id,{accepted:true,evidence:[{kind:'test',reference:'synthetic acceptance'}]},'verify');
  await fixture.core.complete(fixture.projectId,attempt.taskId,{evidence:[{kind:'review',reference:'synthetic review'}]},'complete');assert.equal((await fixture.task.getItem(attempt.taskId)).status,'done');
});

test('TC-004: stop acknowledgement is not terminal and completed success wins stop race',async t=>{
  for(const terminal of ['cancelled','completed'])await t.test(terminal,async t=>{
    const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.tick();let row=fixture.core.getAttempt(fixture.projectId,attempt.id);
    fixture.core.stop(fixture.projectId,row.id,{},'stop');await fixture.runtime.maintenance();row=fixture.core.getAttempt(fixture.projectId,row.id);assert.equal(row.state,'stopping');assert.equal(fixture.runs.get(row.runId).stopRequested,true);
    fixture.runs.get(row.runId).status=terminal;await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).state,terminal==='completed'?'awaiting_verification':'cancelled');
  });
});

test('TC-004: known run recovers by GET without admission replay, approval consumes execution capacity',async t=>{
  const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.tick();let row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
  fixture.runs.get(row.runId).status='waiting_for_approval';await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).errorCode,'waiting_for_approval');
  const second=await fixture.attempt('Second task');await fixture.tick('second-tick');assert.equal(fixture.core.getAttempt(fixture.projectId,second.id).state,'queued');
  await fixture.reopen();await fixture.runtime.maintenance();row=fixture.core.getAttempt(fixture.projectId,row.id);assert.equal(row.state,'running');assert.equal(row.resultComplete,0);assert.equal(row.mappingComplete,0);
  assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);assert.equal(fixture.requests.some(request=>request.url.endsWith('/approval')),false);
});

test('TC-004: two actual hosts keep one subscriber, honor persisted control and recover dead owner by GET',{timeout:10000},async t=>{
  const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.runtime.close();
  const first=await worker(fixture),second=await worker(fixture);
  try{
    assert.equal(first.first.owner,true);assert.equal(second.first.owner,false);
    assert.equal((await second.send({action:'tick',key:'remote-tick'})).ok,true);
    await first.send({action:'maintenance'});let row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
    await second.send({action:'maintenance'});assert.equal(fixture.streams.get(row.runId).size,1);
    await second.send({action:'stop',key:'remote-stop',projectId:fixture.projectId,id:attempt.id});await first.send({action:'maintenance'});assert.equal(fixture.runs.get(row.runId).stopRequested,true);
    await first.kill();await until(()=>fixture.streams.get(row.runId).size===0);
    assert.equal((await second.send({action:'maintenance'})).owner,true);await fixture.waitSubscriber(row.runId);assert.equal(fixture.streams.get(row.runId).size,1);
    row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.mappingComplete,0);assert.equal(row.resultComplete,0);assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);
  }finally{await first.kill();await second.kill();}
});

test('TC-004: run remains observed after 31 seconds with no new reconcile request',async t=>{
  let now=Date.parse('2026-11-15T00:00:00Z');const fixture=await runtimeFixture(t,{clock:()=>new Date(now)});const attempt=await fixture.attempt();await fixture.tick();const row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
  now+=31000;fixture.emit(row.runId,{event:'message.delta',delta:'Still working after thirty seconds.'});await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).resultText.includes('thirty'));
  fixture.runs.get(row.runId).status='completed';await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).state,'awaiting_verification');assert.equal(fixture.core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_tick_requests').get().n,1);
});

test('TC-004: child naming failure retries label only, complete output is capped and failed retry has fresh identity',{timeout:10000},async t=>{
  const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.tick();let row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
  fixture.sessions.set('child_label',{id:'child_label',title:'original',source:'subagent'});fixture.behavior.namingStatus=503;
  fixture.emit(row.runId,{event:'subagent.start',subagent_id:'agent_label',child_session_id:'child_label',delegation_id:'delegation_label',depth:0});
  await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).bindings.length===2);await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).bindings.find(binding=>binding.role==='child').namingState,'pending');
  fixture.behavior.namingStatus=200;await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).bindings.find(binding=>binding.role==='child').namingState,'confirmed');assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);
  fixture.runs.get(row.runId).status='completed';fixture.runs.get(row.runId).output='x'.repeat(1048577);await fixture.runtime.maintenance();row=fixture.core.getAttempt(fixture.projectId,row.id);assert.equal(Buffer.byteLength(row.resultText),1048576);assert.equal(row.resultTruncated,1);assert.equal(row.state,'awaiting_verification');
  fixture.core.verify(fixture.projectId,row.id,{accepted:false,evidence:[{kind:'review',reference:'synthetic rejection'}]},'reject');const retry=await fixture.core.retry(fixture.projectId,row.id,{instructions:'Fresh approved retry.'},'retry');assert.notEqual(retry.id,row.id);assert.notEqual(retry.dispatchKey,row.dispatchKey);assert.equal(retry.number,2);
});

test('TC-004: EOF, oversized event and terminal unavailability never create another run',async t=>{
  for(const status of ['interrupted',404])await t.test(String(status),async t=>{
    const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.tick();const row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
    for(const response of fixture.streams.get(row.runId))response.end();await until(()=>!fixture.core.getAttempt(fixture.projectId,row.id).resultComplete);
    if(status===404)fixture.behavior.statusCode=404;else fixture.runs.get(row.runId).status=status;
    await fixture.runtime.maintenance();assert.equal(fixture.core.getAttempt(fixture.projectId,row.id).state,'unknown');await fixture.tick('after-unavailable');assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);
  });
});

test('TC-004: oversized or unterminated Hermes event cannot silently become completion',async()=>{
  for(const text of [`data: ${JSON.stringify({event:'message.delta',run_id:'run_1',delta:'x'.repeat(65536)})}\n\n`,'data: {"event":"run.completed","run_id":"run_1"}']){
    await assert.rejects(async()=>{for await(const event of readRunEvents(chunks(text,4096)))assert.notEqual(event.event,'run.completed');},error=>error.code==='invalid_gateway_stream');
  }
});

test('TC-004: delayed observer decisions cannot downgrade SSE terminal, verified or resolved authority',{timeout:15000},async t=>{
  const variants=[
    {name:'GET404 after completion',method:'getRun',error:{status:404},outcome:'awaiting_verification'},
    {name:'GET403 after verification',method:'getRun',error:{status:403},outcome:'succeeded'},
    {name:'identity mismatch after rejected verification',method:'identity',value:'different-gateway',outcome:'failed'},
    {name:'identity rejection after explicit resolution',method:'identity',error:{code:'gateway_identity_changed'},outcome:'cancelled'},
    {name:'stop404 after verification',method:'stop',error:{status:404},outcome:'succeeded'},
    {name:'late foreign status after verification',method:'getRun',value:{run_id:'foreign',status:'running'},outcome:'succeeded'},
    {name:'late running status cannot send stale stop',method:'getRun',value:'owned-running',stopBefore:true,outcome:'succeeded'},
  ];
  for(const variant of variants)await t.test(variant.name,async t=>{
    let hold=false;const gate=barrier();
    const fixture=await runtimeFixture(t,{wrapGateway:gateway=>({...gateway,[variant.method]:(...args)=>hold?gate.wait():gateway[variant.method](...args)})});
    const attempt=await fixture.attempt();await fixture.tick();const row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
    if(variant.method==='stop'||variant.stopBefore)fixture.core.stop(fixture.projectId,row.id,{},'request-stop');
    hold=true;const observing=fixture.runtime.maintenance();await gate.entered;
    if(variant.outcome==='cancelled'){
      fixture.emit(row.runId,{event:'run.interrupted'});await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).state==='unknown');
      fixture.core.resolve(fixture.projectId,row.id,{outcome:'cancelled',acknowledgeUncertainSideEffects:true,evidence:[{kind:'manual',reference:'Synthetic explicit side-effect resolution.'}]},'resolve-observer-race');
    }else{
      fixture.emit(row.runId,{event:'run.completed',output:'Authoritative SSE completion.'});await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).state==='awaiting_verification');
      if(variant.outcome!=='awaiting_verification')fixture.core.verify(fixture.projectId,row.id,{accepted:variant.outcome==='succeeded',evidence:[{kind:'test',reference:'Synthetic accepted SSE completion.'}]},'verify-observer-race');
    }
    const before=fixture.core.getAttempt(fixture.projectId,row.id),eventCount=fixture.core.events(fixture.projectId).data.length;
    hold=false;if(variant.error)gate.reject(variant.error);else gate.resolve(variant.value==='owned-running'?{run_id:row.runId,status:'running'}:variant.value);await observing;
    assert.deepEqual(fixture.core.getAttempt(fixture.projectId,row.id),before);
    assert.equal(fixture.core.events(fixture.projectId).data.length,eventCount);
    assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);
    assert.equal(fixture.requests.filter(request=>request.url.endsWith('/stop')).length,0);
    await until(()=>(fixture.streams.get(row.runId)?.size??0)===0);
  });
});

test('TC-004: obsolete observer and stream cannot mutate a replacement binding',{timeout:10000},async t=>{
  let hold=false;const gate=barrier();const fixture=await runtimeFixture(t,{wrapGateway:gateway=>({...gateway,getRun:(...args)=>hold?gate.wait():gateway.getRun(...args)})});
  const attempt=await fixture.attempt();await fixture.tick();const row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
  hold=true;const observing=fixture.runtime.maintenance();await gate.entered;
  fixture.core.store.updateAttempt(fixture.projectId,row.id,{runId:'run_replacement',gatewayIdentity:'replacement_gateway',sessionId:'replacement_session'});
  const before=fixture.core.getAttempt(fixture.projectId,row.id);
  fixture.emit(row.runId,{event:'subagent.start',subagent_id:'obsolete_child',child_session_id:'obsolete_session',delegation_id:'obsolete_delegation',depth:0});
  await until(()=>(fixture.streams.get(row.runId)?.size??0)===0);
  hold=false;gate.reject({status:404});await observing;
  assert.deepEqual(fixture.core.getAttempt(fixture.projectId,row.id),before);assert.equal(fixture.requests.filter(request=>request.url.endsWith('/stop')).length,0);
});

test('TC-004: delayed title acknowledgement cannot update verified binding state',{timeout:10000},async t=>{
  const gate=barrier();let release;
  const fixture=await runtimeFixture(t,{wrapGateway:gateway=>({...gateway,setTitle:async(...args)=>{const value=await gateway.setTitle(...args);release=()=>gate.resolve(value);return gate.wait();}})});
  const attempt=await fixture.attempt();await fixture.tick();const row=fixture.core.getAttempt(fixture.projectId,attempt.id);await fixture.waitSubscriber(row.runId);
  fixture.sessions.set('child_ack',{id:'child_ack',title:'Original child title',source:'subagent'});
  fixture.emit(row.runId,{event:'subagent.start',subagent_id:'agent_ack',child_session_id:'child_ack',delegation_id:'delegation_ack',depth:0});await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).bindings.length===2);
  const naming=fixture.runtime.maintenance();await gate.entered;
  fixture.emit(row.runId,{event:'run.completed',output:'Verified before delayed title acknowledgement.'});await until(()=>fixture.core.getAttempt(fixture.projectId,row.id).state==='awaiting_verification');
  fixture.core.verify(fixture.projectId,row.id,{accepted:true,evidence:[{kind:'review',reference:'Synthetic terminal authority.'}]},'verify-before-title');const before=fixture.core.getAttempt(fixture.projectId,row.id);
  release();await naming;assert.deepEqual(fixture.core.getAttempt(fixture.projectId,row.id),before);
});

test('TC-004: delayed session and capability decisions cannot revive a stopped preparation',{timeout:10000},async t=>{
  for(const method of ['capabilities','createKnownSession'])await t.test(method,async t=>{
    const gate=barrier();let release;
    const fixture=await runtimeFixture(t,{wrapGateway:gateway=>({...gateway,[method]:async(...args)=>{const value=await gateway[method](...args);release=()=>gate.resolve(method==='capabilities'?{supported:false}:value);return gate.wait();}})});
    const attempt=await fixture.attempt();const ticking=fixture.tick();await gate.entered;
    fixture.core.stop(fixture.projectId,attempt.id,{},'stop-preparation');const before=fixture.core.getAttempt(fixture.projectId,attempt.id);
    release();await ticking;assert.deepEqual(fixture.core.getAttempt(fixture.projectId,attempt.id),before);assert.equal(fixture.runs.size,0);assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).bindings.length,0);
  });
});
