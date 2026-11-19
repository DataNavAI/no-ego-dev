import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {domainFixture} from '../../core-orchestration/tests/domain-fixture.js';
import {trackedTime} from '../../../../apps/ned-core/src/delivery.js';
import {goalGroups,duration} from '../../../../apps/ned-com/src/public/goals-tasks.js';
import {readProjectWork} from '../../../../apps/ned-core/src/work.js';
import {createCommunicatorServer} from '../../../../apps/ned-com/src/server.js';
import {createHermesGateway} from '../../../../apps/ned-core/src/hermes.js';
import {loadOperatorCredential} from '../../../../apps/ned-core/src/auth.js';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-042: tracked intervals stop at blockers, resume once and never substitute task age',()=>{
  const event=(type,status,seconds)=>({type,value:JSON.stringify({status}),created_at:new Date(seconds*1000).toISOString()});
  const events=[event('created','ready',0),event('claimed','working',10),event('claimed','working',12),event('blocked','blocked',30),event('unblocked','working',50),event('completed','done',70)];
  assert.equal(trackedTime(events,90000),40);assert.equal(trackedTime(events.slice(0,5),60000),30);
  assert.equal(trackedTime(events.slice(0,1),90000),null);assert.equal(duration(null),'Not recorded');assert.equal(duration(3661),'1h 1m');
  const groups=goalGroups([{id:'goal',type:'goal',status:'planned'},{id:'sub',type:'subgoal',parentId:'goal'},{id:'active',type:'task',status:'working',parentId:'sub'},{id:'loose',type:'task',status:'ready'}]);
  assert.equal(groups[0].goal.id,'goal');assert.equal(groups[0].tasks[0].id,'active');assert.equal(groups[1].goal,null);
});

test('TC-042: delivery metadata is validated, idempotent, durable and project scoped over real HTTP',async t=>{
  const f=await domainFixture(t);const task=await f.core.createTask(f.projectId,{title:'Improve checkout',description:'Business impact fallback'},'task');
  const app=createCommunicatorServer({databasePath:f.databasePath,home:f.root,env:{}});await app.listen();t.after(()=>app.close());
  const path=`/api/core/v1/projects/${f.projectId}/tasks/${task.id}/delivery`;
  const credential=loadOperatorCredential({home:f.root,env:{}});
  const image=await sharp({create:{width:4,height:4,channels:3,background:'#fff'}}).png().toBuffer();
  const input={impact:'Reduce purchase abandonment.',remainingSeconds:1200,estimatedFinish:'2026-11-20T12:00:00.000Z',outputs:[{id:'brief',kind:'document',title:'Plan',text:'<script>never execute</script>\nShort plan'},{id:'screen',kind:'image',title:'Screenshot',image:`data:image/png;base64,${image.toString('base64')}`}]};
  const put=(body,key='delivery',auth=true)=>fetch(app.url+path,{method:'PUT',headers:{'content-type':'application/json','idempotency-key':key,...(auth?{authorization:`Bearer ${credential}`}:{})},body:JSON.stringify(body)});
  assert.equal((await put(input,'unauthorized',false)).status,401);
  const first=await put(input);assert.equal(first.status,200);const value=await first.json();
  assert.deepEqual(await(await put(input)).json(),value);
  assert.equal((await put({...input,remainingSeconds:1})).status,409);
  for(const invalid of [{...input,impact:'line\nbreak'},{...input,remainingSeconds:-1},{...input,estimatedFinish:'yesterday'},{...input,outputs:[{id:'bad',kind:'image',title:'Remote',image:'https://evil.invalid/a.png'}]},{...input,outputs:[{id:'bad',kind:'image',title:'SVG',image:'data:image/png;base64,PHN2Zz48L3N2Zz4='}]},{...input,secret:'not accepted'}])assert.equal((await put(invalid,JSON.stringify(invalid).length.toString())).status,400);
  const work=readProjectWork(f.databasePath,f.projectId).items.find(item=>item.id===task.id);assert.equal(work.delivery.remainingSeconds,1200);assert.equal(work.delivery.trackedSeconds,null);assert.equal(work.description,undefined);assert.equal(work.delivery.outputs.length,2);assert.equal(JSON.stringify(work).includes(image.toString('base64')),false);
  const base=`/api/projects/${f.projectId}/tasks/${task.id}`;
  const detail=await(await fetch(app.url+base)).json();assert.equal(detail.impact,input.impact);assert.equal(detail.outputs[0].text,input.outputs[0].text);assert.equal(detail.outputs[1].image,undefined);assert.deepEqual(detail.attempts,[]);
  const screenshot=await fetch(app.url+base+'/outputs/screen');assert.equal(screenshot.status,200);assert.equal((await sharp(Buffer.from(await screenshot.arrayBuffer())).metadata()).width,4);
  const doc=await fetch(app.url+base+'/outputs/brief');assert.ok(doc.headers.get('content-type').startsWith('text/plain'));assert.equal(await doc.text(),input.outputs[0].text);
  assert.equal((await fetch(app.url+base+'?offset=-1')).status,400);assert.equal((await fetch(app.url+base.replace(f.projectId,'foreign'))).status,404);assert.equal((await fetch(app.url+base+'/attempts/foreign')).status,404);
  assert.equal((await put({impact:'Replaced'},'replace')).status,200);assert.equal((await fetch(app.url+base+'/outputs/screen')).status,404);assert.equal(readProjectWork(f.databasePath,f.projectId).items[0].delivery.remainingSeconds,null);
});

