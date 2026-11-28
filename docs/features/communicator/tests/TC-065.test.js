import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';
test('TC-065: one compact Project row retains keyboard tabs, close and truthful empty Dashboard',async t=>{
 const f=await browserChat(t);await f.ready();const {page}=f;
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:760});await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
  if(await page.locator('#preview').isHidden())await page.locator('#mobile-project-toggle').click();
  await page.getByRole('tab',{name:'Dashboard',exact:true}).click();
  await expect(page.locator('.context-heading')).toHaveCount(0);await expect(page.locator('.dashboard-empty')).toBeVisible();
  const row=await page.locator('.preview-toolbar').boundingBox();assert.ok(row.height<=50);
  const close=page.locator('#context-close');await expect(close).toBeVisible();assert.ok((await close.boundingBox()).height>=44);
  await page.getByRole('tab',{name:'Dashboard',exact:true}).focus();await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:'Goals',exact:true})).toHaveAttribute('aria-selected','true');if(width>=768)await expect(page.getByRole('tab',{name:'Goals',exact:true})).toBeFocused();else await expect(page.locator('#goals-pane-heading')).toBeFocused();
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
  if(width<768)await close.click();
 }
 assert.deepEqual(f.errors,[]);
});

// Playwright normally hides scrollbar chrome, masking the native Linux defect.
test('TC-065: native scrollbar rendering leaves full tab targets and keyboard scrolling',async t=>{
 const f=await browserChat(t,{browserOptions:{ignoreDefaultArgs:['--hide-scrollbars']}});await f.ready();const {page}=f;
 for(const width of [390,320]){
  await page.setViewportSize({width,height:760});await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
  if(await page.locator('#preview').isHidden())await page.locator('#mobile-project-toggle').click();
  for(const name of ['Goals','Artifacts','Preview','Dashboard','Debug']){
   const tab=page.getByRole('tab',{name,exact:true});await tab.focus();await page.keyboard.press('Enter');
   await expect(tab).toHaveAttribute('aria-selected','true');
   await expect.poll(()=>tab.evaluate(node=>{const strip=node.parentElement,r=node.getBoundingClientRect(),p=strip.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.top+strip.clientHeight+1&&strip.scrollHeight<=strip.clientHeight+1&&r.height>=44;})).toBe(true);
  }
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
  await page.locator('#context-close').click();
 }
 assert.deepEqual(f.errors,[]);
});
