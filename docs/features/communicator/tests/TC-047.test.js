import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-047: reload reconnects to the same generation',async t=>{
  for(const width of [1280,390])await t.test(`${width}px viewport`,async t=>{
    const fixture=await browserChat(t,{viewport:{width,height:844}});
    const {page,draft,turns}=fixture;
    const progress=page.locator('#transcript .reply-progress');
    const send=page.locator('#chat-send');
    if(width===390)await page.emulateMedia({reducedMotion:'reduce'});
    await fixture.ready();
    await draft.fill('Keep going after reload');
    await draft.press('Enter');
    await expect(progress).toHaveText('NED is preparing a reply…');
    await expect.poll(()=>turns.length).toBe(1);
    await page.reload();
    await expect(progress).toHaveText('NED is preparing a reply…');
    assert.equal(await progress.evaluate(label=>label.ownerDocument.defaultView.getComputedStyle(label,'::before').animationName),width===390?'none':'reply-pulse');
    await expect(send).toHaveAttribute('aria-label','Stop response');
    await draft.fill('Do not send this yet');
    await draft.press('Enter');
    turns[0].partial();
    await expect(page.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
    await page.reload();
    await expect(page.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
    await expect(send).toHaveAttribute('aria-label','Stop response');
    turns[0].finish();
    await expect(send).toHaveAttribute('aria-label','Send message');
    await expect(progress).toHaveCount(0);
    await expect(page.locator('#transcript .assistant-message')).toContainText(['Completed reply 1']);
    assert.equal(turns.length,1);
    assert.deepEqual(fixture.errors,[]);
  });
});
