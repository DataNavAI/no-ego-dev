import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {createTaskService} from '../../../../src/tasks.js';
import {createCoreService} from '../../../../apps/ned-core/src/service.js';
import {domainFixture} from './domain-fixture.js';

test('TC-002: removed project directories fail closed locally without disabling historical reads or healthy projects',async t=>{
  const {core,projectId,databasePath,root}=await domainFixture(t);
  const stalePath=path.join(root,'archived');await mkdir(stalePath);
  const staleTasks=await createTaskService({project:stalePath,databaseUrl:databasePath,actor:'agent:ned-core'});await staleTasks.initialize();
  const staleId=staleTasks.project.id;staleTasks.close();
  const before=await createCoreService({databasePath});
  const stale=await before.createTask(staleId,{title:'Archived work'},'archived-task');await before.enroll(staleId,stale.id,{enabled:true},'archived-enroll');
  const attempt=await before.createAttempt(staleId,stale.id,{instructions:'Must not dispatch'},'archived-attempt');
  const automation=await before.createAutomation(staleId,{kind:'manual',target:{template:{title:'Archived automation'}},overlapPolicy:'skip'},'archived-auto');await before.updateAutomation(staleId,automation.id,{revision:1,enabled:true},'archived-enable');before.trigger(staleId,automation.id,{},'archived-trigger');
  await rm(stalePath,{recursive:true});assert.deepEqual(before.store.runtimeEligibility(attempt),{eligible:false,reason:'project_unavailable'});await before.close();
  const reopened=await createCoreService({databasePath});t.after(()=>reopened.close());
  assert.equal(reopened.getAttempt(staleId,attempt.id).id,attempt.id);
  assert.ok(reopened.events(staleId).data.length>0);
  assert.equal(reopened.store.runtimeEligibility(attempt).eligible,false);
  const result=reopened.store.materializeDue();assert.equal(result[0].reason,'project_unavailable');
  assert.equal(reopened.listAttempts(staleId).data.length,1);
  reopened.stop(staleId,attempt.id,{},'archived-stop');assert.equal(reopened.getAttempt(staleId,attempt.id).state,'cancelled');
  const healthy=await reopened.createTask(projectId,{title:'Healthy work'},'healthy');assert.equal(healthy.title,'Healthy work');
  await assert.rejects(reopened.createTask(staleId,{title:'Do not recreate'},'invalid-project'),{code:'project_unavailable'});
  await assert.rejects(access(stalePath),{code:'ENOENT'});
  assert.equal(core.listProjects().data.length,2);
});

test('TC-002: explicit enrollment, concurrent reservation, idempotency and verification preserve canonical ownership',async t=>{
  const {core,task,projectId,databasePath}=await domainFixture(t);
  const item=await core.createTask(projectId,{title:'Synthetic work'},'task');
  await assert.rejects(core.createAttempt(projectId,item.id,{instructions:'Run synthetic fixture'},'unenrolled'),{code:'not_enrolled'});
  await core.enroll(projectId,item.id,{enabled:true},'enroll');
  const other=await createCoreService({databasePath});t.after(()=>other.close());
  const outcomes=await Promise.allSettled([core.createAttempt(projectId,item.id,{instructions:'Run synthetic fixture'},'first'),other.createAttempt(projectId,item.id,{instructions:'Other request'},'second')]);
  assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,1);
  assert.equal(outcomes.find(outcome=>outcome.status==='rejected').reason.code,'attempt_active');
  const attempt=outcomes[0].value;
  assert.deepEqual(await core.createAttempt(projectId,item.id,{instructions:'Run synthetic fixture'},'first'),attempt);
  await assert.rejects(core.createAttempt(projectId,item.id,{instructions:'changed'},'first'),{code:'idempotency_conflict'});
  assert.equal(core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_attempts').get().n,1);
  assert.equal((await task.getItem(item.id)).assignee,'agent:ned-core');
  await assert.rejects(task.completeTask(item.id),{code:'verification_required'});
  core.store.updateAttempt(projectId,attempt.id,{state:'awaiting_verification'});
  await assert.rejects(task.completeTask(item.id),{code:'verification_required'});
  core.verify(projectId,attempt.id,{accepted:true,evidence:[{kind:'test',reference:'synthetic acceptance passed'}]},'verify');
  assert.equal((await task.getItem(item.id)).status,'working');
  await core.complete(projectId,item.id,{evidence:[{kind:'review',reference:'synthetic independent review'}]},'complete');
  assert.equal((await task.getItem(item.id)).status,'done');
  const unmanaged=await task.createItem('task',{title:'Legacy'});await task.startTask(unmanaged.id);await task.completeTask(unmanaged.id);
  assert.equal((await task.getItem(unmanaged.id)).status,'done');
});

