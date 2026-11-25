import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserChat,expect} from '../../communicator/tests/browser-chat-fixture.js';

for(const forgotten of [false,true])test(`TC-006: delayed controllers keep the shell inert and respect access loss (${forgotten?'forgotten':'ready'})`,{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true}),page=fixture.page;
  let release,seen;const held=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{seen=resolve;});
  await page.route('**/chat-entry.js',async route=>{seen();await held;await route.continue();});
  try{
    await page.locator('#access-token').fill(fixture.accessToken);await page.locator('#access-submit').click();await requested;
    await expect(page.locator('#app-shell')).toBeHidden();assert.equal(await page.locator('#app-shell').evaluate(element=>element.inert),true);
    if(forgotten)await page.evaluate(async()=>{const {apiClient}=await import('/api-client.js');apiClient.forget();});
    release();await expect(page.locator('#access-submit')).toBeEnabled();
    if(forgotten){await expect(page.locator('#access-gate')).toBeVisible();await expect(page.locator('#app-shell')).toBeHidden();assert.equal(await page.evaluate(()=>localStorage.getItem('ned.instance-access.v1')),null);}
    else{await fixture.ready();await fixture.draft.fill('Submit after controllers mount');await page.locator('#chat-send').click();await expect.poll(()=>fixture.turns.length).toBe(1);assert.equal(new URL(page.url()).search,'');}
  }finally{release();}
});

test('TC-006: startup restoration settles before manual sign-in can submit',{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true}),page=fixture.page;
  let release,seen;const held=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{seen=resolve;});
  await page.route('**/api/v1/auth/context',async route=>{seen();await held;await route.continue();});
  try{
    await page.reload({waitUntil:'domcontentloaded'});await requested;
    await expect(page.locator('#access-submit')).toBeDisabled();
    release();await expect(page.locator('#access-submit')).toBeEnabled();
    await page.unroute('**/api/v1/auth/context');
    await page.locator('#access-token').fill(fixture.accessToken);await page.locator('#access-submit').click();await fixture.ready();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ned.instance-access.v1')).token),fixture.accessToken);
  }finally{release();}
});

test('TC-006: direct UI validates before loading data, remembers access and forgets it',{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true,viewport:{width:390,height:844}}),page=fixture.page;
  await expect(page.locator('#access-gate')).toBeVisible();await expect(page.locator('#app-shell')).toBeHidden();assert.equal(fixture.requests.length,0);
  await page.locator('#access-token').fill('b'.repeat(64));await page.locator('#access-submit').click();await expect(page.locator('#access-status')).toContainText('not accepted');assert.equal(fixture.requests.length,0);
  await page.locator('#access-token').fill(fixture.accessToken);await page.locator('#access-submit').click();await fixture.ready();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ned.instance-access.v1')).token),fixture.accessToken);
  assert.equal(fixture.network.some(url=>url.includes(fixture.accessToken)),false);await expect(page.locator('#access-token')).toHaveValue('');
  await page.reload();await fixture.ready();await expect(page.locator('#access-gate')).toBeHidden();
  await page.setViewportSize({width:1280,height:900});await page.locator('#workspace-settings-tab').click();await page.locator('#access-forget').click();
  await expect(page.locator('#access-gate')).toBeVisible();assert.equal(await page.evaluate(()=>localStorage.getItem('ned.instance-access.v1')),null);
});

test('TC-006: API401 clears stale access, preserves the draft and never resends messages',{timeout:45000},async context=>{
  const fixture=await browserChat(context);await fixture.ready();await fixture.draft.fill('Keep this unsent draft');
  await writeFile(path.join(fixture.home,'.ned/core/operator-token'),'c'.repeat(64)+'\n',{mode:0o600});
  await fixture.page.locator('#debug-toggle').click();await expect(fixture.page.locator('#access-gate')).toBeVisible();
  assert.equal(await fixture.page.evaluate(()=>localStorage.getItem('ned.instance-access.v1')),null);
  await fixture.page.locator('#access-token').fill('c'.repeat(64));await fixture.page.locator('#access-submit').click();await fixture.ready();
  await expect(fixture.draft).toHaveValue('Keep this unsent draft');assert.equal(fixture.turns.length,0);
});

test('TC-006: unavailable browser storage keeps authenticated access in this tab only',{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true});
  await fixture.page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Unavailable','SecurityError');};});
  await fixture.page.reload();await fixture.page.locator('#access-token').fill(fixture.accessToken);await fixture.page.locator('#access-submit').click();await fixture.ready();
  assert.equal(await fixture.page.locator('#access-memory').getAttribute('hidden'),null);
  await fixture.page.reload();await expect(fixture.page.locator('#access-gate')).toBeVisible();assert.equal(fixture.turns.length,0);
});

test('TC-006: Hub connection hides private credentials from initial paint through delegated access loss',{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true}),page=fixture.page;
  let release,seen;const held=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{seen=resolve;});
  await page.route('**/api/**',async route=>{
    const headers={...route.request().headers(),authorization:'Bearer '+fixture.accessToken};
    if(!route.request().url().endsWith('/auth/context'))return route.continue({headers});
    seen();await held;const response=await route.fetch({headers});
    await route.fulfill({response,headers:{...response.headers(),'x-ned-hub-access':'1'}});
  });
  try{
    await page.reload({waitUntil:'domcontentloaded'});await requested;
    await expect(page.locator('#access-gate')).toBeVisible();await expect(page.locator('#access-token')).toBeHidden();await expect(page.locator('#access-submit')).toBeHidden();
    release();await fixture.ready();await expect(page.locator('#access-token')).toBeHidden();assert.equal(await page.evaluate(()=>localStorage.getItem('ned.instance-access.v1')),null);
    await page.route('**/api/v1/health',route=>route.fulfill({status:401,headers:{'x-ned-hub-access':'1'},body:'{}'}));
    await page.locator('#debug-toggle').click();await expect(page.locator('#access-gate')).toBeVisible();await expect(page.locator('#access-token')).toBeHidden();await expect(page.locator('#access-retry')).toBeVisible();assert.equal(fixture.turns.length,0);
  }finally{release();}
});

test('TC-006: unavailable startup verification offers reconnect without private token entry',{timeout:45000},async context=>{
  const fixture=await browserChat(context,{deferLogin:true}),page=fixture.page;
  await page.route('**/api/v1/auth/context',route=>route.abort());await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#access-retry')).toBeVisible();await expect(page.locator('#access-token')).toBeHidden();await expect(page.locator('#access-status')).toContainText('Could not reach NED');assert.equal(fixture.requests.length,0);
});
