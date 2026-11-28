import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {openNedDatabase} from '../../../../src/database.js';
import {createCoreStore} from '../../../../apps/core/src/store.js';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-059: Debug resets only the idle conversation and shows safe agent activity',async t=>{
  const fixture=await browserChat(t,{existing:true,rows:[{id:'previous',role:'assistant',content:'Previous transcript'}]});
  const {page,draft,turns,messages}=fixture;
  const db=openNedDatabase({databaseUrl:join(fixture.home,'ned.sqlite')});
  const store=createCoreStore({database:db});
  t.after(()=>db.close());
  const now=new Date().toISOString();
  // Synthetic rows describe one running attempt and a retained lifecycle event.
  store.sql.pragma('foreign_keys = OFF');
  store.sql.prepare(`INSERT INTO ned_core_attempts
    (id,project_id,task_id,number,role,state,dispatch_key,request_json,request_hash,created_at,updated_at)
    VALUES('attempt-active','project-example','task-example',1,'implementer','running','example',
    '{"private":"Hidden fixture payload"}','synthetic',?,?)`).run(now,now);
  store.sql.prepare(`INSERT INTO ned_core_events(project_id,entity_type,entity_id,event_type,payload_json,created_at)
    VALUES('project-example','attempt','attempt-finished','attempt.completed','{"private":"Hidden fixture payload"}',?)`).run(now);
  const debug=page.locator('#debug-pane');
  const reset=debug.getByRole('button',{name:'Reset chat session'});
  const openDebug=async()=>{if(await page.locator('#preview').isHidden())await page.locator('#context-toggle').click();await page.locator('#debug-tab').click();};
  const request=(path,body,token=fixture.accessToken)=>fetch(new URL('/api/v1/chat/'+path,page.url()),{
    method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{
      'Content-Type':'application/json',Origin:new URL(page.url()).origin}:{} )},...(body?{body:JSON.stringify(body)}:{}),
  });
  const confirm=accept=>page.once('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
  await fixture.ready();
  assert.equal((await request('activity',null,'')).status,401);
  await draft.fill('Draft to preserve on failure');
  await openDebug();
  await expect(debug).toContainText('implementer · running · task-example');
  await expect(debug).toContainText('attempt.completed · attempt-finished');
  await expect(debug).not.toContainText('Hidden fixture payload');
  confirm(false);await reset.click();
  assert.equal(fixture.network.filter(path=>path.endsWith('/sessions/reset')).length,0);
  await expect(draft).toHaveValue('Draft to preserve on failure');
  fixture.failNewSession(true);
  confirm(true);await reset.click();
  await expect(debug).toContainText('Could not confirm the reset');
  await expect(draft).toHaveValue('Draft to preserve on failure');
  fixture.failNewSession(false);
  await page.locator('#context-close').click();
  await draft.press('Enter');
  await expect.poll(()=>turns.length).toBe(1);
  await openDebug();
  await expect(reset).toBeDisabled();
  await expect(debug).toContainText('Chat reply · running');
  const existing={session_id:'nedcom-main'};
  assert.equal((await request('sessions/reset',existing)).status,409);
  turns[0].finish();
  await expect(reset).toBeEnabled();
  await page.locator('#context-close').click();
  await draft.fill('Discard on reset');
  let releaseUpload,uploadObserved;
  const holdUpload=new Promise(resolve=>{releaseUpload=resolve;});
  const firstUpload=new Promise(resolve=>{uploadObserved=resolve;});
  try{
    await page.route('**/sessions/nedcom-main/attachments',async route=>{
      uploadObserved();
      await holdUpload;
      await route.continue();
    },{times:1});
    await page.locator('#chat-files').setInputFiles([
      {name:'first.txt',mimeType:'text/plain',buffer:Buffer.from('Old first attachment')},
      {name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('Old second attachment')},
    ]);
    await firstUpload;
    await openDebug();
    await expect(reset).toBeDisabled();
  }finally{releaseUpload();}
  await expect(page.locator('#chat-attachments')).toContainText('second.txt · Ready');
  await expect(reset).toBeEnabled();
  const evidence=process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'debug-agent-activity.png')});
  confirm(true);await reset.click();
  await expect(debug).toContainText('Fresh chat ready.');
  await expect(draft).toHaveValue('');
  await expect(page.locator('#chat-attachments li')).toHaveCount(0);
  await expect(page.locator('#transcript')).not.toContainText('Previous transcript');
  assert.ok(messages.some(row=>row.content==='Previous transcript'));
  assert.equal((await request('sessions/reset',existing)).status,409);
  assert.equal((await request('sessions/nedcom-main/chat',{input:'Stale send'})).status,409);
  assert.equal(turns.length,1);
  await page.reload();
  await fixture.ready();
  await expect(page.locator('#transcript')).not.toContainText('Previous transcript');
  await fixture.send('Use the fresh session.');
  assert.equal(turns.length,2);
  assert.ok(!messages.some(row=>row.content==='Use the fresh session.'));
  const selected=await (await request('sessions/fixed',{})).json();
  const resetInput={session_id:selected.session.id};
  const concurrent=await Promise.all([request('sessions/reset',resetInput),request('sessions/reset',resetInput)]);
  assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,409]);
  assert.equal(store.sql.prepare("SELECT state FROM ned_core_attempts WHERE id='attempt-active'").get().state,'running');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobile-project-toggle').click();
  await page.locator('#debug-tab').click();
  await expect(debug).toContainText('implementer · running · task-example');
  await expect(reset).toBeVisible();
  if(evidence)await page.screenshot({path:join(evidence,'mobile-debug-agent-activity.png')});
  await page.locator('#context-close').click();
  await expect(page.locator('#mobile-project-toggle')).toBeFocused();
});