test('TC-042: attempts paginate and only persisted same-gateway session bindings permit log reads',async t=>{
  let reads=0;
  const upstream=http.createServer((req,res)=>{reads++;res.setHeader('content-type','application/json');res.end(JSON.stringify({data:[{id:'msg',role:'assistant',content:'Visible session response'}]}));});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{upstream.close(resolve);upstream.closeAllConnections();}));
  const gateway={url:`http://127.0.0.1:${upstream.address().port}`,key:'synthetic-task-key'};
  const f=await domainFixture(t);const task=await f.core.createTask(f.projectId,{title:'Inspect attempts'},'task');
  await f.core.enroll(f.projectId,task.id,{enabled:true},'enable');
  const attempt=await f.core.createAttempt(f.projectId,task.id,{instructions:'Do not execute'},'attempt');
  const adapter=createHermesGateway({home:f.root,env:{},...gateway});const identity=await adapter.identity();await adapter.close();
  f.core.store.bind(f.projectId,attempt.id,{sessionId:'session-one',gatewayIdentity:identity,profileIdentity:'fixture',role:'worker',workerIndex:0,expectedTitle:'Fixture'});
  f.core.store.appendResult(f.projectId,attempt.id,'Visible recorded output');
  assert.equal(readProjectWork(f.databasePath,f.projectId).items[0].delivery.outputs[0].id,'attempt-result');
  await f.core.stop(f.projectId,attempt.id,{},'stop-original');
  for(let index=0;index<21;index++){const queued=await f.core.createAttempt(f.projectId,task.id,{instructions:'Do not execute'},`extra-${index}`);await f.core.stop(f.projectId,queued.id,{},`stop-${index}`);}
  const app=createCommunicatorServer({databasePath:f.databasePath,home:f.root,env:{},gateway});await app.listen();t.after(()=>app.close());
  const root=`/api/projects/${f.projectId}/tasks/${task.id}`;
  const attempts=await(await fetch(app.url+root)).json();assert.equal(attempts.attempts[0].number,22);assert.equal(attempts.attempts.length,20);assert.equal(attempts.nextOffset,20);
  const older=await(await fetch(app.url+root+'?offset=20')).json();assert.deepEqual(older.attempts.map(row=>row.number),[2,1]);assert.equal(older.nextOffset,null);
  assert.equal(await(await fetch(app.url+root+'/outputs/attempt-result')).text(),'Visible recorded output');
  const detail=await(await fetch(app.url+root+`/attempts/${attempt.id}`)).json();assert.equal(detail.attempt.sessions[0].sessionId,'session-one');
  const log=root+`/attempts/${attempt.id}/sessions/`;
  assert.equal((await fetch(app.url+log+'unbound/messages')).status,404);assert.equal(reads,0);
  const result=await fetch(app.url+log+'session-one/messages');assert.equal(result.status,200);assert.equal((await result.json()).data[0].content,'Visible session response');assert.equal(reads,1);
  f.core.store.sql.prepare('UPDATE ned_core_bindings SET gateway_identity=? WHERE attempt_id=?').run('changed',attempt.id);
  assert.equal((await fetch(app.url+log+'session-one/messages')).status,404);assert.equal(reads,1);
});

