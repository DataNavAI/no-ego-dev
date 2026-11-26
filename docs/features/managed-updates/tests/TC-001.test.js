import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {createManagedMaintenance} from '../../../../apps/core/src/maintenance.js';

const id='11111111-1111-4111-8111-111111111111';
const intent={instanceId:id,generation:1,requestId:'22222222-2222-4222-8222-222222222222',targetImage:'registry.example/ned@sha256:'+'a'.repeat(64)};
async function fixture(t){const root=await mkdtemp(path.join(tmpdir(),'ned-idle-'));const cleanup=[];t.after(async()=>{for(const close of cleanup.reverse())await close();await rm(root,{recursive:true,force:true});});let now=1000;const options={databasePath:path.join(root,'ned.sqlite'),env:{NED_MANAGED_INSTANCE_ID:id,NED_MANAGED_GENERATION:'1'},clock:()=>now,inspectProcesses:()=>({idle:true})};const guard=createManagedMaintenance(options);cleanup.push(()=>guard.close());return {guard,options,cleanup,setTime(value){now=value;}};}

test('TC-001: five quiet minutes and no active work precede preparation; new work cancels it and committed barriers persist',async t=>{
 const f=await fixture(t);assert.equal(f.guard.prepare(intent).ready,false);f.setTime(301000);assert.equal(f.guard.status(intent).idle,true);const prepared=f.guard.prepare(intent);assert.equal(prepared.state,'prepared');assert.equal(prepared.ready,true);assert.deepEqual(f.guard.prepare(intent),prepared);
 const finish=f.guard.enter('chat');assert.equal(f.guard.commit(intent).ready,false);assert.equal(f.guard.status(intent).reason,'active_work');finish();f.setTime(601000);assert.equal(f.guard.prepare(intent).ready,true);const committed=f.guard.commit(intent);assert.equal(committed.state,'committed');assert.equal(committed.ready,true);assert.throws(()=>f.guard.enter('command'),{code:'instance_updating'});f.setTime(9999999);assert.throws(()=>f.guard.enter(),{code:'instance_updating'});
 const restarted=createManagedMaintenance(f.options);f.cleanup.push(()=>restarted.close());assert.equal(restarted.status(intent).state,'committed');assert.throws(()=>restarted.enter(),{code:'instance_updating'});assert.equal(restarted.release(intent).released,true);const release=restarted.enter('request');release();
});
test('TC-001: prepare expiry is advisory; stale, foreign and changed-target intents cannot mutate the current barrier',async t=>{
 const f=await fixture(t);f.setTime(301000);f.guard.prepare(intent);f.setTime(361001);assert.equal(f.guard.commit(intent).ready,false);f.setTime(661001);f.guard.prepare(intent);f.guard.commit(intent);
 for(const changed of [{...intent,generation:2},{...intent,instanceId:'33333333-3333-4333-8333-333333333333'},{...intent,requestId:'33333333-3333-4333-8333-333333333333'},{...intent,targetImage:'registry.example/ned@sha256:'+'b'.repeat(64)}]){assert.throws(()=>f.guard.release(changed));assert.equal(f.guard.status(intent).state,'committed');}
 const next=createManagedMaintenance({...f.options,env:{...f.options.env,NED_MANAGED_GENERATION:'2'}});f.cleanup.push(()=>next.close());const release=next.enter();release();assert.throws(()=>f.guard.enter(),{code:'maintenance_identity_changed'});
});
test('TC-001: unknown activity and process/provider work defer idle rather than claiming success',async t=>{
 const f=await fixture(t);f.setTime(301000);let busy=true;f.guard.addBusySource(()=>busy);assert.equal(f.guard.prepare(intent).reason,'active_work');busy=false;assert.equal(f.guard.prepare(intent).ready,true);f.guard.release(intent);
 const unknown=createManagedMaintenance({...f.options,inspectProcesses:()=>({idle:false,reason:'unknown_activity'})});f.cleanup.push(()=>unknown.close());f.setTime(601000);assert.equal(unknown.prepare(intent).reason,'unknown_activity');
});
test('TC-001: independent SQLite actors racing commit and work admission cannot both win',{timeout:15000},async t=>{
 const f=await fixture(t),shared=new SharedArrayBuffer(12),clock=new Int32Array(shared);clock[0]=1000;
 const workers=['work','commit'].map(role=>new Worker(new URL('./fixtures/lease-worker.js',import.meta.url),{workerData:{role,databasePath:f.options.databasePath,env:f.options.env,clock:shared,intent}}));f.cleanup.push(async()=>{Atomics.store(clock,2,1);Atomics.notify(clock,2);await Promise.all(workers.map(w=>w.terminate()));});
 const results=workers.map(worker=>{let ready;const started=new Promise(resolve=>{ready=resolve;});let done;const outcome=new Promise((resolve,reject)=>{done=resolve;worker.once('error',reject);});worker.on('message',message=>{if(message.ready)ready();else done(message);});return {started,outcome};});
 await Promise.all(results.map(x=>x.started));f.setTime(301000);Atomics.store(clock,0,301000);assert.equal(f.guard.prepare(intent).ready,true);Atomics.store(clock,1,1);Atomics.notify(clock,1);
 const [work,commit]=await Promise.all(results.map(x=>x.outcome));assert.equal(Number(work.entered)+Number(commit.committed),1);if(commit.committed)assert.throws(()=>f.guard.enter(),{code:'instance_updating'});Atomics.store(clock,2,1);Atomics.notify(clock,2);await Promise.all(workers.map(w=>new Promise(resolve=>{if(w.threadId===-1)resolve();else w.once('exit',resolve);})));
});


test('TC-001: pending drafts and standalone CLI admission cannot bypass a durable hosted barrier',async t=>{
 const f=await fixture(t),clientId='44444444-4444-4444-8444-444444444444';f.setTime(301000);
 f.guard.interaction({kind:'draft',clientId,hasDraft:true});assert.equal(f.guard.status(intent).reason,'pending_draft');
 f.guard.interaction({kind:'draft',clientId,hasDraft:false});assert.equal(f.guard.prepare(intent).ready,true);
 f.guard.interaction({kind:'interaction',clientId,hasDraft:false});assert.equal(f.guard.status(intent).state,'none');assert.equal(f.guard.status(intent).reason,'recent_activity');
 f.setTime(601000);f.guard.prepare(intent);f.guard.commit(intent);
 const cli=createManagedMaintenance({...f.options,env:{}});f.cleanup.push(()=>cli.close());assert.equal(cli.supported,false);assert.throws(()=>cli.enter('task'),{code:'instance_updating'});
 const unrelated=createManagedMaintenance({databasePath:path.join(path.dirname(f.options.databasePath),'other.sqlite'),env:{}});f.cleanup.push(()=>unrelated.close());const done=unrelated.enter('task');done();assert.equal(unrelated.status(intent).supported,false);
});
