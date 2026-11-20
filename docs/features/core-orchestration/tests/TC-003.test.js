import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,lstat,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {createExecutionOwner} from '../../../../apps/core/src/owner.js';
import {runtimeFixture} from './runtime-fixture.js';
import {createCoreRuntime} from '../../../../apps/core/src/coordinator.js';
import {createHermesGateway} from '../../../../apps/core/src/hermes.js';

const childFile=new URL('./runtime-owner-child.js',import.meta.url);
async function child(t,home){const env={...process.env};delete env.NODE_TEST_CONTEXT;const worker=fork(childFile,[home],{execArgv:[],env,stdio:['ignore','ignore','inherit','ipc']});t.after(async()=>{if(worker.exitCode===null&&!worker.signalCode){const exit=once(worker,'exit');worker.kill('SIGKILL');await exit;}});return {process:worker,first:(await once(worker,'message'))[0]};}

test('TC-003: live process lock never expires, inode remains stable, actual death permits recovery',{timeout:10000},async t=>{
  const home=await mkdtemp(path.join(tmpdir(),'ned-core-owner-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const first=await child(t,home);assert.equal(first.first.held,true);
  const filename=path.join(home,'.ned/core/execution-lock.sqlite'),before=await lstat(filename);
  const second=await child(t,home);assert.equal(second.first.held,false);
  if(process.platform!=='win32')first.process.kill('SIGSTOP');
  second.process.send('acquire');assert.equal((await once(second.process,'message'))[0].held,false);
  const exit=once(first.process,'exit');first.process.kill('SIGKILL');await exit;
  second.process.send('acquire');assert.equal((await once(second.process,'message'))[0].held,true);
  assert.equal((await lstat(filename)).ino,before.ino);
});

test('TC-003: actual Hermes started admission acknowledgement retains run identity without replay',async t=>{
  const fixture=await runtimeFixture(t);fixture.behavior.admissionState='started';
  const attempt=await fixture.attempt();await fixture.tick();
  const admitted=fixture.core.getAttempt(fixture.projectId,attempt.id);
  assert.equal(admitted.state,'running');assert.equal(admitted.runId,'run_1');
  await fixture.tick();
  assert.equal(fixture.requests.filter(request=>request.method==='POST'&&request.url==='/v1/runs').length,1);
});

test('TC-003: slow admitted acknowledgement within the tick deadline retains run identity and never replays',async t=>{
  const fixture=await runtimeFixture(t);fixture.behavior.admissionState='started';fixture.behavior.admissionDelay=1500;
  const attempt=await fixture.attempt();await fixture.tick();
  const admitted=fixture.core.getAttempt(fixture.projectId,attempt.id);
  assert.equal(admitted.state,'running');assert.equal(admitted.runId,'run_1');assert.equal(admitted.errorCode,null);
  await fixture.tick();await fixture.reopen();await fixture.tick();
  assert.equal(fixture.requests.filter(request=>request.method==='POST'&&request.url==='/v1/runs').length,1);
});

test('TC-003: admission still obeys a shorter explicit deadline and expired requests are not sent',async t=>{
  const fixture=await runtimeFixture(t);fixture.behavior.admissionDelay=250;
  const identity=await fixture.gateway.identity(),body={input:'Synthetic deadline case',session_id:'ned_deadline_case'};
  await assert.rejects(fixture.gateway.submitRun(body,'short-deadline',identity,{deadline:Date.now()+50}),{code:'gateway_unavailable'});
  await assert.rejects(fixture.gateway.submitRun(body,'expired-deadline',identity,{deadline:Date.now()-1}),{code:'gateway_deadline'});
  assert.equal(fixture.requests.filter(request=>request.method==='POST'&&request.url==='/v1/runs').length,1);
});

test('TC-003: enrollment and queued attempts do not dispatch without an explicit tick',async t=>{
  const fixture=await runtimeFixture(t);const attempt=await fixture.attempt();
  await fixture.runtime.maintenance();assert.equal(fixture.requests.length,0);assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).state,'queued');
  await fixture.tick();assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,1);assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).state,'running');
});

test('TC-003: ambiguous admission is never posted again after tick, restart or retention expiry',async t=>{
  let now=Date.parse('2026-11-15T00:00:00.000Z');const fixture=await runtimeFixture(t,{clock:()=>new Date(now)});fixture.behavior.loseAdmission=true;const attempt=await fixture.attempt();
  await fixture.tick();let row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.state,'unknown');assert.ok(row.admissionSentAt);assert.equal(row.runId,null);
  now+=86400000;await fixture.tick('again');await fixture.reopen();await fixture.tick('after-restart');
  row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.state,'unknown');
  assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);assert.equal(fixture.runs.size,1);
  assert.throws(()=>fixture.core.resolve(fixture.projectId,row.id,{outcome:'failed',acknowledgeUncertainSideEffects:false,evidence:[{kind:'manual',reference:'synthetic inspection'}]},'bad-resolution'),{code:'invalid_resolution'});
  await assert.rejects(fixture.core.retry(fixture.projectId,row.id,{instructions:'retry'},'bad-retry'),{code:'invalid_transition'});
});

test('TC-003: crash after irreversible sent marker causes unknown with zero network admission',async t=>{
  const fixture=await runtimeFixture(t);const attempt=await fixture.attempt();
  fixture.core.store.markAdmission(fixture.projectId,attempt.id,{request:attempt.request,admissionDeadline:'2000-01-01T00:00:00.000Z',gatewayIdentity:await fixture.gateway.identity()});
  await fixture.reopen();await fixture.tick();
  assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).state,'unknown');assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,0);
});

