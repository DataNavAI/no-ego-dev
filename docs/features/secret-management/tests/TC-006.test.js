import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecretStore} from '../../../../src/secrets.js';
import {browserChat,expect} from './browser-fixture.js';

test('TC-006: native tool result creates an explicit private retrieval card after the reply',async t=>{
  const f=await browserChat(t);await f.ready();const {page}=f;
  const store=createSecretStore({home:f.home});store.set('ADMIN_PASSWORD','synthetic-card-password');const path=store.get('ADMIN_PASSWORD',{file:true}).path;const result=store.share(path);
  await f.draft.fill('Please share ADMIN_PASSWORD');await f.draft.press('Enter');await expect.poll(()=>f.turns.length).toBe(1);
  f.messages.push({id:'native-tool',role:'tool',tool_name:'ned',content:JSON.stringify(result)});
  f.messages.push({id:'other-tool',role:'tool',tool_name:'terminal',content:JSON.stringify(result)});
  f.messages.push({id:'bad-tool',role:'tool',tool_name:'ned',content:JSON.stringify({...result,value:'must-not-reach-browser'})});
  f.messages.push({id:'native-assistant',role:'assistant',content:'The secret is ready.',tool_calls:[{id:'call',function:{name:'ned',arguments:JSON.stringify({action:'secure_share_secret',path})}}]});
  f.turns[0].finish();
  const card=page.locator('.secret-share-card');await expect(card).toHaveCount(1);await expect(card).toContainText('Secret ready');await expect(card.locator('textarea')).toBeHidden();
  const history=await page.request.get(new URL('/api/chat/sessions/nedcom-main/messages?offset=0',page.url()).href);const raw=await history.text();assert.ok(!raw.includes(path));assert.ok(!raw.includes('synthetic-card-password'));assert.ok(!raw.includes('must-not-reach-browser'));
  await card.getByRole('button',{name:'Reveal secret',exact:true}).click();await expect(card.locator('textarea')).toHaveValue('synthetic-card-password');
  assert.equal(await card.locator('.message-copy').count(),0);assert.equal(JSON.stringify(f.requests).includes('synthetic-card-password'),false);
  await page.screenshot({path:'/tmp/ned-secret-card-desktop.png'});
  await page.getByRole('tab',{name:'Settings',exact:true}).click();await expect(card.locator('textarea')).toHaveValue('');
  await page.getByRole('tab',{name:'Chat',exact:true}).click();await card.getByRole('button',{name:'Reveal secret',exact:true}).click();await expect(card.locator('textarea')).toHaveValue('synthetic-card-password');
  await card.getByRole('button',{name:'Hide',exact:true}).click();await expect(card.locator('textarea')).toHaveValue('');
  await page.reload();await expect(page.locator('.secret-share-card')).toHaveCount(1);await expect(page.locator('.secret-share-value')).toBeHidden();
  await page.setViewportSize({width:390,height:844});await page.locator('#left-toggle').click();await page.getByRole('tab',{name:'Chat',exact:true}).click();await page.locator('.secret-share-card').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ned-secret-card-mobile.png'});
  store.set('ADMIN_PASSWORD','rotated');await page.locator('.secret-share-card').getByRole('button',{name:'Reveal secret',exact:true}).click();await expect(page.locator('.secret-share-card')).toContainText('Secret is unavailable. Ask NED to share it again.');await expect(page.locator('.secret-share-value')).toHaveValue('');
  assert.deepEqual(f.errors,[]);
});

test('TC-006: a delayed shared-secret reveal cannot restore bytes after leaving Chat',async t=>{
  const f=await browserChat(t);await f.ready();const {page}=f;const store=createSecretStore({home:f.home});store.set('TOKEN','synthetic-delayed-card');const share=store.share(store.get('TOKEN',{file:true}).path);
  f.messages.push({id:'native-tool',role:'tool',name:'ned',content:JSON.stringify(share)});await page.reload();await expect(page.locator('.secret-share-card')).toBeVisible();
  let release,seen;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{seen=resolve;});
  await page.route('**/api/secrets/shares/*/reveal',async route=>{seen();await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({value:'synthetic-delayed-card'})});});
  await page.getByRole('button',{name:'Reveal secret',exact:true}).click();await requested;await page.getByRole('tab',{name:'Settings',exact:true}).click();release();
  await expect(page.locator('.secret-share-value')).toHaveValue('');await page.getByRole('tab',{name:'Chat',exact:true}).click();await expect(page.locator('.secret-share-value')).toBeHidden();assert.deepEqual(f.errors,[]);
});
