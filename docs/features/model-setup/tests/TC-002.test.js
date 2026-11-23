import {modelCatalog} from './catalog-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {createModelSetup} from '../../../../apps/core/src/model-setup.js';
import {browserChat,expect} from '../../communicator/tests/browser-chat-fixture.js';

test('TC-002: served local provider setup clears secrets, preserves draft and bypasses configured profiles',{timeout:45000},async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-model-ui-'));t.after(()=>rm(root,{recursive:true,force:true}));
  let reject=true,calls=0;
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:path.join(root,'profile')},fetch:async(url,options)=>{calls++;assert.equal(url,'https://openrouter.ai/api/v1/key');assert.equal(options.headers.Authorization,'Bearer synthetic-local-provider-key');return new Response('{}',{status:reject?401:200});}});
  const chat=await browserChat(t,{modelSetup:models});await chat.ready();
  const card=chat.page.locator('#model-setup');await expect(card).toBeVisible();await expect(chat.page.locator('#chat-send')).toBeDisabled();
  await expect(card).toHaveAttribute('open','');
  await chat.page.keyboard.press('Escape');await expect(card).toBeVisible();
  await chat.draft.evaluate(e=>{e.value='Keep this draft during setup';e.dispatchEvent(new Event('input',{bubbles:true}));});await chat.page.getByLabel('Provider',{exact:true}).selectOption('openrouter');await expect(chat.page.getByLabel('Model',{exact:true})).toHaveValue('openai/gpt-4.1');
  await chat.page.getByLabel('API key',{exact:true}).fill('synthetic-local-provider-key');await chat.page.getByRole('button',{name:'Connect provider'}).click();await expect(chat.page.locator('#model-setup-status')).toContainText('could not be saved');await expect(chat.page.getByLabel('API key',{exact:true})).toHaveValue('');await expect(chat.draft).toHaveValue('Keep this draft during setup');
  await chat.page.getByRole('button',{name:'Check connection'}).click();await expect(chat.page.locator('#model-setup-status')).toContainText('required before chatting');
  const capture=process.env.NED_MODEL_SCREENSHOT_DIR;
  if(capture)await mkdir(capture,{recursive:true});
  for(const viewport of [{width:1280,height:900},{width:320,height:740}]){await chat.page.setViewportSize(viewport);await expect(card).toBeVisible();const box=await card.boundingBox();assert.deepEqual({x:box.x,y:box.y,width:box.width,height:box.height},{x:0,y:0,...viewport});await chat.page.keyboard.press('Tab');assert(await card.evaluate(e=>e.contains(globalThis.document.activeElement)));assert.equal(await chat.page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);if(capture)await chat.page.screenshot({path:path.join(capture,`setup-${viewport.width}.png`)});}
  reject=false;await chat.page.getByLabel('API key',{exact:true}).fill('synthetic-local-provider-key');await chat.page.getByRole('button',{name:'Connect provider'}).click();await expect(card).toBeHidden();await expect(chat.page.locator('#chat-send')).toBeEnabled();await expect(chat.draft).toHaveValue('Keep this draft during setup');
  await chat.page.reload();await chat.ready();await chat.page.getByRole('button',{name:'Open navigation'}).click();await chat.page.locator('#mobile-sidebar-toggle').click();await expect(card).toBeHidden();assert.equal(calls,2);assert(!(await chat.page.content()).includes('synthetic-local-provider-key'));assert(!(await chat.page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('synthetic-local-provider-key'));
  const config=await readFile(path.join(root,'profile/config.yaml'),'utf8');assert(config.includes('synthetic-local-provider-key'));
  await chat.page.getByRole('button',{name:'Model provider',exact:true}).click();await expect(card).toBeVisible();await chat.page.getByRole('button',{name:'Close model settings',exact:true}).click();await expect(card).toBeHidden();await expect(chat.page.locator('#model-setup-toggle')).toBeFocused();
  await chat.send('Configured local provider interaction');assert.deepEqual(chat.errors,[]);
});