test('TC-003: graceful shutdown drains in-flight admission before releasing process lifetime lock',{timeout:10000},async t=>{
  const fixture=await runtimeFixture(t),attempt=await fixture.attempt();await fixture.runtime.close();
  let entered,release;const sent=new Promise(resolve=>{entered=resolve;}),barrier=new Promise(resolve=>{release=resolve;});
  const gateway=createHermesGateway({home:fixture.root,env:{},url:fixture.gatewayUrl,key:'synthetic-core-key'});
  const runtime=await createCoreRuntime({store:fixture.core.store,home:fixture.root,env:{},gateway:{...gateway,async submitRun(){entered();await barrier;throw new Error('Synthetic lost admission');}}});
  const contender=createExecutionOwner({home:fixture.root,env:{}});
  try{
    runtime.requestReconcile('drain');await sent;assert.ok(fixture.core.getAttempt(fixture.projectId,attempt.id).admissionSentAt);
    const closing=runtime.close();let secondResolved=false;const repeated=runtime.close().then(()=>{secondResolved=true;});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(secondResolved,false,'Concurrent close must await the same in-flight drain.');
    assert.equal(contender.acquire(),false);release();await Promise.all([closing,repeated]);assert.equal(contender.acquire(),true);
    assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,0);
  }finally{release();await runtime.close();contender.close();}
});

test('TC-003: one tick admits at most one, queued stop and paused enrollment never admit',async t=>{
  const fixture=await runtimeFixture(t,{limits:{active:4}}),first=await fixture.attempt('First'),second=await fixture.attempt('Second');await fixture.tick();
  assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,1);
  const queued=[first,second].find(attempt=>fixture.core.getAttempt(fixture.projectId,attempt.id).state==='queued');fixture.core.stop(fixture.projectId,queued.id,{},'queued-stop');await fixture.tick('after-stop');assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,1);
  const third=await fixture.attempt('Third');await fixture.core.enroll(fixture.projectId,third.taskId,{enabled:false},'pause-third');await fixture.tick('after-pause');assert.equal(fixture.core.getAttempt(fixture.projectId,third.id).state,'cancelled');assert.equal(fixture.requests.filter(row=>row.url==='/v1/runs').length,1);
});

test('TC-003: failed owner diagnostic transaction releases acquired lock on startup',async t=>{
  const fixture=await runtimeFixture(t);await fixture.runtime.close();
  fixture.core.store.sql.exec("CREATE TRIGGER synthetic_owner_failure BEFORE UPDATE ON ned_core_owner BEGIN SELECT RAISE(ABORT,'synthetic diagnostic failure'); END");
  await assert.rejects(createCoreRuntime({store:fixture.core.store,home:fixture.root,env:{},gateway:createHermesGateway({home:fixture.root,env:{},url:fixture.gatewayUrl,key:'synthetic-core-key'})}));
  const contender=createExecutionOwner({home:fixture.root,env:{}});try{assert.equal(contender.acquire(),true);}finally{contender.close();}
  fixture.core.store.sql.exec('DROP TRIGGER synthetic_owner_failure');
});

test('TC-003: nondurable or too-short provider capability fails closed before session or admission',async t=>{
  for(const capability of [{supported:false,durable:true,retention_seconds:3600},{supported:true,durable:false,retention_seconds:3600},{supported:true,durable:true,retention_seconds:60}])await t.test(JSON.stringify(capability),async t=>{
    const fixture=await runtimeFixture(t);fixture.behavior.capability=capability;const attempt=await fixture.attempt();await fixture.tick();
    const row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.state,'failed');assert.equal(row.errorCode,'unsupported_gateway');assert.equal(fixture.runs.size,0);assert.equal(fixture.sessions.size,0);
    assert.ok(await fixture.core.createTask(fixture.projectId,{title:'Task APIs remain usable'},'usable'));
  });
});

test('TC-003: definitive rejections fail, ambiguous gateway statuses remain unknown without replay',async t=>{
  for(const status of [400,401,403,502,503,504])await t.test(String(status),async t=>{
    const fixture=await runtimeFixture(t);fixture.behavior.admissionStatus=status;const attempt=await fixture.attempt();await fixture.tick();await fixture.tick('repeated');
    const row=fixture.core.getAttempt(fixture.projectId,attempt.id);assert.equal(row.state,status<500?'failed':'unknown');assert.equal(fixture.requests.filter(request=>request.url==='/v1/runs').length,1);
  });
});

test('TC-003: lost known-session response recovers exact session while conflicting identity never dispatches',async t=>{
  for(const conflict of [false,true])await t.test(String(conflict),async t=>{
    const fixture=await runtimeFixture(t);fixture.behavior.loseSession=true;fixture.behavior.conflictSession=conflict;const attempt=await fixture.attempt();await fixture.tick();
    assert.equal(fixture.sessions.size,1);assert.equal(fixture.runs.size,conflict?0:1);assert.equal(fixture.core.getAttempt(fixture.projectId,attempt.id).state,conflict?'unknown':'running');
    assert.equal(fixture.requests.filter(request=>request.url==='/api/sessions').length,1);
  });
});

test('TC-003: private owner refuses symlink lock storage',async t=>{
  if(process.platform==='win32')return;
  const home=await mkdtemp(path.join(tmpdir(),'ned-core-owner-'));t.after(()=>rm(home,{recursive:true,force:true}));
  await mkdir(path.join(home,'.ned/core'),{recursive:true,mode:0o700});
  await symlink(path.join(home,'other.sqlite'),path.join(home,'.ned/core/execution-lock.sqlite'));
  assert.throws(()=>createExecutionOwner({home,env:{}}));
});
