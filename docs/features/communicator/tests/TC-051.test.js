import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-051: live tail follows through viewport changes and intentional scroll away',async t=>{
  const fixture=await browserChat(t);
  const {page,draft,turns}=fixture;
  const transcript=page.locator('#transcript');
  const partial=transcript.locator('[data-state="streaming"] .message-content');
  const latest=page.getByRole('button',{name:'Jump to latest'});
  const gap=()=>transcript.evaluate(node=>node.scrollHeight-node.clientHeight-node.scrollTop);
  await fixture.ready();
  await draft.fill('Stream a long checklist.');
  await draft.press('Enter');
  await expect.poll(()=>turns.length).toBe(1);
  turns[0].partial('First section\n'.repeat(60)+'First tail');
  await expect(partial).toContainText('First tail');
  await expect.poll(gap).toBeLessThanOrEqual(2);

  await page.setViewportSize({width:1280,height:520});
  turns[0].partial('\nSecond tail');
  await expect(partial).toContainText('Second tail');
  await expect.poll(gap).toBeLessThanOrEqual(2);

  const transcriptBefore = await transcript.boundingBox();
  await transcript.evaluate(node=>node.scrollBy({top:-36,behavior:'instant'}));
  await expect(latest).toBeEnabled();
  await expect(latest).toBeVisible();
  const jumpBox = await latest.boundingBox();
  const composerBox = await page.locator('.compose-dock').boundingBox();
  assert.deepEqual(await transcript.boundingBox(), transcriptBefore);
  assert.ok(jumpBox.y > transcriptBefore.y + transcriptBefore.height / 2);
  assert.ok(jumpBox.y + jumpBox.height <= composerBox.y);
  const position=await transcript.evaluate(node=>node.scrollTop);
  turns[0].partial('\n'+'More lines\n'.repeat(20)+'Third tail');
  await expect(partial).toContainText('Third tail');
  assert.equal(await transcript.evaluate(node=>node.scrollTop),position);
  await latest.press('Enter');
  await expect(transcript).toBeFocused();
  await expect.poll(gap).toBeLessThanOrEqual(2);
  turns[0].partial('\n'+'Last lines\n'.repeat(15)+'Final live tail');
  await expect(partial).toContainText('Final live tail');
  await expect.poll(gap).toBeLessThanOrEqual(2);
  turns[0].finish();
  await expect(transcript).toContainText('Completed reply 1');
  await expect.poll(gap).toBeLessThanOrEqual(2);
  assert.equal(turns.length,1);
});

