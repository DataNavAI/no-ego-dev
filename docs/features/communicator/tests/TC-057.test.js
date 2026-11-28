import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-057: bottom destinations preserve conversation, preview and reachable More controls',async t=>{
 const f=await browserChat(t,{existing:true,viewport:{width:390,height:844},rows:[{id:'a',role:'assistant',content:'Here is the next step for your project.'}]});await f.ready();const {page}=f;
 const nav=page.locator('#mobile-bottom-nav');await expect(nav).toBeVisible();
 await f.draft.fill('Keep my mobile draft');await page.evaluate(()=>globalThis.document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:'fixture',itemId:'task',title:'Review layout',projectName:'Website'}})));
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  for(const control of [page.locator('#mobile-chat-nav'),page.locator('#mobile-goals-nav'),page.locator('#mobile-preview-nav'),page.locator('#navigation-toggle')]){const box=await control.boundingBox();assert.ok(box.width>=44&&box.height>=44);}
  const dock=await page.locator('.compose-dock').boundingBox(),bottom=await nav.boundingBox();assert.ok(dock.y+dock.height<=bottom.y,'composer must be above navigation');
 }
 await page.locator('#mobile-preview-nav').click();await expect(page.locator('#mobile-preview-nav')).toHaveAttribute('aria-current','page');await expect(page.locator('.preview-toolbar')).toBeVisible();await page.locator('#preview-panel').evaluate(n=>{n.dataset.retained='yes';});
 await page.locator('#mobile-goals-nav').click();await expect(page.locator('#goals-panel')).toBeVisible();
 await page.locator('#navigation-toggle').click();await page.locator('#dashboard-shortcut').click();await expect(page.locator('#dashboard')).toBeVisible();
 await page.locator('#navigation-toggle').click();await expect(page.locator('#artifacts-shortcut')).toBeVisible();await page.locator('#artifacts-shortcut').click();await expect(page.locator('#artifacts-panel')).toBeVisible();
 await page.locator('#navigation-toggle').click();await page.locator('#artifacts-shortcut').press('Escape');await expect(page.locator('#navigation-toggle')).toBeFocused();
 await page.locator('#mobile-chat-nav').click();await expect(f.draft).toHaveValue('Keep my mobile draft');await expect(page.locator('#chat-task-references')).toContainText('Review layout');assert.equal(await page.locator('#preview-panel').getAttribute('data-retained'),'yes');
 await f.draft.focus();await page.setViewportSize({width:390,height:390});await expect(nav).toBeHidden();await page.locator('#mobile-project-toggle').focus();await expect(nav).toBeVisible();
 await nav.evaluate(n=>{n.style.paddingBottom='28px';});await page.locator('#navigation-toggle').click();await expect.poll(async()=>{const menu=await page.locator('.navigation-choices').boundingBox(),bar=await nav.boundingBox();return menu.y+menu.height<=bar.y-4;}).toBe(true);await page.locator('#navigation-toggle').press('Escape');await nav.evaluate(n=>{n.style.paddingBottom='';});
 await page.locator('#mobile-preview-nav').focus();await page.setViewportSize({width:1280,height:900});await expect(nav).toBeHidden();await expect(page.locator('#chat')).toBeFocused();await expect(page.locator('.navigation-choices')).toBeVisible();
 assert.deepEqual(f.errors,[]);assert.equal(f.turns.length,0);
});
