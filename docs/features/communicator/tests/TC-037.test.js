import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-037: new chat boots the served application, creates once, streams before completion and reopens persisted messages',{timeout:45000},async t=>{
  const chat=await browserChat(t,{edgeFixedFailures:1});await chat.ready();
  assert.equal(chat.network.filter(path=>path==='/api/chat/sessions/fixed').length,2);
  await expect(chat.page.locator('#transcript article')).toHaveCount(0);
  assert.equal(chat.requests.filter(row=>row.method==='POST'&&row.url==='/api/sessions').length,1);
  await chat.send('First message from a new chat');
  assert.equal(chat.turns.length,1);assert.equal(chat.messages.length,2);
  await expect(chat.page.locator('#transcript article')).toHaveCount(2);
  assert.equal(chat.network.filter(path=>/\/turns\/[^/]+\/events$/.test(path)).length,1);
  assert.equal(chat.network.filter(path=>/\/turns\/[^/]+$/.test(path)).length,0);
  await chat.page.reload();await chat.ready();
  await expect(chat.page.locator('#transcript article')).toHaveCount(2);
  await expect(chat.page.locator('#transcript')).toContainText('First message from a new chat');
  await expect(chat.page.locator('#transcript .message-content strong')).toHaveText('Completed reply 1');
  assert.equal(chat.requests.filter(row=>row.method==='POST'&&row.url==='/api/sessions').length,1);
  assert.equal(chat.turns.length,1);assert.deepEqual(chat.errors,[]);
});

test('TC-037: ready composer is one-line compact, grows and shrinks, with reachable bounded optional context',{timeout:45000},async t=>{
  const capture=process.env.NED_CHAT_SCREENSHOT_DIR;
  if(capture)await mkdir(capture,{recursive:true});
  for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:740}]){
    const chat=await browserChat(t,{viewport});await chat.ready();
    await expect(chat.draft).toBeVisible();
    const geometry=()=>chat.page.evaluate(()=>{
      const rect=selector=>{const {x,y,width,height,bottom}=globalThis.document.querySelector(selector).getBoundingClientRect();return {x,y,width,height,bottom};};
      return {form:rect('#chat-form'),draft:rect('#chat-message'),send:rect('#chat-send'),attach:rect('#chat-attach'),link:rect('#chat-add-link'),overflow:globalThis.document.documentElement.scrollWidth>globalThis.innerWidth||globalThis.document.documentElement.scrollHeight>globalThis.innerHeight};
    });
    const initial=await geometry();
    if(capture)await chat.page.screenshot({path:join(capture,`empty-${viewport.width}.png`)});
    assert.ok(initial.form.height<=120,`${viewport.width}: empty form ${initial.form.height}px exceeds120px`);
    assert.ok(initial.draft.height<=36,`${viewport.width}: empty textarea must fit one line`);
    for(const action of [initial.attach,initial.link,initial.send]){
      assert.ok(action.height>=44);assert.ok(action.y>=0&&action.bottom<=viewport.height);
    }
    assert.ok(initial.attach.x+initial.attach.width<=initial.link.x);assert.ok(initial.link.x+initial.link.width<=initial.send.x);
    assert.equal(initial.overflow,false);
    await chat.draft.fill(Array.from({length:60},(_,index)=>`Synthetic line ${index}`).join('\n'));
    await expect.poll(async()=>(await geometry()).draft.height).toBeGreaterThan(initial.draft.height);
    assert.equal(await chat.draft.evaluate(node=>node.scrollHeight>node.clientHeight),true);
    await chat.draft.fill('');
    await expect.poll(async()=>(await geometry()).form.height).toBe(initial.form.height);
    await chat.page.locator('#chat-files').setInputFiles(Array.from({length:4},(_,index)=>({name:`Synthetic-long-filename-${index}-for-optional-context.txt`,mimeType:'text/plain',buffer:Buffer.from('Synthetic upload only.')})));
    await expect(chat.page.locator('#chat-attachments li')).toHaveCount(4);
    await expect(chat.page.locator('#chat-attachments')).not.toContainText('Uploading');
    await chat.page.locator('#chat-add-link').click();
    await expect(chat.page.locator('#chat-link-url')).toBeFocused();
    const help=chat.page.getByRole('button',{name:'Supported files',exact:true});
    await help.click();await expect(help).toHaveAttribute('aria-expanded','true');
    await chat.page.locator('#chat-supported-files').scrollIntoViewIfNeeded();
    await expect(chat.page.locator('#chat-supported-files')).toBeVisible();
    const opened=await geometry();assert.equal(opened.overflow,false);assert.ok(opened.send.bottom<=viewport.height);assert.ok(opened.form.y>=0);
    if(capture)await chat.page.screenshot({path:join(capture,`context-${viewport.width}.png`)});
    await help.press('Escape');await expect(help).toHaveAttribute('aria-expanded','false');await expect(help).toBeFocused();
    await chat.page.locator('#chat-link-cancel').click();
    for(let remaining=4;remaining>0;remaining--)await chat.page.getByRole('button',{name:/^Remove Synthetic-long-filename/}).first().click();
    await expect.poll(async()=>(await geometry()).form.height).toBe(initial.form.height);
    assert.deepEqual(chat.errors,[]);
  }
});