test('TC-051: completion preserves scroll intent while canonical history is loading',async t=>{
  const rows=Array.from({length:24},(_,index)=>({id:`prior-${index}`,role:'assistant',content:`Prior reply ${index}`}));
  const fixture=await browserChat(t,{existing:true,rows});
  const {page,draft,turns}=fixture;
  const transcript=page.locator('#transcript');
  await fixture.ready();
  await draft.fill('Send one message.');
  await draft.press('Enter');
  await expect.poll(()=>turns.length).toBe(1);
  turns[0].partial();
  await expect(transcript.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
  let release,requested=false;
  const hold=new Promise(resolve=>{release=resolve;});
  let position;
  try{
    await page.route('**/api/v1/chat/sessions/nedcom-main/messages?offset=0',async route=>{
      requested=true;await hold;await route.continue();
    },{times:1});
    turns[0].finish();
    await expect.poll(()=>requested).toBe(true);
    position=await transcript.evaluate(node=>{
      node.scrollBy({top:-160,behavior:'instant'});
      return node.scrollTop;
    });
  }finally{release();}
  await expect(transcript.locator('[data-message-id="reply-1"]')).toContainText('Completed reply 1');
  await expect(page.locator('#chat-send')).toHaveAttribute('aria-label','Send message');
  assert.equal(await transcript.evaluate(node=>node.scrollTop),position);
});

test('TC-051: jumping to latest wins over an older page already in flight',{timeout:30000},async t=>{
  const rows=Array.from({length:350},(_,index)=>({id:`history-${index}`,role:'assistant',content:`History message ${index}`}));
  const {page,ready,draft}=await browserChat(t,{existing:true,rows});
  const transcript=page.locator('#transcript');
  const latest=page.getByRole('button',{name:'Jump to latest'});
  const final=transcript.locator('[data-message-id="history-349"]');
  const atTail=()=>transcript.evaluate(node=>node.scrollHeight-node.clientHeight-node.scrollTop<=2);
  const top=()=>transcript.evaluate(node=>node.scrollTo({top:0,behavior:'instant'}));
  await ready();
  await expect(final).toBeInViewport({ratio:1});
  for(const first of [250,200,150,100]){
    await top();
    await expect(transcript.locator(`[data-message-id="history-${first}"]`)).toHaveCount(1);
  }
  await expect(final).toHaveCount(0);
  let release,held=false;
  const hold=new Promise(resolve=>{release=resolve;});
  const request='**/api/v1/chat/sessions/nedcom-main/messages?offset=0';
  try{
    await page.route(request,async route=>{held=true;await hold;await route.continue();},{times:1});
    await top();
    await expect.poll(()=>held).toBe(true);
    await latest.click();
    await expect(final).toBeInViewport({ratio:1});
    await expect.poll(atTail).toBe(true);
    await draft.fill('Keep this draft after the jump.');
    const send=page.getByRole('button',{name:'Send message'});
    await expect(send).toBeDisabled();
    release();
    // Send is re-enabled only after the older-history handler has settled.
    await expect(send).toBeEnabled();
    await expect(draft).toHaveValue('Keep this draft after the jump.');
    await expect(final).toBeInViewport({ratio:1});
    assert.equal(await atTail(),true);
    await expect(latest).toBeHidden();
    const evidence=process.env.NED_UI_EVIDENCE_DIR;
    if(evidence)await page.screenshot({path:join(evidence,'latest-after-older-read.png')});
  }finally{release();}
});

test('TC-051: idle mobile history offers Jump to latest before any pagination',async t=>{
  const rows=Array.from({length:20},(_,index)=>({id:`idle-${index}`,role:'assistant',content:`Idle message ${index}`}));
  const {page,ready}=await browserChat(t,{existing:true,rows,viewport:{width:390,height:844}});
  const transcript=page.locator('#transcript');
  const latest=page.getByRole('button',{name:'Jump to latest'});
  const final=transcript.locator('[data-message-id="idle-19"]');
  await ready();
  await expect(final).toBeInViewport({ratio:1});
  await transcript.evaluate(node=>node.scrollBy({top:-300,behavior:'instant'}));
  await expect(final).not.toBeInViewport();
  await latest.click();
  await expect(final).toBeInViewport({ratio:1});
  await expect(latest).toBeHidden();
  const evidence=process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'mobile-latest-visible.png')});
});

