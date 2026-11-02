import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecretStore} from '../../../../src/secrets.js';
import {browserChat,expect} from './browser-fixture.js';
async function requestCard(t,key='ADMIN_PASSWORD'){
  const f=await browserChat(t);await f.ready();const store=createSecretStore({home:f.home}),request=store.request(key);
  f.messages.push({id:'native-request',role:'tool',tool_name:'ned',content:JSON.stringify(request)});await f.page.reload();
  const card=f.page.locator('.secret-request-card');await expect(card).toBeVisible();
  return {...f,store,request,card,input:card.getByLabel('Value',{exact:true}),enter:card.getByRole('button',{name:'Enter secret',exact:true})};
}
test('TC-008: chat button stores a masked secret privately and recovers completed state on reload',async t=>{
  const f=await requestCard(t),{page,card,input,enter}=f;await f.draft.fill('Preserved draft');
  await enter.click();await expect(input).toBeFocused();assert.equal(await input.getAttribute('type'),'password');assert.equal(await input.getAttribute('autocomplete'),'new-password');
  await input.fill('synthetic-cancel');await card.getByRole('button',{name:'Cancel',exact:true}).click();await expect(input).toHaveValue('');await expect(enter).toBeFocused();
  await enter.click();await input.fill('synthetic-chat-entry');await page.screenshot({path:'/tmp/ned-secret-entry-desktop.png'});
  await card.getByRole('button',{name:'Save secret',exact:true}).click();await expect(card).toContainText('Secret saved.');await expect(input).toHaveValue('');assert.equal(f.store.get('ADMIN_PASSWORD'),'synthetic-chat-entry');await expect(f.draft).toHaveValue('Preserved draft');
  assert.ok(!JSON.stringify(f.requests).includes('synthetic-chat-entry'));assert.equal(await card.locator('.message-copy').count(),0);
  const history=await page.request.get(new URL('/api/chat/sessions/nedcom-main/messages?offset=0',page.url()).href);assert.ok(!(await history.text()).includes('synthetic-chat-entry'));
  assert.equal(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})).then(text=>text.includes('synthetic-chat-entry')),false);
  await page.reload();await page.locator('.secret-request-card').getByRole('button',{name:'Enter secret',exact:true}).click();await expect(page.locator('.secret-request-card')).toContainText('Secret saved.');assert.equal(f.store.get('ADMIN_PASSWORD'),'synthetic-chat-entry');assert.deepEqual(f.errors,[]);
});
test('TC-008: mobile entry clears on cancellation, timeout and navigation; delayed save cannot restore hidden input',async t=>{
  const f=await requestCard(t),{page,card,input,enter}=f;
  await page.setViewportSize({width:390,height:844});await page.locator('#navigation-open').click();await page.getByRole('tab',{name:'Chat',exact:true}).click();
  await enter.click();await input.fill('synthetic-mobile');await page.screenshot({path:'/tmp/ned-secret-entry-mobile.png'});assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
  await page.locator('#navigation-open').click();await page.getByRole('tab',{name:'Settings',exact:true}).click();await expect(input).toHaveValue('');await page.locator('#navigation-open').click();await page.getByRole('tab',{name:'Chat',exact:true}).click();
  await page.clock.install();await enter.click();await input.fill('synthetic-timeout');await page.clock.fastForward(30001);await expect(input).toHaveValue('');await expect(input).toBeHidden();await page.clock.resume();
  await enter.click();await input.fill('synthetic-delayed-save');
  let release,seen;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{seen=resolve;});
  await page.route('**/api/secrets/requests/*/submit',async route=>{seen();await gate;await route.continue();});
  await card.getByRole('button',{name:'Save secret',exact:true}).click();await requested;await expect(input).toHaveValue('');assert.equal(await enter.isDisabled(),true);
  await page.locator('#navigation-open').click();await page.getByRole('tab',{name:'Settings',exact:true}).click();release();await expect.poll(()=>f.store.list().length).toBe(1);await expect(input).toHaveValue('');
  await page.locator('#navigation-open').click();await page.getByRole('tab',{name:'Chat',exact:true}).click();await expect(input).toBeHidden();await enter.click();await expect(card).toContainText('Secret saved.');assert.deepEqual(f.errors,[]);
});
test('TC-008: failed acknowledgement clears bytes and a retry sees saved state without replacing',async t=>{
  const f=await requestCard(t),{page,card,input,enter}=f;
  await page.route('**/api/secrets/requests/*/submit',async route=>{await route.fetch();await route.fulfill({status:503,body:'Unavailable'});});
  await enter.click();await input.fill('synthetic-lost-ack');await card.getByRole('button',{name:'Save secret',exact:true}).click();await expect(card).toContainText('Could not save secret. Retry.');await expect(input).toHaveValue('');
  await enter.click();await expect(card).toContainText('Secret saved.');assert.equal(f.store.get('ADMIN_PASSWORD'),'synthetic-lost-ack');assert.deepEqual(f.errors,[]);
});

test('TC-008: expired and revoked cards cannot open an entry form',async t=>{
  const f=await requestCard(t),{page,card,input,enter}=f;
  f.store.set('ADMIN_PASSWORD','synthetic-newer-state');await enter.click();await expect(card).toContainText('Request is unavailable. Ask NED to request it again.');await expect(input).toBeHidden();assert.equal(f.store.get('ADMIN_PASSWORD'),'synthetic-newer-state');
  f.messages[0].content=JSON.stringify({...f.request,expires_at:'2000-01-01T00:00:00.000Z'});await page.reload();await page.locator('.secret-request-card').getByRole('button',{name:'Enter secret',exact:true}).click();await expect(page.locator('.secret-request-card')).toContainText('Request is unavailable. Ask NED to request it again.');assert.deepEqual(f.errors,[]);
});