test('TC-002: hosted setup offers instance configuration and optional account inheritance without copying an account key',{timeout:45000},async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-hosted-model-ui-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const id=randomUUID(),origin='https://staging.ned.datanav.app',token='ned_'+'h'.repeat(43),connection={id:randomUUID(),version:randomUUID(),provider:'openrouter',model:'openai/gpt-4.1'};let configured=false;
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:path.join(root,'profile')},fetch:async()=>Response.json({configured,connection:configured?connection:null,baseUrl:origin+'/api/models/instances/'+id+'/v1'})});
  await models.register({origin,id,token,kind:'hosted'});
  const chat=await browserChat(t,{modelSetup:models});await chat.ready();await expect(chat.page.locator('#model-setup')).toBeVisible();await expect(chat.page.locator('#model-setup-form')).toBeVisible();await expect(chat.page.getByRole('link',{name:'Set up in NED Hub'})).toHaveCount(0);
  configured=true;await chat.page.getByRole('button',{name:'Check connection'}).click();await expect(chat.page.locator('#model-setup')).toBeHidden();await expect(chat.page.locator('#chat-send')).toBeEnabled();
  const profile=await readFile(path.join(root,'profile/config.yaml'),'utf8');assert(profile.includes(token));assert(!profile.includes('synthetic-local-provider-key'));await chat.send('Hosted inherited connection');assert.deepEqual(chat.errors,[]);
});

test('TC-002: instance device login shows only challenge, supports cancel/retry and resumes configured chat',{timeout:45000},async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-device-ui-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});t.after(()=>rm(root,{recursive:true,force:true}));
  let approve,stops=0;
  const adapter={available:async()=>true,async start(input,hooks){let reject,resolve;const done=new Promise((yes,no)=>{resolve=yes;reject=no;});approve=async()=>{let release;try{release=await hooks.beforeCommit();await import('node:fs/promises').then(fs=>fs.writeFile(path.join(profile,'config.yaml'),'model: {provider: openai, default: fixture, api_key: synthetic-configured-key}\n',{mode:0o600}));resolve();}finally{await release?.();}};queueMicrotask(()=>hooks.event({type:'challenge',verificationUri:'https://auth.openai.com/codex/device',userCode:'NED-TEST',deviceSecret:'never-display'}));return {done,stop(){stops++;reject(Error('cancelled'));}};}};
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter});
  const chat=await browserChat(t,{modelSetup:models});await chat.ready();await expect(chat.page.locator('#model-setup')).toBeVisible();
  await chat.page.getByLabel('Provider',{exact:true}).selectOption('openai-codex');await expect(chat.page.locator('#model-key')).toBeHidden();await chat.page.getByRole('button',{name:'Sign in with OpenAI',exact:true}).click();await expect(chat.page.locator('#model-device-code')).toHaveText('NED-TEST');assert(!(await chat.page.content()).includes('never-display'));
  if(process.env.NED_MODEL_SCREENSHOT_DIR){await mkdir(process.env.NED_MODEL_SCREENSHOT_DIR,{recursive:true});for(const width of [1280,320]){await chat.page.setViewportSize({width,height:900});assert.equal(await chat.page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false);await chat.page.screenshot({path:path.join(process.env.NED_MODEL_SCREENSHOT_DIR,'device-'+width+'.png')});}}

  await chat.page.getByRole('button',{name:'Cancel sign-in',exact:true}).click();await expect(chat.page.locator('#model-setup-status')).toContainText('cancelled');assert(stops>0);await chat.page.keyboard.press('Escape');await expect(chat.page.locator('#model-setup')).toBeVisible();
  await chat.page.getByRole('button',{name:'Sign in with OpenAI',exact:true}).click();await expect(chat.page.locator('#model-device-code')).toHaveText('NED-TEST');await approve();await expect(chat.page.locator('#chat-send')).toBeEnabled();assert(!(await chat.page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('NED-TEST'));
});