test('TC-002: validation boundaries and session bindings cannot transfer identities',async t=>{
  const {core,projectId}=await domainFixture(t);
  const item=await core.createTask(projectId,{title:'Boundary'},'task');await core.enroll(projectId,item.id,{enabled:true},'enroll');
  await assert.rejects(core.createAttempt(projectId,item.id,{instructions:'a'.repeat(16385)},'oversized'),{code:'invalid_instructions'});
  await assert.rejects(core.createAttempt(projectId,item.id,{instructions:'a'},'a'.repeat(129)),{code:'invalid_idempotency_key'});
  const attempt=await core.createAttempt(projectId,item.id,{instructions:'a'.repeat(16384)},'a'.repeat(128));
  const binding={gatewayIdentity:'gateway-a',profileIdentity:'profile-a',sessionId:'session-a',role:'worker',workerIndex:0,expectedTitle:'ned.synthetic'};
  core.store.bind(projectId,attempt.id,binding);
  assert.throws(()=>core.store.bind(projectId,attempt.id,{...binding,sessionId:'session-b'}),{code:'binding_conflict'});
  assert.throws(()=>core.store.bind(projectId,attempt.id,{...binding,sessionId:'child',role:'child',parentSessionId:'foreign'}),{code:'binding_conflict'});
  await core.enroll(projectId,item.id,{enabled:false},'pause');
  assert.deepEqual(core.store.runtimeEligibility(attempt),{eligible:false,reason:'enrollment_disabled'});
  core.stop(projectId,attempt.id,{},'stop');
  assert.equal(core.getAttempt(projectId,attempt.id).state,'cancelled');
});

test('TC-002: attempts recheck blockers, foreign ownership and project isolation without claims',async t=>{
  const {core,task,projectId}=await domainFixture(t);
  const prerequisite=await task.createItem('task',{title:'Prerequisite'});
  const blocked=await task.createItem('task',{title:'Blocked'});await task.addDependency(blocked.id,prerequisite.id);
  await core.enroll(projectId,blocked.id,{enabled:true},'enroll-blocked');
  await assert.rejects(core.createAttempt(projectId,blocked.id,{instructions:'Must not run'},'blocked'),{code:'not_ready'});
  assert.equal((await task.getItem(blocked.id)).assignee,null);
  assert.equal(core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_attempts').get().n,0);
  await assert.rejects(core.createAttempt('foreign-project',blocked.id,{instructions:'Must not leak'},'foreign'),{code:'not_found'});
  assert.throws(()=>core.events(projectId,{after:Buffer.from(JSON.stringify({v:1,kind:'events',projectId:'foreign',sequence:0})).toString('base64url')}),{code:'invalid_cursor'});
});

test('TC-002: independent processes racing one enrolled task persist exactly one attempt and claim event',{timeout:10000},async t=>{
  const {core,projectId,databasePath}=await domainFixture(t);
  const item=await core.createTask(projectId,{title:'Process race'},'task');await core.enroll(projectId,item.id,{enabled:true},'enroll');
  function racer(key){
    const child=fork(new URL('./domain-racer.js',import.meta.url),[databasePath,projectId,item.id,key],{stdio:['ignore','ignore','pipe','ipc']});
    t.after(async()=>{if(child.exitCode===null){const closed=once(child,'close');child.kill();await closed;}});
    let readyResolve,resultResolve,rejectResult;
    const ready=new Promise(resolve=>{readyResolve=resolve;});
    const result=new Promise((resolve,reject)=>{resultResolve=resolve;rejectResult=reject;});
    child.on('message',message=>{if(message.ready)readyResolve();else resultResolve(message);});
    child.on('error',rejectResult);child.on('exit',code=>{if(code)rejectResult(new Error(`Race process exited ${code}`));});
    return {child,ready,result};
  }
  const first=racer('first-process'),second=racer('second-process');
  await Promise.all([first.ready,second.ready]);
  first.child.send({go:true});second.child.send({go:true});
  const results=await Promise.all([first.result,second.result]);
  assert.equal(results.filter(result=>result.ok).length,1);
  assert.equal(results.find(result=>!result.ok).code,'attempt_active');
  assert.equal(core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_attempts').get().n,1);
  assert.equal(core.store.sql.prepare("SELECT COUNT(*) AS n FROM ned_task_events WHERE item_id=? AND type='claimed'").get(item.id).n,1);
});
