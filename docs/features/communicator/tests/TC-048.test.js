import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-048: mobile navigation and authenticated reaction persistence',async t=>{
  const fixture=await browserChat(t,{viewport:{width:390,height:844},existing:true,rows:[
    {id:1,role:'user',content:'A synthetic question'},
    {id:2,role:'assistant',content:'A synthetic answer.'},
  ]});
  const {page}=fixture;
  await fixture.ready();
  const navigation=page.locator('#navigation-toggle');
  await expect(navigation).toHaveAccessibleName('Navigation');
  const chat=page.locator('#chat');
  await expect(page.locator('#preview-toggle')).toBeHidden();
  await navigation.press('Enter');
  await expect(page.locator('#preview-toggle')).toBeVisible();
  await page.locator('#preview-toggle').press('Escape');
  await expect(navigation).toBeFocused();
  await expect(page.locator('#preview-toggle')).toBeHidden();
  await navigation.click();
  await page.locator('#preview-toggle').click();
  await expect(chat).toBeHidden();
  await expect(page.locator('#preview')).toBeVisible();
  await navigation.click();
  await page.locator('#left-toggle').click();
  await expect(chat).toBeFocused();
  await expect(page.locator('#left-toggle')).toBeHidden();
  await expect(page.locator('.user-message .message-reaction')).toHaveCount(0);
  const add=page.locator('.message-reaction summary[aria-label="Add reaction"]');
  await add.click();
  await page.getByRole('button',{name:'Thumbs up'}).click();
  const thumb=page.locator('.message-reaction summary[aria-label="Change reaction, Thumbs up selected"]');
  await expect(thumb).toBeFocused();
  await page.reload();
  await expect(thumb).toBeVisible();
  await thumb.click();
  await page.route('**/reactions',route=>route.fulfill({status:503}));
  await page.getByRole('button',{name:'Heart',exact:true}).click();
  await expect(page.getByText('Could not save reaction. Try again.')).toBeVisible();
  await expect(thumb).toBeVisible();
  await page.unroute('**/reactions');
  const heartButton=page.getByRole('button',{name:'Heart',exact:true});
  await heartButton.click();
  const heart=page.locator('.message-reaction summary[aria-label="Change reaction, Heart selected"]');
  await expect(heart).toBeVisible();
  await heart.click();await heartButton.click();
  await expect(add).toBeVisible();
  const origin=new URL(page.url()).origin;
  const headers={origin,authorization:`Bearer ${fixture.accessToken}`};
  const session='/api/v1/chat/sessions/nedcom-main';
  const history=await page.request.get(origin+session+'/messages',{headers});
  const [user,assistant]=(await history.json()).data;
  assert.equal(user.reaction_target,undefined);
  assert.equal(assistant.reaction,null);
  const url=origin+session+'/reactions';
  const data={message_id:'2',target:assistant.reaction_target,emoji:'🎉'};
  assert.equal((await page.request.post(url,{data,headers:{origin}})).status(),401);
  assert.equal((await page.request.post(url,{data,headers:{...headers,origin:'http://foreign.invalid'}})).status(),403);
  assert.equal((await page.request.post(url,{data:{...data,message_id:'1'},headers})).status(),404);
  assert.equal((await page.request.post(url,{data:{...data,emoji:'invalid'},headers})).status(),400);
  for(let n=0;n<2;n++){
    const response=await page.request.post(url,{data,headers});
    assert.equal(response.status(),200);assert.deepEqual(await response.json(),{reaction:'🎉'});
  }
  await page.reload();
  await expect(page.locator('.message-reaction summary[aria-label="Change reaction, Celebrate selected"]')).toBeVisible();
  await navigation.click();
  const chatChoice=page.locator('#left-toggle');
  await chatChoice.focus();
  await expect(chatChoice).toBeFocused();
  // Simulate Chromium clearing focus before dispatching the breakpoint change.
  await chatChoice.evaluate(button=>button.blur());
  await page.setViewportSize({width:1280,height:844});
  await expect(chat).toBeFocused();
  await expect(navigation).toBeHidden();
  await expect(chat).toBeVisible();
  await expect(page.locator('#preview')).toBeVisible();
  assert.deepEqual(fixture.turns,[]);
  assert.deepEqual(fixture.errors,[]);
});

test('TC-048: a long reply reveals the full picker at 320px',async t=>{
  const {page,ready}=await browserChat(t,{viewport:{width:320,height:740},existing:true,rows:[
    {id:1,role:'assistant',content:Array.from({length:60},(_,index)=>`- Item ${index+1}`).join('\n')},
  ]});
  await ready();
  await page.locator('.message-reaction summary').click();
  const transcript=page.locator('#transcript');
  const picker=page.locator('.reaction-options');
  const bounds=await transcript.boundingBox();
  await expect.poll(async()=>{
    const options=await picker.boundingBox();
    return options&&options.y>=bounds.y&&options.y+options.height<=bounds.y+bounds.height+1;
  }).toBe(true);
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
});
