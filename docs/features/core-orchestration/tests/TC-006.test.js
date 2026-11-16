import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import Database from 'better-sqlite3';
import {createTaskService} from '../../../../src/tasks.js';
import {loadOperatorCredential} from '../../../../src/core/auth.js';
import {syntheticProvider} from './e2e-provider.js';
import {openNedDatabase} from '../../../../src/database.js';
import {createCoreStore} from '../../../../src/core/store.js';
import {domainFixture} from './domain-fixture.js';

const executable=fileURLToPath(new URL('../../../../bin/ned.js',import.meta.url));

async function eventMatching(reader,predicate){
  const decoder=new TextDecoder();let pending='';
  while(true){
    const {value,done}=await reader.read();
    if(done)throw new Error('Metadata stream ended before checkpoint.');
    pending+=decoder.decode(value,{stream:true});
    let end;
    while((end=pending.indexOf('\n\n'))!==-1){
      const frame=pending.slice(0,end);pending=pending.slice(end+2);
      const line=frame.split('\n').find(row=>row.startsWith('data: '));
      if(line){const event=JSON.parse(line.slice(6));if(predicate(event))return event;}
    }
  }
}

test('TC-006: installed-shaped CLI and HTTP execute, verify, complete, replay metadata and restore isolated work',{timeout:20000},async testContext=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-core-e2e-'));
  testContext.after(()=>rm(root,{recursive:true,force:true}));
  const home=path.join(root,'runtime'),project=path.join(root,'project');await mkdir(project);await mkdir(home);
  const databasePath=path.join(home,'.ned','ned.sqlite');
  const taskService=await createTaskService({project,databaseUrl:databasePath,actor:'agent:ned-core'});
  testContext.after(()=>taskService.close());await taskService.initialize();
  const projectId=taskService.project.id;
  const foreignProject=path.join(root,'foreign');await mkdir(foreignProject);
  const foreign=await createTaskService({project:foreignProject,databaseUrl:databasePath,actor:'agent:ned-core'});
  testContext.after(()=>foreign.close());await foreign.initialize();
  const provider=await syntheticProvider(testContext);
  const env={PATH:process.env.PATH,NED_AGENT_HOME:home,NED_HERMES_URL:provider.url,NED_HERMES_API_KEY:'synthetic-e2e-provider-key'};
  const child=spawn(process.execPath,[executable,'core','serve','--port','0'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
  const closed=once(child,'close');let errors='',stdout='';child.stderr.on('data',chunk=>{errors+=chunk;});
  testContext.after(async()=>{if(child.exitCode===null){child.kill('SIGKILL');await closed;}});
  const url=await new Promise((resolve,reject)=>{
    child.once('error',reject);child.once('close',()=>reject(new Error(`Core exited before readiness: ${errors}`)));
    child.stdout.on('data',chunk=>{stdout+=chunk;const match=stdout.match(/NED Core: (http:\/\/127\.0\.0\.1:\d+)/);if(match)resolve(match[1]);});
  });
  const credential=loadOperatorCredential({home,env:{}});
  if(process.platform!=='win32')assert.equal((await stat(path.join(home,'.ned','core','operator-token'))).mode&0o777,0o600);
  const request=async(route,{method='GET',body,key,status=200}={})=>{
    const response=await fetch(url+'/api/core/v1'+route,{method,headers:{authorization:`Bearer ${credential}`,...(body===undefined?{}:{'content-type':'application/json','idempotency-key':key})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;
  };
  const scope=`/projects/${projectId}`;
  assert.equal((await request('/health')).data.status,'ok');
  const item=(await request(scope+'/tasks',{method:'POST',body:{title:'E2E isolated work'},key:'create'})).data;
  const taskPath=scope+`/tasks/${item.id}`;
  await request(taskPath+'/enrollment',{method:'PUT',body:{enabled:true},key:'enroll'});
  const attempt=(await request(taskPath+'/attempts',{method:'POST',body:{instructions:'PRIVATE_E2E_INSTRUCTIONS'},key:'attempt'})).data;
  const attemptPath=scope+`/attempts/${attempt.id}`;
  assert.equal(attempt.state,'queued');assert.equal(provider.requests.length,0);
  const abort=new AbortController();
  const metadata=await fetch(url+'/api/core/v1'+scope+'/events/stream',{headers:{authorization:`Bearer ${credential}`},signal:abort.signal});
  const reader=metadata.body.getReader();
  testContext.after(async()=>{abort.abort();await reader.cancel().catch(()=>{});});
  const subscriber=once(provider.events,'subscribed');
  const tick=(await request('/coordinator/reconcile',{method:'POST',body:{},key:'tick',status:202})).data;
  const [run]=await subscriber;
  await eventMatching(reader,event=>event.eventType==='attempt.admitted');
  assert.equal((await request('/coordinator/reconcile/'+tick.id)).data.state,'completed');
  assert.equal((await request(attemptPath)).data.runId,run.run_id);
  const observer=new Database(databasePath,{readonly:true});
  try{assert.deepEqual(observer.prepare('SELECT state,attempt_count AS attempts FROM ned_core_outbox WHERE attempt_id=?').get(attempt.id),{state:'admitted',attempts:1});}finally{observer.close();}
  const denied=await request(taskPath+'/complete',{method:'POST',body:{evidence:[{kind:'manual',reference:'not yet'}]},key:'early-done',status:409});
  assert.equal(denied.error.code,'verification_required');
  provider.complete(run.run_id,'PRIVATE_E2E_RESULT');
  const completed=await eventMatching(reader,event=>event.eventType==='attempt.completed');
  assert.equal((await request(attemptPath)).data.state,'awaiting_verification');
  assert.equal((await taskService.getItem(item.id)).status,'working');
  const result=(await request(attemptPath+'/result')).data;
  assert.equal(result.text,'PRIVATE_E2E_RESULT');
  await request(attemptPath+'/verify',{method:'POST',body:{accepted:true,evidence:[{kind:'test',reference:'e2e synthetic run'}]},key:'verify'});
  await request(taskPath+'/complete',{method:'POST',body:{evidence:[{kind:'test',reference:'e2e synthetic run'}]},key:'done'});
  assert.equal((await taskService.getItem(item.id)).status,'done');
  const settled=new Database(databasePath,{readonly:true});
  try{assert.deepEqual(settled.prepare('SELECT state,attempt_count AS attempts FROM ned_core_outbox WHERE attempt_id=?').get(attempt.id),{state:'settled',attempts:1});}finally{settled.close();}
  const cli=JSON.parse(execFileSync(process.execPath,[executable,'task','get',item.id,'--project',project,'--actor','agent:ned-core','--json'],{env,encoding:'utf8',cwd:root}));
  assert.equal(cli.id,item.id);assert.equal(cli.status,'done');
  const firstPage=await request(scope+'/events?limit=1');assert.equal(firstPage.data.length,1);
  const secondPage=await request(scope+'/events?limit=100&after='+firstPage.nextCursor);
  assert.ok(secondPage.data.every(event=>event.sequence>firstPage.data[0].sequence));
  await request(scope+'/events?limit=0',{status:400});await request(scope+'/events?limit=101',{status:400});
  await request(scope+'/events?after=malformed',{status:400});
  await request(`/projects/${foreign.project.id}/events?after=${completed.cursor}`,{status:400});
  await request(`/projects/${foreign.project.id}/attempts/${attempt.id}`,{status:404});
  const reconnectAbort=new AbortController();
  const reconnect=await fetch(url+'/api/core/v1'+scope+'/events/stream',{headers:{authorization:`Bearer ${credential}`,'last-event-id':completed.cursor},signal:reconnectAbort.signal});
  const reconnectReader=reconnect.body.getReader();
  try{const verified=await eventMatching(reconnectReader,event=>event.eventType==='attempt.verified');assert.ok(verified.sequence>completed.sequence);}finally{reconnectAbort.abort();await reconnectReader.cancel().catch(()=>{});}
  const metrics=await request(scope+'/metrics');
  const publicMetadata=JSON.stringify([firstPage,secondPage,metrics,completed]);
  for(const marker of ['PRIVATE_E2E_INSTRUCTIONS','PRIVATE_E2E_RESULT',credential,'synthetic-e2e-provider-key'])assert.equal(publicMetadata.includes(marker),false);
  assert.equal(provider.runs.size,1);assert.equal(provider.sessions.size,1);
  const submissions=provider.requests.filter(row=>row.method==='POST'&&row.path==='/v1/runs');
  assert.equal(submissions.length,1);assert.equal(submissions[0].body.session_id,attempt.sessionId);
  abort.abort();await reader.cancel().catch(()=>{});
  child.kill('SIGTERM');assert.deepEqual(await closed,[0,null]);assert.equal(errors,'');assert.equal(stdout.includes(credential),false);
  const backup=path.join(root,'backup.sqlite');
  const source=new Database(databasePath);try{await source.backup(backup);}finally{source.close();}
  const restored=new Database(backup,{readonly:true});
  try{assert.equal(restored.prepare('SELECT state FROM ned_work_items WHERE id=?').get(item.id).state,'done');assert.equal(restored.prepare('SELECT state FROM ned_core_attempts WHERE id=?').get(attempt.id).state,'succeeded');assert.equal(restored.prepare('SELECT version FROM ned_schema').get().version,1);}finally{restored.close();}
});

test('TC-006: unsupported additive migration rolls back without changing canonical work',async testContext=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-core-migration-'));
  testContext.after(()=>rm(root,{recursive:true,force:true}));
  const databasePath=path.join(root,'ned.sqlite');
  const database=openNedDatabase({databaseUrl:databasePath});testContext.after(()=>database.close());
  database.connection.exec('CREATE TABLE ned_core_schema(version INTEGER PRIMARY KEY); INSERT INTO ned_core_schema VALUES(2);');
  const before=database.connection.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  assert.throws(()=>createCoreStore({databasePath}),{code:'unsupported_schema'});
  assert.deepEqual(database.connection.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(),before);
  assert.equal(database.connection.prepare('SELECT version FROM ned_schema').get().version,1);
  assert.equal(database.connection.prepare('SELECT version FROM ned_core_schema').get().version,2);
  database.connection.exec('DROP TABLE ned_core_schema');
  const recovered=createCoreStore({databasePath});try{assert.equal(recovered.capacity().available,true);}finally{recovered.close();}
});

test('TC-006: retained-data and filesystem watermarks deny new work without deleting history',async testContext=>{
  for(const [limit,value,reason] of [['attempts',1,'attempts'],['events',1,'events'],['resultBytes',1048575,'resultBytes'],['fileBytes',1,'fileBytes'],['freeBytes',2048,'freeBytes']]){
    await testContext.test(reason,async testContext=>{
      let disk={fileBytes:0,freeBytes:4096};
      const fixture=await domainFixture(testContext,{limits:{[limit]:value,freeBytes:limit==='freeBytes'?value:0},storageProbe:()=>disk});
      const item=await fixture.core.createTask(fixture.projectId,{title:'Retained fixture'},'task');
      await fixture.core.enroll(fixture.projectId,item.id,{enabled:true},'enroll');
      if(limit==='attempts'){
        const first=await fixture.core.createAttempt(fixture.projectId,item.id,{instructions:'First retained attempt'},'first');
        fixture.core.stop(fixture.projectId,first.id,{},'stop');
      }
      if(limit==='fileBytes')disk={...disk,fileBytes:1};
      if(limit==='freeBytes')disk={...disk,freeBytes:2047};
      if(limit==='resultBytes'){
        assert.equal(fixture.core.store.capacity({reserveResult:true,effect:true}).reason,reason);
      }else{
        assert.equal(fixture.core.store.capacity().reason,reason);
        await assert.rejects(fixture.core.createAttempt(fixture.projectId,item.id,{instructions:'Do not execute'},'rejected'),{code:'capacity_exhausted'});
      }
      assert.equal((await fixture.task.getItem(item.id)).title,'Retained fixture');
      assert.ok(fixture.core.events(fixture.projectId).data.length>0);
    });
  }
});

test('TC-006: dispatch latency measures persisted admission time without payload telemetry',async testContext=>{
  let timestamp=Date.parse('2026-11-15T12:00:00Z');
  const fixture=await domainFixture(testContext,{clock:()=>new Date(timestamp)});
  const item=await fixture.core.createTask(fixture.projectId,{title:'Latency fixture'},'task');
  await fixture.core.enroll(fixture.projectId,item.id,{enabled:true},'enroll');
  const attempt=await fixture.core.createAttempt(fixture.projectId,item.id,{instructions:'PRIVATE_METRIC_INPUT'},'attempt');
  assert.deepEqual(fixture.core.metrics(fixture.projectId).dispatchLatencyMs,{count:0,average:null,maximum:null});
  timestamp+=1250;
  fixture.core.store.markAdmission(fixture.projectId,attempt.id,{request:attempt.request,admissionDeadline:new Date(timestamp+10000).toISOString(),gatewayIdentity:'synthetic'});
  const metrics=fixture.core.metrics(fixture.projectId);
  assert.deepEqual(metrics.dispatchLatencyMs,{count:1,average:1250,maximum:1250});
  assert.equal(JSON.stringify(metrics).includes('PRIVATE_METRIC_INPUT'),false);
});
