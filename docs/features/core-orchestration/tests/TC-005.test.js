import test from 'node:test';
import assert from 'node:assert/strict';
import {domainFixture} from './domain-fixture.js';
import {createCoreService} from '../../../../apps/core/src/service.js';

test('TC-005: pending occurrences retain requested template and canonical input across edits and restart',async t=>{
  const {core,projectId,databasePath}=await domainFixture(t);
  const definition=await core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Original template',description:'Original body'}},overlapPolicy:'skip'},'snapshot-definition');
  await core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'snapshot-enable');
  const occurrence=core.trigger(projectId,definition.id,{},'snapshot-trigger');
  await core.updateAutomation(projectId,definition.id,{revision:2,enabled:true,target:{template:{title:'Future template',description:'Future body'}}},'snapshot-edit');
  const reopened=await createCoreService({databasePath});t.after(()=>reopened.close());
  assert.deepEqual(reopened.trigger(projectId,definition.id,{},'snapshot-trigger'),occurrence);
  const result=reopened.store.materializeDue();
  assert.equal(reopened.getAttempt(projectId,result[0].attemptId).request.input,'Original template\n\nOriginal body');
  assert.equal(reopened.listOccurrences(projectId,definition.id).data[0].definitionRevision,2);
  reopened.stop(projectId,result[0].attemptId,{},'snapshot-stop');
  reopened.trigger(projectId,definition.id,{},'future-trigger');
  const future=reopened.store.materializeDue();assert.equal(reopened.getAttempt(projectId,future[0].attemptId).request.input,'Future template\n\nFuture body');
  const task=await reopened.createTask(projectId,{title:'Fixed title',description:'Original fixed body'},'fixed-task');await reopened.enroll(projectId,task.id,{enabled:true},'fixed-enroll');
  const fixed=await reopened.createAutomation(projectId,{kind:'manual',target:{taskId:task.id},overlapPolicy:'skip'},'fixed-definition');await reopened.updateAutomation(projectId,fixed.id,{revision:1,enabled:true},'fixed-enable');reopened.trigger(projectId,fixed.id,{},'fixed-trigger');
  reopened.store.sql.prepare('UPDATE ned_work_items SET description=? WHERE project_id=? AND id=?').run('Edited body',projectId,task.id);
  const fixedResult=reopened.store.materializeDue();assert.equal(reopened.getAttempt(projectId,fixedResult[0].attemptId).request.input,'Fixed title\n\nOriginal fixed body');
});

test('TC-005: partial target and schedule patches preserve enabled state with strict client booleans',async t=>{
  const {core,projectId}=await domainFixture(t);
  for(const enabled of [false,true]){
    let row=await core.createAutomation(projectId,{kind:'interval',intervalSeconds:60,target:{template:{title:'Initial'}},overlapPolicy:'skip'},`partial-create-${enabled}`);
    if(enabled)row=await core.updateAutomation(projectId,row.id,{revision:row.revision,enabled:true},'enable-partial');
    const patch={revision:row.revision,target:{template:{title:'Updated'}}};
    const updated=await core.updateAutomation(projectId,row.id,patch,'partial-target');assert.equal(updated.enabled,enabled);
    assert.equal(core.listAutomations(projectId).data.find(item=>item.id===row.id).enabled,enabled);
    assert.deepEqual(await core.updateAutomation(projectId,row.id,patch,'partial-target'),updated);
    const schedule=await core.updateAutomation(projectId,row.id,{revision:updated.revision,intervalSeconds:120},'partial-interval');assert.equal(schedule.intervalSeconds,120);assert.equal(Boolean(schedule.enabled),enabled);
    await assert.rejects(core.updateAutomation(projectId,row.id,{revision:schedule.revision,enabled:1},'invalid-bool'),{code:'invalid_automation'});
    await assert.rejects(core.updateAutomation(projectId,row.id,{revision:1,intervalSeconds:180},'stale-partial'),{code:'revision_conflict'});
  }
});

test('TC-005: legacy pending records without proven input snapshot settle skipped rather than executing current definition',async t=>{
  const {core,projectId,databasePath}=await domainFixture(t);
  const definition=await core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Must never infer this'}},overlapPolicy:'skip'},'legacy-definition');await core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'legacy-enable');
  for(const column of ['target_json','input_text','definition_revision','snapshot_error'])core.store.sql.exec(`ALTER TABLE ned_core_occurrences DROP COLUMN ${column}`);
  core.store.sql.prepare("INSERT INTO ned_core_occurrences(id,automation_id,scheduled_at,state) VALUES('legacy-pending',?,'synthetic-legacy','pending')").run(definition.id);
  const reopened=await createCoreService({databasePath});t.after(()=>reopened.close());
  const record=reopened.listOccurrences(projectId,definition.id).data[0];assert.equal(record.state,'skipped');assert.equal(record.reason,'snapshot_unavailable');
  assert.deepEqual(reopened.store.materializeDue(),[]);assert.equal(reopened.listAttempts(projectId).data.length,0);
  assert.equal(reopened.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_work_items').get().n,0);
  assert.ok(reopened.events(projectId).data.some(event=>event.eventType==='occurrence.skipped'&&event.payload.reason==='snapshot_unavailable'));
});

test('TC-005: interval scheduling is disabled by default, skips overlap and never floods missed intervals',async t=>{
  let time=Date.parse('2026-01-01T00:00:00Z');
  const {core,projectId}=await domainFixture(t,{clock:()=>new Date(time)});
  const definition=await core.createAutomation(projectId,{kind:'interval',intervalSeconds:60,target:{template:{title:'Recurring synthetic work'}},overlapPolicy:'skip'},'definition');
  time+=600000;assert.deepEqual(core.store.materializeDue(),[]);
  await core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'enable');
  assert.deepEqual(core.store.materializeDue(),[]);
  time+=60000;const first=core.store.materializeDue();assert.equal(first.length,1);assert.ok(first[0].attemptId);
  assert.deepEqual(core.store.materializeDue(),[]);
  time+=600000;const missed=core.store.materializeDue();assert.equal(missed.length,1);assert.equal(missed[0].reason,'overlap');
  assert.equal(core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_work_items').get().n,1);
  time-=600000;assert.deepEqual(core.store.materializeDue(),[]);
  const current=core.getAutomation(projectId,definition.id);await core.updateAutomation(projectId,definition.id,{revision:current.revision,enabled:false},'pause');time+=3600000;
  assert.deepEqual(core.store.materializeDue(),[]);
  await assert.rejects(core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'stale'),{code:'revision_conflict'});
});

