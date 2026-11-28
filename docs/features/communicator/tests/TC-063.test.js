import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';
test('TC-063: Project owns Debug and Dashboard without Settings or a separate Debug view',async t=>{
 const f=await browserChat(t);await f.ready();const {page}=f;
 await expect(page.getByRole('tab',{name:'Settings',exact:true})).toHaveCount(0);
 await expect(page.locator('#debug-toggle')).toHaveCount(0);
 await expect(page.getByRole('tablist',{name:'Project view'}).getByRole('tab')).toHaveText(['Goals','Artifacts','Preview','Dashboard','Debug']);
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:844});if(width<768)await page.locator('#mobile-project-toggle').click();
  await page.getByRole('tab',{name:'Dashboard',exact:true}).click();await expect(page.locator('#dashboard')).toContainText('Choose a project');await expect(page.locator('#dashboard .dashboard-summary')).toHaveCount(0);if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,`empty-dashboard-${width}.png`)});
  await page.getByRole('tab',{name:'Debug',exact:true}).click();await expect(page.locator('#preview #debug-pane')).toBeVisible();await expect(page.locator('#debug-health')).toHaveText('Available');await expect(page.locator('dialog#debug-pane')).toHaveCount(0);if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,`embedded-debug-${width}.png`)});
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);
  if(width<768)await page.locator('#context-close').click();
 }
 assert.deepEqual(f.errors,[]);
});

test('TC-063: closing private dialogs never steals focus after the user returns to the composer',async t=>{
 const {createCommunicatorServer}=await import('../../ned-api/tests/auth-client.js');
 const f=await browserChat(t,{startApp:async options=>{const app=createCommunicatorServer({...options,hubAwsIdentity:true});await app.listen();return app;}});await f.ready();const {page}=f;
 await page.locator('#chat-tools-toggle').click();await page.locator('#chat-connect-aws').click();await expect(page.getByRole('dialog',{name:'Connect AWS'})).toBeVisible();
 const closeAndFocus=selector=>page.evaluate(async selector=>{const dialog=globalThis.document.querySelector(selector);const closed=new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));dialog.close();globalThis.document.getElementById('chat-message').focus();await closed;},selector);
 await closeAndFocus('.provider-auth-modal');await expect(f.draft).toBeFocused();
 if(await page.locator('#chat-tools').isHidden())await page.locator('#chat-tools-toggle').click();await page.locator('#secrets-toggle').click();await expect(page.locator('#secret-manager')).toBeVisible();await closeAndFocus('#secret-manager');await expect(f.draft).toBeFocused();assert.deepEqual(f.errors,[]);
});
