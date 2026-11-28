import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {domainFixture} from '../../core-orchestration/tests/domain-fixture.js';
import {readProjectWork} from '../../../../apps/core/src/work.js';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-062: Goals shows active work, blocker dependencies and a bound session with a return to main',{timeout:30000},async t=>{
  const row=(id,status,dependsOn=[])=>({id,title:id,status,type:'task',parentId:'goal',dependsOn});
  const startedAt=new Date(Date.now()-125000).toISOString();
  const items=[
    {id:'goal',title:'Release',status:'planned',type:'goal',parentId:null,dependsOn:[]},
    {...row('Build','working'),assignee:'agent:builder',sessions:[{sessionId:'build-session',attemptId:'attempt-one',role:'worker',startedAt}]},
    row('Review','blocked',['Build']),row('Publish','blocked',['Review']),row('Backlog','ready'),row('Archive','done'),
  ];
  let unavailable=false,reads=0;
  const {page,draft,ready,turns}=await browserChat(t,{
    existing:true,rows:[{id:'main-first',role:'assistant',content:'Main conversation'}],
    preparePage:async page=>{
      await page.route('**/api/v1/projects/work',route=>route.fulfill({json:{projects:[{id:'alpha',name:'Alpha',items}]}}));
      await page.route('**/api/v1/projects/alpha/tasks/Build/attempts/attempt-one/sessions/build-session/messages?offset=0',route=>{
        reads++;
        return route.fulfill(unavailable?{status:404,json:{}}:{json:{projectId:'alpha',sessionId:'build-session',data:[
          {id:'agent-first',role:'assistant',content:reads>1?'Agent update':'Agent is building'},
        ]}});
      });
    },
  });
  await ready();
  await draft.fill('Keep the main draft');
  await page.locator('#goals-pane-tab').click();
  const goals=page.locator('#goals-panel');
  const filter=goals.getByRole('checkbox',{name:'Show inactive tasks'});
  await expect(filter).not.toBeChecked();
  await expect(goals.getByRole('heading',{name:'Build',exact:true})).toBeVisible();
  await expect(goals.getByRole('heading',{name:'Review',exact:true})).toHaveCount(0);
  await expect(goals.getByRole('heading',{name:'Backlog',exact:true})).toHaveCount(0);
  await filter.check();
  const build=goals.locator('article').filter({has:page.locator('h4').getByText('Build',{exact:true})});
  const review=build.locator('.delivery-blocked article').filter({has:page.locator('h4').getByText('Review',{exact:true})});
  await expect(review.locator('.delivery-blocked').getByRole('heading',{name:'Publish'})).toBeVisible();
  await expect(goals.getByRole('heading',{name:'Review',exact:true})).toHaveCount(1);
  await expect(goals.getByRole('heading',{name:'Backlog',exact:true})).toBeVisible();
  const link=goals.getByRole('link',{name:'build-session'});
  await expect(goals.locator('.delivery-sessions time')).toHaveAttribute('datetime',startedAt);
  await expect(goals.locator('.delivery-sessions')).toContainText('2m elapsed');
  const evidence=process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'active-goals-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobile-goals-nav').click();
  await link.click();
  const chat=page.getByRole('region',{name:'Agent session'});
  await expect(chat).toContainText('agent:builder · build-session');
  await expect(chat).toContainText('Agent is building');
  await expect(draft).toBeHidden();
  await expect(chat).toContainText('Agent update',{timeout:10000});
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
  if(evidence)await page.screenshot({path:join(evidence,'agent-session-mobile.png')});
  await chat.getByRole('button',{name:'Back to main chat'}).click();
  await expect(chat).toBeHidden();
  await expect(draft).toHaveValue('Keep the main draft');
  await expect(page.locator('#transcript')).toContainText('Main conversation');
  unavailable=true;
  await page.locator('#mobile-goals-nav').click();
  await link.click();
  await expect(chat).toContainText('Agent session unavailable.');
  await chat.getByRole('button',{name:'Back to main chat'}).click();
  await expect(draft).toBeFocused();
  assert.equal(turns.length,0);
});


test('TC-062: work projection reports only bound running sessions and their recorded starts',async t=>{
  const {task,core,projectId,databasePath}=await domainFixture(t);
  const item=await core.createTask(projectId,{title:'Build'},'task');
  await core.enroll(projectId,item.id,{enabled:true},'enroll');
  const attempt=await core.createAttempt(projectId,item.id,{instructions:'Fixture'},'attempt');
  await task.startTask(item.id);
  const startedAt='2026-11-27T20:00:00.000Z';
  core.store.updateAttempt(projectId,attempt.id,{state:'running',admissionSentAt:startedAt});
  const relationship={gatewayIdentity:'fixture',profileIdentity:'fixture',workerIndex:0,expectedTitle:'fixture'};
  core.store.bind(projectId,attempt.id,{...relationship,sessionId:'root',role:'worker'});
  core.store.bind(projectId,attempt.id,{...relationship,sessionId:'child',role:'child',parentSessionId:'root'});
  core.store.recordAgentLifecycle(projectId,attempt.id,'child','subagent.start');
  const active=()=>readProjectWork(databasePath,projectId).items.find(row=>row.id===item.id).sessions;
  assert.deepEqual(active().map(({role,sessionId})=>[role,sessionId]),[['child','child'],['worker','root']]);
  assert.equal(active().find(value=>value.sessionId==='root').startedAt,startedAt);
  assert.ok(Number.isFinite(Date.parse(active().find(value=>value.sessionId==='child').startedAt)));
  core.store.recordAgentLifecycle(projectId,attempt.id,'child','subagent.complete');
  assert.deepEqual(active().map(value=>value.sessionId),['root']);
  core.store.updateAttempt(projectId,attempt.id,{state:'failed'});
  assert.deepEqual(active(),[]);
});
