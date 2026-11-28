import test from 'node:test';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-065: goal disclosures stay independent and keep their state and focus on refresh',{timeout:30000},async t=>{
  const goal=(id,title)=>({id,title,type:'goal',status:'planned',parentId:null,dependsOn:[]});
  const task=(id,title,parentId)=>({id,title,type:'task',status:'working',parentId,dependsOn:[]});
  const items=[goal('first','Release'),goal('second','Monitor'),
    task('build','Build the release','first'),task('check','Check uptime','second')];
  const {page,ready}=await browserChat(t,{preparePage:page=>page.route('**/api/v1/projects/work',route=>
    route.fulfill({json:{projects:[{id:'alpha',name:'Alpha',items}]}}))});
  await ready();
  await page.locator('#goals-pane-tab').click();
  const goals=page.locator('#goals-panel');
  const release=goals.getByRole('button',{name:'Release',exact:true});
  const monitor=goals.getByRole('button',{name:'Monitor',exact:true});
  const build=goals.getByRole('heading',{name:'Build the release'});
  const check=goals.getByRole('heading',{name:'Check uptime'});
  await expect(release).toHaveAttribute('aria-expanded','true');
  await expect(monitor).toHaveAttribute('aria-expanded','true');
  await expect(build).toBeVisible();
  await release.press('Enter');
  await expect(release).toHaveAttribute('aria-expanded','false');
  await expect(build).toBeHidden();
  await expect(check).toBeVisible();
  items[0].title='Release updated';
  items[2].title='Build the updated release';
  await page.locator('#project').evaluate(node=>node.dispatchEvent(new Event('ned-work-refresh')));
  const refreshed=goals.getByRole('button',{name:'Release updated',exact:true});
  const updated=goals.getByRole('heading',{name:'Build the updated release'});
  await expect(refreshed).toBeFocused();
  await expect(refreshed).toHaveAttribute('aria-expanded','false');
  await expect(updated).toBeHidden();
  await expect(check).toBeVisible();
  const evidence=process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'goals-collapsed-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobile-goals-nav').click();
  await expect(refreshed).toHaveAttribute('aria-expanded','false');
  await refreshed.click();
  await expect(updated).toBeVisible();
  await monitor.click();
  await expect(check).toBeHidden();
  await expect(updated).toBeVisible();
  if(evidence)await page.screenshot({path:join(evidence,'goals-expanded-mobile.png')});
});