test('TC-002: status failure cannot bypass first-use setup and lost access clears the flow before reauthentication',{timeout:45000},async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-model-gate-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:path.join(root,'profile')}});
  const chat=await browserChat(t,{modelSetup:models,deferLogin:true});
  let release;const waiting=new Promise(resolve=>{release=resolve;});
  let first=true;
  await chat.page.route('**/api/v1/model-setup',async route=>{
    if(first&&route.request().method()==='GET'){first=false;await waiting;return route.fulfill({status:503,json:{error:{code:'unavailable'}}});}
    await route.continue();
  });
  await chat.page.locator('#access-token').fill(chat.accessToken);await chat.page.locator('#access-submit').click();
  const card=chat.page.locator('#model-setup');await expect(card).toBeVisible();await expect(chat.page.locator('#model-setup-status')).toContainText('Checking model configuration');
  await chat.page.keyboard.press('Escape');await expect(card).toBeVisible();release();
  await expect(chat.page.locator('#model-setup-status')).toContainText('unavailable');await chat.page.getByRole('button',{name:'Check connection',exact:true}).click();
  await expect(chat.page.locator('#model-setup-form')).toBeVisible();await chat.page.getByLabel('API key',{exact:true}).fill('synthetic-unsaved-key');
  await chat.page.evaluate(async()=>{const {apiClient}=await import('/api-client.js');apiClient.forget();});
  await expect(card).toBeHidden();await expect(chat.page.locator('#access-gate')).toBeVisible();await expect(chat.page.locator('#model-key')).toHaveValue('');
  await chat.page.locator('#access-token').fill(chat.accessToken);await chat.page.locator('#access-submit').click();
  await expect(card).toBeVisible();await expect(chat.page.locator('#model-setup-form')).toBeVisible();await expect(chat.page.locator('#chat-send')).toBeDisabled();assert.deepEqual(chat.errors,[]);
});


test('TC-002: provider choices, unavailable retry and existing unlisted model stay user friendly', {timeout:45000},async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'ned-model-picker-'));t.after(()=>rm(root,{recursive:true,force:true}));let inventory=await modelCatalog();
 const models=createModelSetup({home:root,env:{HERMES_HOME:path.join(root,'profile')},modelCatalog:async()=>inventory});
 const chat=await browserChat(t,{modelSetup:models});await chat.ready();const provider=chat.page.getByLabel('Provider',{exact:true}),select=chat.page.getByLabel('Model',{exact:true});
 await expect(select).toHaveJSProperty('tagName','SELECT');await expect(chat.page.locator('#model-hub-link')).toHaveCount(0);
 for(const [id,ids] of Object.entries(inventory)){if(id==='openai-codex')continue;await provider.selectOption(id);await expect(select.locator('option')).toHaveText(ids);await expect(select).toHaveValue(ids[0]);}
 await chat.page.getByLabel('API key',{exact:true}).fill('synthetic-unsaved-provider-key');await provider.selectOption('openai');await expect(chat.page.getByLabel('API key',{exact:true})).toHaveValue('');await select.selectOption('gpt-4.1-mini');await chat.page.getByRole('button',{name:'Check connection',exact:true}).click();await expect(select).toHaveValue('gpt-4.1-mini');
 inventory={};await chat.page.getByRole('button',{name:'Check connection',exact:true}).click();await expect(select).toHaveValue('');await expect(chat.page.getByRole('button',{name:'Connect provider',exact:true})).toBeDisabled();await expect(chat.page.locator('#model-catalog-status')).toContainText('unavailable');
 inventory=await modelCatalog();await chat.page.getByRole('button',{name:'Check connection',exact:true}).click();await expect(select).toHaveValue('gpt-4.1');
 await mkdir(path.join(root,'profile'),{recursive:true,mode:0o700});await (await import('node:fs/promises')).writeFile(path.join(root,'profile/config.yaml'),'model: {provider: openai, default: existing-custom-model, api_key: synthetic-existing-key}\n',{mode:0o600});
 await chat.page.getByRole('button',{name:'Check connection',exact:true}).click();await expect(chat.page.locator('#model-setup')).toBeHidden();await chat.page.getByRole('button',{name:'Model provider',exact:true}).click();await expect(select).toHaveValue('existing-custom-model');await expect(select.locator('option:checked')).toBeDisabled();await expect(chat.page.getByRole('button',{name:'Connect provider',exact:true})).toBeDisabled();await expect(chat.page.locator('#model-setup-close')).toBeVisible();assert.deepEqual(chat.errors,[]);
});