test('TC-042: compact task pane progressively discloses outputs and logs, preserving chat and project isolation',async t=>{
  const f=await browserChat(t);await f.ready();const {page}=f;
  const item=(id,type,status,parentId=null)=>({id,title:id,type,status,parentId,priority:2,createdAt:'2026-11-18',dependsOn:[]});
  const work={projectId:'alpha',items:[item('Launch','goal','planned'),{...item('Checkout','task','working','Launch'),delivery:{trackedSeconds:1440,remainingSeconds:1200,outputs:[{id:'brief',title:'Short plan',kind:'document'}]}},item('Review','task','ready','Launch'),item('Done','task','done','Launch')]};
  let release,hold=false,attemptState='running',resultText='Current result',failOlder=true;
  await page.route('**/api/projects',route=>route.fulfill({json:{projects:[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}]}}));
  await page.route('**/api/projects/*',route=>route.fulfill({json:{preview:{status:'unconfigured'}}}));
  await page.route('**/api/projects/*/work',route=>route.fulfill({json:route.request().url().includes('/alpha/')?work:{projectId:'beta',items:[]}}));
  await page.route('**/api/projects/alpha/tasks/Checkout?offset=*',async route=>{if(hold)await new Promise(resolve=>{release=resolve;});await route.fulfill({json:{projectId:'alpha',taskId:'Checkout',impact:'Reduce purchase abandonment.',outputs:[{id:'brief',title:'Short plan',kind:'document',text:'<script>not executable</script>\nMake payment easier.'}],attempts:[{id:'attempt',number:1,state:'running'}],nextOffset:null}});});
  await page.route('**/api/projects/alpha/tasks/Checkout/attempts/attempt',route=>route.fulfill({json:{projectId:'alpha',attempt:{state:attemptState,resultText,sessions:[{sessionId:'session',role:'worker',workerIndex:0}]}}}));
  await page.route('**/api/projects/alpha/tasks/Checkout/attempts/attempt/sessions/session/messages?offset=*',route=>{const offset=Number(new URL(route.request().url()).searchParams.get('offset'));if(offset===50&&failOlder){failOlder=false;return route.fulfill({status:503,json:{}});}return route.fulfill({json:{projectId:'alpha',data:offset===0?Array.from({length:50},(_,index)=>({id:`msg${index+50}`,role:'assistant',content:`Visible log message ${index+50}`})):[{id:'msg0',role:'assistant',content:'Older message'}]}});});
  await page.route('**/api/workspace/events',route=>route.fulfill({contentType:'text/event-stream',body:'data: {"projects":[{"id":"alpha","name":"Alpha"},{"id":"beta","name":"Beta"}]}\n\n'}));
  await page.reload();await f.ready();
  const select=id=>page.locator('#project').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change'));},id);
  await select('alpha');await f.draft.fill('Keep this draft');await page.locator('#goals-pane-tab').click();
  const panel=page.locator('#goals-panel');await expect(panel).toContainText('24m tracked · ~20m left');await expect(panel).toContainText('Finish not estimated');
  await expect(panel.getByText('Reduce purchase abandonment.')).toHaveCount(0);await expect(panel.locator('.delivery-completed article')).not.toBeVisible();
  await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR||tmpdir(),'goals-tasks-compact-1280.png')});
  await panel.locator('article').filter({has:page.getByRole('heading',{name:'Checkout',exact:true})}).locator('.delivery-details>summary').click();
  await expect(panel).toContainText('Reduce purchase abandonment.');await panel.getByText('Short plan',{exact:true}).last().click();await expect(panel.locator('pre').first()).toContainText('<script>not executable</script>');
  await panel.getByText('Attempt 1 · running',{exact:true}).click();await panel.getByRole('button',{name:'Session log · worker 0'}).click();await panel.getByText('assistant · msg50',{exact:true}).click();await expect(panel).toContainText('Visible log message 50');
  await panel.getByRole('button',{name:'Older session messages',exact:true}).click();await expect(panel.getByRole('button',{name:'Retry session log',exact:true})).toBeEnabled();await panel.getByRole('button',{name:'Retry session log',exact:true}).click();
  await expect(panel.locator('.task-session>details>summary')).toHaveText(['assistant · msg0',...Array.from({length:50},(_,index)=>`assistant · msg${index+50}`)]);
  await page.locator('#project').evaluate(node=>node.dispatchEvent(new Event('ned-work-refresh')));await expect(panel).toContainText('Visible log message');
  work.items[1].delivery.executionRevision='2';attemptState='succeeded';resultText='Updated recorded result';await page.locator('#project').evaluate(node=>node.dispatchEvent(new Event('ned-work-refresh')));await expect(panel).toContainText('Updated recorded result');
  await expect(f.draft).toHaveValue('Keep this draft');assert.equal(f.turns.length,0);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});if(width<768){await page.locator('#navigation-open').click();await page.locator('#preview-toggle').click();}await expect(panel).toBeVisible();assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);const tab=await page.locator('#goals-pane-tab').boundingBox(),toolbar=await page.locator('.preview-toolbar').boundingBox();assert.ok(tab.y+tab.height<=toolbar.y+toolbar.height+1,'tab fits in its toolbar');assert.equal(await page.locator('#goals-pane-tab').evaluate(node=>node.scrollHeight<=node.clientHeight),true);await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR||tmpdir(),`goals-tasks-${width}.png`)});}
  await page.setViewportSize({width:1280,height:900});hold=true;await select('beta');await select('alpha');await panel.locator('.delivery-details>summary').first().click();await expect.poll(()=>Boolean(release)).toBe(true);await select('beta');await expect(panel).toContainText('No goals or tasks yet.');release();await expect(panel).not.toContainText('Reduce purchase abandonment.');
  assert.deepEqual(f.errors,[]);
});
