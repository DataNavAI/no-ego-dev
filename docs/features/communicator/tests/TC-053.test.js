import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-053: grouped mobile header, direct Project and preserved chat use clear destinations',async t=>{
  const f=await browserChat(t,{existing:true,viewport:{width:390,height:844},rows:[...Array.from({length:24},(_,i)=>({id:'prior-'+i,role:'assistant',content:'Earlier project discussion '+i})),{id:'q',role:'user',content:'Help me review this project.'},{id:'a',role:'assistant',content:'Here is a short reply with a clear next step.'}]});await f.ready();const {page}=f;
  await expect(page.locator('.brand #current-model')).toBeVisible();
  await expect(page.locator('#mobile-project-toggle')).toHaveAccessibleName('Project');
  await expect(page.locator('#navigation-toggle')).toHaveAccessibleName('More');
  await f.draft.fill('Keep my draft');
  await page.evaluate(()=>globalThis.document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:'sample',itemId:'task',title:'Review task',projectName:'Sample'}})));
  const transcript=page.locator('#transcript');await transcript.evaluate(n=>{n.scrollTop=120;});await expect.poll(()=>transcript.evaluate(n=>n.scrollTop)).toBe(120);const scroll=await transcript.evaluate(n=>n.scrollTop);
  await page.locator('#mobile-project-toggle').click();await expect(page.locator('#preview')).toBeVisible();await expect(page.locator('#sidebar')).toBeHidden();
  await page.locator('#mobile-preview-nav').click();await page.locator('#preview-panel').evaluate(n=>{n.dataset.retained='yes';});
  await page.locator('#navigation-toggle').click();await page.locator('#artifacts-shortcut').click();await expect(page.locator('#artifacts-panel')).toContainText('Artifact');
  await page.locator('#context-close').click();await expect(page.locator('#mobile-project-toggle')).toBeFocused();
  await expect(f.draft).toHaveValue('Keep my draft');await expect(page.locator('#chat-task-references')).toContainText('Review task');assert.equal(await transcript.evaluate(n=>n.scrollTop),scroll);
  await page.locator('#mobile-project-toggle').click();assert.equal(await page.locator('#preview-panel').getAttribute('data-retained'),'yes');await page.locator('#context-close').click();
  await page.locator('#navigation-toggle').click();await expect(page.locator('#dashboard-shortcut')).toBeVisible();await expect(page.locator('#preview-toggle')).toBeHidden();await page.locator('#artifacts-shortcut').press('Escape');await expect(page.locator('#navigation-toggle')).toBeFocused();
  for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});
    await expect(page.locator('#mobile-project-toggle')).toBeInViewport({ratio:1});
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
    for(const id of ['chat-tools-toggle','chat-send']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.width>=44&&b.height>=44);}
    const color=await page.locator('.assistant-message').first().evaluate(n=>globalThis.getComputedStyle(n).backgroundColor);assert.equal(color,'rgba(0, 0, 0, 0)');
    if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,`mobile-organized-${width}.png`)});
  }
  assert.equal(f.turns.length,0);assert.deepEqual(f.errors,[]);
});

test('TC-053: empty mobile composer stays at the bottom with a long model label and enlarged text',async t=>{
  const f=await browserChat(t,{viewport:{width:320,height:740}});await f.ready();
  await f.page.locator('#current-model').evaluate(n=>{n.textContent='A very long configured provider/model name '.repeat(4);});
  const composer=await f.page.locator('.compose-dock').boundingBox(),nav=await f.page.locator('#mobile-bottom-nav').boundingBox();assert.ok(nav.y+nav.height>730);assert.ok(composer.y+composer.height<=nav.y&&composer.y+composer.height>=nav.y-16);
  await f.page.evaluate(()=>{const nodes=[...globalThis.document.querySelectorAll('#sidebar *')];const sizes=nodes.map(n=>[n,parseFloat(globalThis.getComputedStyle(n).fontSize)]);for(const [n,size]of sizes)n.style.fontSize=`${size*2}px`;});
  await expect(f.page.locator('#mobile-project-toggle')).toBeInViewport({ratio:1});await expect(f.page.locator('#navigation-toggle')).toBeInViewport({ratio:1});
  assert.equal(await f.page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
  await f.page.locator('#mobile-project-toggle').focus();await f.page.setViewportSize({width:1280,height:740});await expect(f.page.locator('#chat')).toBeFocused();
});
