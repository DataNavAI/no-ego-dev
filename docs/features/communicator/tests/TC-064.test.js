import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {createHermesGateway} from '../../../../apps/core/src/hermes.js';
import {domainFixture} from '../../core-orchestration/tests/domain-fixture.js';
import {createCommunicatorServer,fetch} from '../../ned-api/tests/auth-client.js';
import {browserChat,expect} from './browser-chat-fixture.js';
import {configuredModelSetup} from './model-fixture.js';

test('TC-064: project and task API verify a bound run instead of equating a claim with activity',async t=>{
  let state='running',sid='session-synthetic',code=200,reads=0;
  const gatewayServer=http.createServer((req,res)=>{
    assert.equal(req.url,'/v1/runs/run-synthetic');
    assert.equal(req.method,'GET');
    assert.equal(req.headers.authorization,'Bearer fake-hermes-key');
    reads++;
    res.writeHead(code,{'Content-Type':'application/json'});
    res.end(JSON.stringify({run_id:'run-synthetic',session_id:sid,status:state,output:'private synthetic output'}));
  });
  await new Promise(resolve=>gatewayServer.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{gatewayServer.close(resolve);gatewayServer.closeAllConnections();}));
  const gateway={url:`http://127.0.0.1:${gatewayServer.address().port}`,key:'fake-hermes-key'};
  const fixture=await domainFixture(t,{gateway});
  const {core,projectId,task,root,databasePath,project}=fixture;
  const adapter=createHermesGateway({home:root,env:{},...gateway});
  const identity=await adapter.identity();
  await adapter.close();
  const managed=await core.createTask(projectId,{title:'Verified task'},'managed');
  const orphan=await core.createTask(projectId,{title:'Previously claimed task'},'orphan');
  await task.startTask(orphan.id);
  await core.enroll(projectId,managed.id,{enabled:true},'enroll');
  const attempt=await core.createAttempt(projectId,managed.id,{instructions:'Synthetic'},'attempt');
  const startedAt='2026-11-28T08:00:00.000Z';
  core.store.updateAttempt(projectId,attempt.id,{state:'running',runId:'run-synthetic',gatewayIdentity:identity,sessionId:sid,admissionSentAt:startedAt});
  core.store.bind(projectId,attempt.id,{gatewayIdentity:identity,profileIdentity:identity,sessionId:sid,role:'worker',workerIndex:0,expectedTitle:'Fixture'});
  const app=createCommunicatorServer({modelSetup:configuredModelSetup(),databasePath,home:root,env:{},gateway});
  await app.listen();
  t.after(()=>app.close());
  const scoped=`/api/v1/projects/${projectId}/work`;
  async function read(path=scoped){
    const response=await fetch(app.url+path);
    assert.equal(response.status,200);
    const data=await response.json();
    assert.ok(!JSON.stringify(data).includes('private synthetic output'));
    assert.ok(!JSON.stringify(data).includes(identity));
    return data;
  }
  const map=rows=>new Map(rows.map(row=>[row.id,row]));
  const initial=map((await read()).items);
  assert.equal(initial.get(managed.id).status,'working');
  assert.deepEqual(initial.get(managed.id).sessions,[{attemptId:attempt.id,sessionId:sid,role:'worker',startedAt}]);
  assert.equal(initial.get(orphan.id).status,'claimed');
  assert.equal(initial.get(orphan.id).executionState,'unbound');
  assert.deepEqual(initial.get(orphan.id).sessions,[]);
  assert.equal(reads,1);
  for(const [nextState,responseCode,session,expected] of [
    ['queued',200,'session-synthetic','queued'],
    ['completed',200,'session-synthetic','inactive'],
    ['running',503,'session-synthetic','unverified'],
    ['running',200,'wrong-session','unverified'],
  ]){
    state=nextState;code=responseCode;sid=session;
    const {projects}=await read('/api/v1/projects/work');
    const item=map(projects.find(entry=>entry.id===projectId).items).get(managed.id);
    assert.equal(item.status,'claimed');
    assert.equal(item.claimStatus,'working');
    assert.equal(item.executionState,expected);
    assert.deepEqual(item.sessions,[]);
  }
  const result=await fetch(app.url+'/api/v1/task-management',{
    method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'test-read'},
    body:JSON.stringify({project,actor:'agent:ned-core',operation:'getItems',args:[]}),
  });
  assert.equal(result.status,200);
  assert.equal(map((await result.json()).data).get(managed.id).status,'claimed');
  assert.equal((await task.getItem(managed.id)).status,'working');
  const beforeMismatch=reads;
  core.store.updateAttempt(projectId,attempt.id,{gatewayIdentity:'not-the-gateway'});
  const mismatch=map((await read()).items).get(managed.id);
  assert.equal(mismatch.status,'claimed');
  assert.equal(reads,beforeMismatch);
});


test('TC-064: Goals updates from a live session to a claim without a task event',{timeout:20000},async t=>{
  let active=true,reads=0;
  const {page,ready}=await browserChat(t,{preparePage:page=>page.route('**/api/v1/projects/work',route=>{
    reads++;
    const task={id:'work-item',parentId:null,type:'task',title:'Follow this work',dependsOn:[],claimStatus:'working',
      status:active?'working':'claimed',executionState:active?'running':'inactive',
      sessions:active?[{attemptId:'attempt',sessionId:'live-session',role:'worker',startedAt:'2026-11-28T08:00:00.000Z'}]:[]};
    return route.fulfill({json:{projects:[{id:'fixture',name:'Fixture',items:[task]}]}});
  })});
  await ready();
  await page.locator('#goals-pane-tab').click();
  const goals=page.locator('#goals-panel');
  await expect(goals.getByRole('link',{name:'live-session'})).toBeVisible();
  active=false;
  const before=reads;
  await expect.poll(()=>reads,{timeout:8000}).toBeGreaterThan(before);
  await expect(goals.getByRole('link',{name:'live-session'})).toHaveCount(0);
  await expect(goals).toContainText('No task working now.');
  await goals.getByRole('checkbox',{name:'Show inactive tasks'}).check();
  await expect(goals).toContainText('Hermes run ended');
});