test('TC-051: mobile composer remains in a keyboard-sized visual viewport',async t=>{
  const {page,draft,ready,turns}=await browserChat(t,{
    viewport:{width:390,height:844},
    preparePage:page=>page.route('**/api/v1/identity',route=>route.fulfill({
      json:{awsChatShortcut:true,connections:[{provider:'aws',status:'disconnected',request:{id:'12345678-1234-1234-1234-123456789abc',state:'requested',expiresAt:Date.now()+600000}}]},
    })),
  });
  await ready();
  await page.addInitScript(()=>{
    const viewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});
    Object.defineProperty(globalThis,'visualViewport',{configurable:true,value:viewport});
  });
  await page.reload();
  await ready();
  await expect(page.getByRole('button',{name:'Review connection'})).toBeVisible();
  const composer=page.locator('.compose-dock');
  const send=page.locator('#chat-send');
  const shell=page.locator('#app-shell');
  const setViewport=(height,offsetTop,scale=1)=>page.evaluate(({height,offsetTop,scale})=>{
    const viewport=globalThis.visualViewport;
    Object.assign(viewport,{height,offsetTop,scale});
    viewport.dispatchEvent(new Event('resize'));
    viewport.dispatchEvent(new Event('scroll'));
  },{height,offsetTop,scale});
  const within=async(top,bottom)=>{
    for(const control of [composer,draft,send]){
      const box=await control.boundingBox();
      if(!box||box.y<top||box.y+box.height>bottom+1)return false;
    }
    return true;
  };
  await draft.focus();
  await draft.fill('A draft that stays visible.\nA second line.');
  await setViewport(360,0);
  await expect(page.locator('#mobile-bottom-nav')).toBeHidden();
  await expect.poll(()=>within(0,360)).toBe(true);
  await setViewport(320,40);
  await expect.poll(()=>within(40,360)).toBe(true);
  await expect(send).toBeEnabled();
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth),390);
  await setViewport(844,0);
  await expect(page.locator('#mobile-bottom-nav')).toBeVisible();
  await expect.poll(async()=>(await shell.boundingBox()).height).toBe(844);
  await expect(draft).toHaveValue('A draft that stays visible.\nA second line.');
  await setViewport(330,15,1.5);
  await expect.poll(async()=>(await shell.boundingBox()).height).toBe(844);

  await page.setViewportSize({width:320,height:844});
  const longDraft='A long mobile draft.\n'.repeat(14);
  await draft.fill(longDraft);
  await page.getByRole('button',{name:'Message options'}).click();
  await page.getByRole('button',{name:'Add link',exact:true}).click();
  await draft.focus();
  const activity=page.locator('#chat-activity');
  await activity.evaluate(node=>{
    node.querySelector('#chat-activity-content').textContent='A project update arrived.';
    node.hidden=false;
  });
  await expect(activity).toBeVisible();
  await setViewport(260,0);
  await expect(activity).toBeHidden();
  await expect.poll(()=>within(0,260)).toBe(true);
  await expect(draft).toHaveValue(longDraft);
  await expect(send).toBeEnabled();
  const label=page.locator('#chat-link-label');
  await label.focus();
  await expect.poll(()=>label.evaluate(node=>{
    const rect=node.getBoundingClientRect(),clip=node.closest('.composer-context').getBoundingClientRect();
    return rect.bottom<=clip.bottom+1&&rect.top>=clip.top-1;
  })).toBe(true);

  await send.click();
  await expect(send).toHaveAttribute('aria-label','Stop response');
  await expect.poll(()=>within(0,260)).toBe(true);
  await expect.poll(()=>turns.length).toBe(1);
  turns[0].partial('Streaming above the keyboard.\n'.repeat(32));
  await expect(page.locator('[data-state="streaming"]')).toContainText('Streaming above the keyboard.');
  await expect.poll(()=>within(0,260)).toBe(true);
  const transcript = page.locator('#transcript');
  const latest = page.getByRole('button',{name:'Jump to latest'});
  const liveReply = transcript.locator('[data-state="streaming"]');
  const replyEndsInView = () => liveReply.evaluate(node=>{
    const viewport=node.closest('#transcript').getBoundingClientRect();
    const end=node.getBoundingClientRect().bottom;
    return end>=viewport.top&&end<=viewport.bottom+1;
  });
  await expect.poll(replyEndsInView).toBe(true);
  const transcriptBefore = await transcript.boundingBox();
  await transcript.evaluate(node=>node.scrollBy({top:-50,behavior:'instant'}));
  await expect(latest).toBeVisible();
  const jump = await latest.boundingBox();
  assert.deepEqual(await transcript.boundingBox(),transcriptBefore);
  assert.ok(jump.y>=transcriptBefore.y&&jump.y+jump.height<=(await composer.boundingBox()).y);
  const evidence = process.env.NED_UI_EVIDENCE_DIR;
  if(evidence)await page.screenshot({path:join(evidence,'mobile-floating-latest.png')});
  await latest.click();
  await expect(latest).toBeHidden();
  await setViewport(844,0);
  await expect(page.locator('#mobile-bottom-nav')).toBeVisible();
  await expect(activity).toBeVisible();

  await page.reload();
  await expect(liveReply).toContainText('Streaming above the keyboard.');
  await setViewport(260,0);
  turns[0].partial('The original response continued after reload.');
  await expect(liveReply).toContainText('The original response continued after reload.');
  await expect.poll(replyEndsInView).toBe(true);
  await expect(page.getByRole('button',{name:'Review connection'})).toHaveCount(1);
  assert.equal(turns.length,1);
  turns[0].finish();
  await expect(send).toHaveAttribute('aria-label','Send message');
  await expect(transcript.locator(':scope > :last-child')).toContainText('Completed reply 1');
});
