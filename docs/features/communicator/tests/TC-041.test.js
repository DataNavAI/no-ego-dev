import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';
const item=(id,type='task',status='ready',parentId=null)=>({id,title:id,type,status,parentId,priority:2,createdAt:'2026-11-07',dependsOn:[]});
const work={projectId:'alpha',items:[item('Launch','goal','planned'),item('Design','task','done','Launch'),item('Build','task','working','Launch'),item('Review','task','blocked','Launch')]};

test('TC-041: dashboard preserves workspace state, refreshes progress and isolates delayed project data',async t=>{
  const f=await browserChat(t);await f.ready();const {page}=f;
  let snapshot=structuredClone(work),fail=false,hold=false,release;
  await page.route('**/api/projects',route=>route.fulfill({json:{projects:[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}]}}));
  await page.route('**/api/projects/*',route=>route.fulfill({json:{preview:{status:'available',url:'http://localhost:9999'}}}));
  await page.route('**/api/projects/*/work',async route=>{
    const id=new URL(route.request().url()).pathname.split('/')[3];const captured=structuredClone(snapshot);
    if(hold&&id==='alpha'){hold=false;await new Promise(resolve=>{release=resolve;});}
    await route.fulfill({status:fail?503:200,json:fail?{}:id==='alpha'?captured:{projectId:'beta',items:[]}});
  });
  await page.route('**/api/projects/*/activity',route=>route.fulfill({json:{projectId:'alpha',goal:null,task:null}}));
  await page.route('**/api/workspace/events',route=>route.fulfill({contentType:'text/event-stream',body:'data: {"projects":[{"id":"alpha","name":"Alpha"},{"id":"beta","name":"Beta"}]}\n\n'}));
  await page.reload();await f.ready();await expect(page.locator('#project option[value=alpha]')).toHaveCount(1);
  const select=async id=>page.locator('#project').evaluate((node,id)=>{node.value=id;node.dispatchEvent(new Event('change'));},id);
  const refresh=()=>page.locator('#project').evaluate(node=>node.dispatchEvent(new Event('ned-work-refresh')));
  await select('alpha');await f.draft.fill('Keep this draft');
  await expect(page.locator('#dashboard-tab')).toBeVisible();
  await page.locator('#dashboard-tab').click();
  await expect(page.locator('#dashboard')).toContainText('1 / 3 tasks completed');
  await expect(page.locator('#dashboard .work-title')).toHaveText(['Launch','Build','Review']);
  await page.locator('#dashboard .work-title').filter({hasText:'Build'}).click();
  await expect(page.locator('#chat-task-references')).toContainText('Build');
  await expect(f.draft).toHaveValue('Keep this draft');assert.equal(f.turns.length,0);
  await page.screenshot({path:'/tmp/ned-dashboard-open-1280.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('#navigation-open').click();await page.locator('#preview-toggle').click();
  await page.screenshot({path:'/tmp/ned-dashboard-open-390.png'});
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#dashboard-show-completed').check();await expect(page.locator('#dashboard .work-title')).toHaveText(['Launch','Build','Design','Review']);
  await page.locator('#preview-panel').evaluate(node=>{node.dataset.sentinel='preserved';});
  await page.locator('#dashboard-tab').press('ArrowLeft');await expect(page.locator('#preview-panel')).toBeVisible();
  await page.locator('#preview-tab').press('End');await expect(page.locator('#dashboard')).toBeVisible();
  assert.equal(await page.locator('#preview-panel').getAttribute('data-sentinel'),'preserved');
  snapshot.items.forEach(row=>{if(row.type==='task')row.status='done';});await refresh();
  await expect(page.locator('#dashboard')).toContainText('3 / 3 tasks completed');
  await page.locator('#dashboard-show-completed').uncheck();await expect(page.locator('#dashboard')).toContainText('All tasks completed.');
  hold=true;await refresh();await expect.poll(()=>Boolean(release)).toBe(true);await select('beta');
  await expect(page.locator('#dashboard')).toContainText('No goals or tasks yet.');release();
  await expect(page.locator('#dashboard')).not.toContainText('Launch');
  fail=true;await select('alpha');await expect(page.locator('#dashboard')).toContainText('Progress could not be loaded.');
  fail=false;await page.locator('#dashboard-retry').click();await expect(page.locator('#dashboard')).toContainText('3 / 3 tasks completed');
  await expect(f.draft).toHaveValue('Keep this draft');await expect(page.locator('#chat-task-references')).toContainText('Build');
  for(const width of [1280,390,320]){
    await page.setViewportSize({width,height:900});
    if(width<768){await page.locator('#navigation-open').click();await page.locator('#preview-toggle').click();}
    await expect(page.locator('#dashboard')).toBeVisible();
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
    await page.screenshot({path:`/tmp/ned-dashboard-${width}.png`});
  }
  assert.deepEqual(f.errors,[]);
});

test('TC-041: progress counts executable leaves once and handles empty, completed and invalid graphs',async()=>{
  const {dashboardModel}=await import('../../../../src/communicator/public/dashboard-model.js');
  const items=[item('goal','goal','planned'),item('sub','subgoal','planned','goal'),item('container','task','working','sub'),item('leaf','issue','done','container'),item('blocked','task','blocked','goal'),item('active','task','working'),item('empty','goal','planned')];
  const model=dashboardModel(items);
  assert.deepEqual([model.total,model.completed,model.active,model.blocked,model.openGoals],[3,1,1,1,2]);
  assert.equal(model.items.find(row=>row.id==='goal').status,'blocked');
  assert.deepEqual(model.progressById.get('goal'),{total:2,completed:1,active:0,blocked:1});
  assert.equal(dashboardModel([]).total,0);assert.equal(dashboardModel([item('done','task','done')]).completed,1);
  assert.equal(dashboardModel([item('empty','goal','done')]).openGoals,0);
  for(const invalid of [[item('a'),item('a')],[item('a','task','unknown')],[item('a','task','ready','missing')],[{...item('a'),dependsOn:['a']}],null])assert.throws(()=>dashboardModel(invalid));
  const hostile='<img src=x onerror=alert(1)>';assert.equal(dashboardModel([item(hostile)]).total,1);
});


test('TC-041: repeated refreshes share a pending read while project changes supersede it',async()=>{
  const {mountProjectWork}=await import('../../../../src/communicator/public/project-work.js');
  const listeners=new Map(),requests=[];
  const node=()=>({replaceChildren(){},contains(){return false;},setAttribute(){},append(){},addEventListener(){},textContent:''});
  const project={value:'alpha',addEventListener(type,callback){listeners.set(type,callback);}};
  const container=node(),dashboard=node();
  const document={createElement:node,getElementById:id=>id==='project'?project:id==='project-work'?container:dashboard};
  mountProjectWork({document,fetch:url=>new Promise(resolve=>requests.push({url,resolve}))});
  listeners.get('ned-work-refresh')();listeners.get('ned-work-refresh')();assert.equal(requests.length,1);
  project.value='beta';listeners.get('change')();assert.equal(requests.length,2);
  requests[0].resolve({ok:true,json:async()=>work});await new Promise(resolve=>setImmediate(resolve));
  listeners.get('ned-work-refresh')();assert.equal(requests.length,2,'superseded read cannot unlock the selected project read');
  requests[1].resolve({ok:false,json:async()=>({})});await new Promise(resolve=>setImmediate(resolve));
  listeners.get('ned-work-refresh')();assert.equal(requests.length,3,'failed read permits explicit recovery');
});
