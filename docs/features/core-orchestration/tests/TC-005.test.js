import test from 'node:test';
import assert from 'node:assert/strict';
import {domainFixture} from './domain-fixture.js';

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
