import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-052: Muse-style rail and project pane preserve chat and preview across collapse and mobile navigation',async t=>{
  const f=await browserChat(t,{existing:true,viewport:{width:1440,height:900},rows:[{id:'u',role:'user',content:'Help me plan the next release.'},{id:'a',role:'assistant',content:'We can review the remaining tasks and check the preview.'}]});await f.ready();const {page}=f;
  await expect(page.locator('.workspace-toolbar > button:visible')).toHaveCount(0);
  await expect(page.locator('#context-toggle')).toBeVisible();
  const box=async id=>page.locator('#'+id).boundingBox();
  const chatBefore=await box('chat'),context=await box('preview');
  assert.ok(chatBefore.width>720);assert.ok(context.width>=450&&context.width<=560);
  const rail=await page.locator('.navigation-choices').boundingBox();assert.equal(rail.width,64);assert.equal(rail.x,0);
  await f.draft.fill('Keep my draft');
  await page.evaluate(()=>globalThis.document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:'sample',itemId:'task',title:'Review task',projectName:'Sample'}})));
  await expect(page.locator('#chat-task-references')).toContainText('Review task');
  await page.locator('#preview-tab').click();await page.locator('#preview-panel').evaluate(node=>{node.dataset.retained='yes';});
  await page.locator('#context-close').click();await expect(page.locator('#preview')).toBeHidden();
  await expect(page.locator('#context-toggle')).toBeFocused();assert.ok((await box('chat')).width>chatBefore.width);
  await page.locator('#context-toggle').press('Enter');await expect(page.locator('#preview-panel')).toBeVisible();
  assert.equal(await page.locator('#preview-panel').getAttribute('data-retained'),'yes');await expect(f.draft).toHaveValue('Keep my draft');
  const prior=(await box('chat')).width;await page.locator('#pane-divider').focus();await page.locator('#pane-divider').press('ArrowLeft');assert.equal((await box('chat')).width,prior-16);
  await page.locator('#settings-shortcut').click();await expect(page.locator('#settings')).toBeVisible();
  await page.locator('#goals-shortcut').click();await expect(page.locator('#goals-panel')).toBeVisible();
  await page.locator('#context-toggle').click();await page.locator('#context-toggle').click();await expect(page.locator('#goals-panel')).toBeVisible();
  if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,'layout-1440.png')});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
    if(await page.locator('#preview').isVisible())await page.locator('#context-close').click();
    await expect(f.draft).toBeVisible();await expect(f.draft).toHaveValue('Keep my draft');assert.ok((await box('chat')).width>=width*.98);
    await expect(page.locator('#debug-toggle')).toBeHidden();
    await page.locator('#mobile-project-toggle').click();await expect(page.locator('#preview')).toBeVisible();await expect(page.locator('#left-pane')).toBeHidden();
    await page.locator('#context-close').click();await expect(f.draft).toBeVisible();await expect(page.locator('#mobile-project-toggle')).toBeFocused();
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
    if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,`layout-${width}.png`)});
  }
  for(const width of [1280,320]){
    await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
    await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));
    if(await page.locator('#preview').isHidden()){
      if(width<768){
        await page.locator('#mobile-project-toggle').click();
      }else await page.locator('#context-toggle').click();
    }
    await expect(page.locator('#preview')).toBeVisible();
    await page.evaluate(()=>{const sizes=[...globalThis.document.querySelectorAll('#app-shell *')].map(n=>[n,parseFloat(globalThis.getComputedStyle(n).fontSize)]);for(const [n,size]of sizes)if(Number.isFinite(size))n.style.fontSize=`${size*2}px`;});
    if(width<768)await expect(page.locator('#context-close')).toBeInViewport({ratio:1});
    else await expect(page.locator('#debug-toggle')).toBeInViewport({ratio:1});await expect(page.locator('#context-close')).toBeInViewport({ratio:1});
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
    await page.evaluate(()=>{for(const n of globalThis.document.querySelectorAll('#app-shell *'))n.style.removeProperty('font-size');});
  }
  await page.locator('#context-close').click();await expect(page.locator('#chat-task-references')).toContainText('Review task');
  await page.locator('#navigation-toggle').click();
  await page.locator('#debug-toggle').click();
  await expect(page.locator('#debug-pane')).toBeVisible();
  await page.locator('#debug-close').click();
  await expect(page.locator('#navigation-toggle')).toBeFocused();
  await expect(page.locator('#debug-toggle')).toBeHidden();
  assert.equal(f.turns.length,0);assert.deepEqual(f.errors,[]);
});
