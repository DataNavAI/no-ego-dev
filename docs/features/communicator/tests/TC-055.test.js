import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-055: desktop project content has useful width, single-row tabs and reachable narrow-pane states',async t=>{
 const f=await browserChat(t,{existing:true,viewport:{width:1280,height:900}});await f.ready();const {page}=f;
 const context=await page.locator('#preview').boundingBox(),chat=await page.locator('#chat').boundingBox();
 assert.ok(context.width>=450&&context.width<=560,'default project pane should have room for content');assert.ok(chat.width>=600,'chat remains usable');
 const rows=()=>page.locator('.canvas-tabs').evaluate(n=>new Set([...n.children].map(c=>Math.round(c.getBoundingClientRect().top))).size);
 assert.equal(await rows(),1,'desktop tabs never wrap into a second row');
 await f.draft.fill('Keep this desktop draft');
 await page.locator('#preview-tab').click();
 const card=await page.locator('.preview-state').boundingBox(),toolbar=await page.locator('.preview-toolbar').boundingBox();
 assert.ok(card.y>=toolbar.y+toolbar.height&&card.y<toolbar.y+toolbar.height+80,'preview state is anchored near its toolbar');
 assert.ok(card.x>=context.x&&card.x+card.width<=context.x+context.width,'state stays within its pane');
 await page.locator('#pane-divider').focus();await page.locator('#pane-divider').press('End');
 assert.equal(await rows(),1,'minimum pane width retains a single scrollable tab row');
 await page.locator('#goals-pane-tab').focus();await page.locator('#goals-pane-tab').press('End');
 await expect(page.locator('#debug-tab')).toBeFocused();await expect(page.locator('#debug-tab')).toBeInViewport({ratio:1});await expect(page.locator('#debug-pane')).toBeVisible();
 for(const id of ['goals-pane-tab','artifacts-pane-tab','preview-tab','dashboard-tab','debug-tab']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.height>=44&&b.width>=44);}
 await page.locator('#dashboard-tab').click();await expect(page.locator('.dashboard-empty')).toBeVisible();await expect(page.locator('.dashboard-summary')).toHaveCount(0);
 await page.locator('#debug-tab').click();
 await page.locator('#context-close').click();await page.locator('#context-toggle').click();await expect(page.locator('#debug-pane')).toBeVisible();await expect(f.draft).toHaveValue('Keep this desktop draft');
 assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
 assert.equal(f.turns.length,0);assert.deepEqual(f.errors,[]);
});
