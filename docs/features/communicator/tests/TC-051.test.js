import test from 'node:test';
import assert from 'node:assert/strict';
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

  await transcript.evaluate(node=>node.scrollBy({top:-36,behavior:'instant'}));
  await expect(latest).toBeEnabled();
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

test('TC-051: mobile composer remains in a keyboard-sized visual viewport',async t=>{
  const {page,draft,ready,turns}=await browserChat(t,{viewport:{width:390,height:844}});
  await ready();
  await page.addInitScript(()=>{
    const viewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});
    Object.defineProperty(globalThis,'visualViewport',{configurable:true,value:viewport});
  });
  await page.reload();
  await ready();
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
  await expect.poll(()=>within(0,360)).toBe(true);
  await setViewport(320,40);
  await expect.poll(()=>within(40,360)).toBe(true);
  await expect(send).toBeEnabled();
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth),390);
  await setViewport(844,0);
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
  turns[0].partial('Streaming above the keyboard.\n'.repeat(14));
  await expect(page.locator('[data-state="streaming"]')).toContainText('Streaming above the keyboard.');
  await expect.poll(()=>within(0,260)).toBe(true);
  turns[0].finish();
  await expect(send).toHaveAttribute('aria-label','Send message');
  await setViewport(844,0);
  await expect(activity).toBeVisible();
});