test('TC-005: manual trigger replay, immutable UTF-8 snapshots and capacity fail closed without partial tasks',async t=>{
  const {core,projectId}=await domainFixture(t,{limits:{definitions:2}});
  await assert.rejects(core.createAutomation(projectId,{kind:'interval',intervalSeconds:59,target:{template:{title:'Invalid'}},overlapPolicy:'skip'},'invalid'),{code:'invalid_schedule'});
  const manual=await core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Manual'}},overlapPolicy:'skip'},'manual');
  await core.updateAutomation(projectId,manual.id,{revision:1,enabled:true},'enable');
  const occurrence=core.trigger(projectId,manual.id,{},'trigger');assert.deepEqual(core.trigger(projectId,manual.id,{},'trigger'),occurrence);
  core.store.materializeDue();assert.equal(core.listOccurrences(projectId,manual.id).data.length,1);
  const item=await core.createTask(projectId,{title:'x',description:'é'.repeat(8191)},'long');await core.enroll(projectId,item.id,{enabled:true},'long-enroll');
  const fixed=await core.createAutomation(projectId,{kind:'manual',target:{taskId:item.id},overlapPolicy:'skip'},'fixed');await core.updateAutomation(projectId,fixed.id,{revision:1,enabled:true},'fixed-enable');core.trigger(projectId,fixed.id,{},'fixed-trigger');
  const result=core.store.materializeDue();assert.equal(result[0].reason,'input_too_large');assert.equal(core.listAttempts(projectId).data.length,1);
  await assert.rejects(core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Over capacity'}},overlapPolicy:'skip'},'third'),{code:'capacity_exhausted'});
  assert.equal(core.listAutomations(projectId).data.length,2);
});

test('TC-005: pending watermark permits draining and low storage preserves readable control state',async t=>{
  let freeBytes=1024*1024*1024;
  const {core,projectId}=await domainFixture(t,{limits:{pending:1},storageProbe:()=>({fileBytes:0,freeBytes})});
  const definition=await core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Bounded'}},overlapPolicy:'skip'},'definition');
  await core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'enable');
  core.trigger(projectId,definition.id,{},'trigger');
  assert.equal(core.store.capacity().reason,'pending');
  const materialized=core.store.materializeDue();assert.equal(materialized.length,1);assert.ok(materialized[0].attemptId);
  assert.equal(core.store.capacity({effect:true}).available,true);
  freeBytes=1;
  assert.equal(core.store.capacity({effect:true}).reason,'freeBytes');
  assert.equal(core.getAttempt(projectId,materialized[0].attemptId).state,'queued');
  core.stop(projectId,materialized[0].attemptId,{},'stop');
  assert.equal(core.getAttempt(projectId,materialized[0].attemptId).state,'cancelled');
  freeBytes=1024*1024*1024;
  assert.equal(core.store.capacity().available,true);
});

test('TC-005: pausing an automation blocks pending materialization and queued admission until explicitly resumed',async t=>{
  const {core,projectId}=await domainFixture(t);
  const definition=await core.createAutomation(projectId,{kind:'manual',target:{template:{title:'Pause boundary'}},overlapPolicy:'skip'},'create');
  await core.updateAutomation(projectId,definition.id,{revision:1,enabled:true},'enable');
  core.trigger(projectId,definition.id,{},'trigger');
  await core.updateAutomation(projectId,definition.id,{revision:2,enabled:false},'pause-pending');
  assert.deepEqual(core.store.materializeDue(),[]);
  assert.equal(core.listAttempts(projectId).data.length,0);
  assert.equal(core.listOccurrences(projectId,definition.id).data[0].state,'pending');
  await core.updateAutomation(projectId,definition.id,{revision:3,enabled:true},'resume');
  const [materialized]=core.store.materializeDue();
  const attempt=core.getAttempt(projectId,materialized.attemptId);
  assert.equal(core.store.runtimeEligibility(attempt).eligible,true);
  await core.updateAutomation(projectId,definition.id,{revision:4,enabled:false},'pause-queued');
  assert.deepEqual(core.store.runtimeEligibility(attempt),{eligible:false,reason:'automation_disabled'});
  assert.equal(core.getAttempt(projectId,attempt.id).state,'queued');
});
