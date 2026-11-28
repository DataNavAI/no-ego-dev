import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';
const item=(id,type='task',status='ready',parentId=null)=>({id,title:id,type,status,parentId,priority:2,createdAt:'2026-11-07',dependsOn:[]});
const work={projectId:'alpha',items:[item('Launch','goal','planned'),item('Design','task','done','Launch'),item('Build','task','working','Launch'),item('Review','task','blocked','Launch')]};

test('TC-041: Goals retains work progress while Dashboard has only a project-specific server empty state',async t=>{
 const f=await browserChat(t);await f.ready();const {page}=f;
 await page.route('**/api/v1/projects',route=>route.fulfill({json:{projects:[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}]}}));
 await page.route('**/api/v1/projects/*',route=>route.fulfill({json:{preview:{status:'none'}}}));
 await page.route('**/api/v1/projects/work',route=>route.fulfill({json:{projects:[{id:'alpha',name:'Alpha',items:work.items}]}}));
 await page.route('**/api/v1/dashboards/*',route=>route.fulfill({json:{dashboard:null,revision:0}}));
 await page.reload();await f.ready();await f.draft.fill('Keep this draft');
 const select=id=>page.locator('#project').evaluate((node,id)=>{node.value=id;node.dispatchEvent(new Event('change'));},id);
 await select('alpha');await page.locator('#dashboard-tab').click();await expect(page.locator('#dashboard')).toContainText('No dashboard registered');await expect(page.locator('#dashboard .dashboard-summary')).toHaveCount(0);
 await page.locator('#goals-pane-tab').click();await expect(page.locator('#goals-panel')).toContainText('Build');await page.getByRole('button',{name:'Reference task: Build',exact:true}).click();await expect(page.locator('#chat-task-references')).toContainText('Build');
 await page.locator('#dashboard-tab').click();await page.locator('#preview-tab').click();await page.locator('#preview-panel').evaluate(node=>{node.dataset.sentinel='preserved';});await page.locator('#preview-tab').press('ArrowRight');await expect(page.locator('#dashboard')).toBeVisible();
 await select('beta');await expect(page.locator('#dashboard')).toContainText('No dashboard registered');await select('');await expect(page.locator('#dashboard')).toContainText('Choose a project');
 assert.equal(await page.locator('#preview-panel').getAttribute('data-sentinel'),'preserved');await expect(f.draft).toHaveValue('Keep this draft');assert.equal(f.turns.length,0);assert.deepEqual(f.errors,[]);
});

test('TC-041: progress counts executable leaves once and handles empty, completed and invalid graphs',async()=>{
  const {dashboardModel}=await import('../../../../apps/com/src/public/dashboard-model.js');
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


test('TC-041: repeated refreshes share a pending read and queue one follow-up read',async()=>{
  const {mountProjectWork}=await import('../../../../apps/com/src/public/project-work.js');
  const listeners=new Map(),requests=[];
  const node=()=>({replaceChildren(){},contains(){return false;},setAttribute(){},append(){},addEventListener(){},textContent:''});
  const project={value:'alpha',addEventListener(type,callback){listeners.set(type,callback);}};
  const container=node(),dashboard=node();
  const document={createElement:node,getElementById:id=>id==='project'?project:id==='project-work'?container:dashboard,addEventListener(){}};
  mountProjectWork({document,fetch:url=>new Promise(resolve=>requests.push({url,resolve}))});
  listeners.get('ned-work-refresh')();listeners.get('ned-work-refresh')();assert.equal(requests.length,1);
  assert.equal(requests[0].url,'/api/v1/projects/work');
  requests[0].resolve({ok:false,json:async()=>({})});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,2,'overlapping invalidations queue one follow-up read');
  requests[1].resolve({ok:false,json:async()=>({})});await new Promise(resolve=>setImmediate(resolve));
  listeners.get('ned-work-refresh')();assert.equal(requests.length,3,'failed read permits explicit recovery');
});
