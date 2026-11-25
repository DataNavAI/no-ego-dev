import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

const contextRoute='**/api/v1/auth/context';
const contextPath='/api/v1/auth/context';

test('TC-050: saved access survives a temporary verification failure and reconnects automatically',async t=>{
  const fixture=await browserChat(t);
  const {page,network}=fixture;
  await fixture.ready();
  const before=network.filter(path=>path===contextPath).length;
  await page.route(contextRoute,route=>route.fulfill({status:503}),{times:1});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#access-gate')).toBeVisible();
  await fixture.ready();
  await expect(page.locator('#access-gate')).toBeHidden();
  assert.equal(network.filter(path=>path===contextPath).length,before+2);
  assert.equal(fixture.turns.length,0);
});

test('TC-050: delegated access recovers in the same tab after an idle rejection',async t=>{
  const fixture=await browserChat(t,{deferLogin:true});
  const {page,draft,network}=fixture;
  await page.route('**/api/**',async route=>{
    const headers={...route.request().headers(),authorization:`Bearer ${fixture.accessToken}`};
    if(!route.request().url().endsWith(contextPath))return route.continue({headers});
    const response=await route.fetch({headers});
    await route.fulfill({response,headers:{...response.headers(),'x-ned-hub-access':'1'}});
  });
  await page.reload();
  await fixture.ready();
  await draft.fill('Keep my unsent draft.');
  let navigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  await page.route('**/api/v1/health',route=>route.fulfill({status:401,headers:{'x-ned-hub-access':'1'},body:'{}'}),{times:1});
  await page.locator('#debug-toggle').click();
  await expect(page.locator('#access-token')).toBeHidden();
  await expect(page.locator('#access-gate')).toBeVisible();
  await fixture.ready();
  await expect(page.locator('#access-gate')).toBeHidden();
  await expect(draft).toHaveValue('Keep my unsent draft.');
  assert.equal(navigations,0);

  const before=network.filter(path=>path===contextPath).length;
  const denied=route=>route.fulfill({status:401,headers:{'x-ned-hub-access':'1'},body:'{}'});
  await page.route(contextRoute,denied,{times:1});
  await page.route('**/api/v1/health',denied,{times:1});
  await page.locator('#debug-toggle').click();
  await page.locator('#debug-toggle').click();
  await expect(page.locator('#access-status')).toHaveText('Hub access expired. Reconnect through NED Hub.');
  await expect(page.locator('#access-token')).toBeHidden();
  await expect(page.locator('#access-retry')).toBeVisible();
  assert.equal(network.filter(path=>path===contextPath).length,before+1);
  assert.equal(navigations,0);
  assert.equal(fixture.turns.length,0);
});

test('TC-050: browser-online event reopens unavailable history without sending a turn',async t=>{
  const fixture=await browserChat(t,{historyFailure:true,viewport:{width:390,height:844}});
  const {page,draft}=fixture;
  await expect(page.locator('#chat-status')).toContainText('Chat is unavailable');
  await expect(draft).toBeDisabled();
  fixture.setHistoryFailure(false);
  await page.evaluate(()=>globalThis.dispatchEvent(new Event('online')));
  await fixture.ready();
  await draft.fill('An unsent mobile draft.');
  await page.context().setOffline(true);
  await expect.poll(()=>page.evaluate(()=>globalThis.navigator.onLine)).toBe(false);
  fixture.messages.push({id:'while-offline',role:'assistant',content:'Arrived while offline.'});
  await page.context().setOffline(false);
  await expect(page.locator('#transcript')).toContainText('Arrived while offline.');
  await expect(draft).toHaveValue('An unsent mobile draft.');
  assert.equal(fixture.turns.length,0);
});

test('TC-050: an interrupted browser stream reattaches to its existing reply',async t=>{
  const fixture=await browserChat(t);
  const {page,draft,network,turns}=fixture;
  await fixture.ready();
  const events='**/api/v1/chat/sessions/*/turns/*/events';
  const prefix='Visible partial';
  let release;
  const hold=new Promise(resolve=>{release=resolve;});
  t.after(()=>release());
  await page.route(events,async route=>{await hold;await route.continue();},{times:1});
  await page.route(events,route=>route.fulfill({
    status:200,contentType:'text/event-stream',
    body:`event: delta\ndata: ${JSON.stringify({cursor:0,next:prefix.length,text:prefix})}\n\n`,
  }),{times:1});
  await draft.fill('One reply only.');
  await draft.press('Enter');
  await expect.poll(()=>turns.length).toBe(1);
  await expect.poll(()=>network.filter(path=>path.endsWith('/events')&&path.includes('/turns/')).length).toBe(2);
  const streams=network.filter(path=>path.endsWith('/events')&&path.includes('/turns/'));
  assert.equal(streams[0],streams[1]);
  await expect(page.locator('#transcript .reply-progress')).toHaveText('Reconnecting to the reply…');
  await expect(page.locator('[data-state="streaming"] .message-content')).toHaveText(prefix);
  await draft.fill('Keep the follow-up draft.');
  release();
  turns[0].partial();
  await expect(page.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
  turns[0].finish();
  await expect(page.locator('#chat-send')).toHaveAttribute('aria-label','Send message');
  await expect(draft).toHaveValue('Keep the follow-up draft.');
  assert.equal(network.filter(path=>path.endsWith('/chat')).length,1);
  assert.equal(turns.length,1);
});
