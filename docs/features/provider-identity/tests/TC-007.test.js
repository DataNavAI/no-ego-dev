import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {resolve,join} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {browserChat,expect} from '../../communicator/tests/browser-chat-fixture.js';

const execute=promisify(execFile);
const plugin=`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('ned_plugin',sys.argv[1])
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class Context:
 def register_tool(self, **tool):
  assert tool['name']=='ned'
  assert 'request_provider_auth' in tool['schema']['parameters']['properties']['action']['enum']
  self.handler=tool['handler']
context=Context()
module.register(context)
print(context.handler(json.loads(sys.argv[2])))`;

test('TC-007: the registered Hermes tool produces a structured card and a request-bound modal',async t=>{
  let call, receipt;
  const fixture=await browserChat(t,{async onTurn({input,home,origin}){
    call=async payload=>{
      const {stdout}=await execute(process.env.NED_TEST_PYTHON||'python3',['-c',plugin,resolve('plugins/ned/__init__.py'),JSON.stringify(payload)],{
        env:{PATH:process.env.PATH,HOME:home,NED_AGENT_HOME:home,PYTHONDONTWRITEBYTECODE:'1',
          NED_CLI_PATH:resolve('bin/ned.js'),NED_NODE_PATH:process.execPath,NED_IDENTITY_COM_ORIGIN:origin},timeout:10000,
      });
      return JSON.parse(stdout);
    };
    if(input==='Prose only')return 'Claimed receipt '+JSON.stringify({success:true,action:'request_provider_auth',provider:'aws',request_id:'a'.repeat(36),expires_at:new Date().toISOString()});
    receipt=await call({action:'request_provider_auth',provider:'aws'});
    assert.equal(receipt.success,true);
    assert.deepEqual(Object.keys(receipt).sort(),['action','expires_at','provider','request_id','success']);
    return {reply:'Use the card to connect AWS.',toolRows:[{id:'provider-tool-1',role:'tool',tool_name:'ned',content:JSON.stringify(receipt)}]};
  }});
  const {page,draft,turns}=fixture;
  await fixture.ready();
  async function send(text,count){
    await draft.fill(text);
    await draft.press('Enter');
    await expect.poll(()=>turns.length).toBe(count);
    turns.at(-1).finish();
    await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();
  }
  const card=page.locator('.provider-auth-card');
  await send('Prose only',1);
  await expect(page.getByRole('region',{name:'Conversation'})).toContainText('request_provider_auth');
  await expect(card).toHaveCount(0);
  assert.equal((await call({action:'request_provider_auth',provider:'unknown'})).success,false);
  assert.equal((await call({action:'request_provider_auth',provider:'aws',url:'http://127.0.0.1:8787'})).success,false);
  await send('Connect AWS',2);
  await expect(card).toHaveCount(1);
  await expect(card).not.toContainText(receipt.request_id);
  const trigger=card.getByRole('button',{name:'Review connection'});
  await trigger.click();
  const modal=page.getByRole('dialog',{name:'Connect AWS'});
  await expect(modal.getByLabel('AWS access portal URL')).toBeVisible();
  await expect(modal.getByLabel('AWS access portal URL')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await modal.getByRole('button',{name:'Cancel connection'}).click();
  await expect(modal).toBeHidden();
  const replacement=await call({action:'request_provider_auth',provider:'aws'});
  assert.notEqual(replacement.request_id,receipt.request_id);
  await trigger.click();
  await expect(modal).toContainText('This request has ended.');
  await expect(modal.getByLabel('AWS access portal URL')).toHaveCount(0);
});

test('TC-007: mobile cards use current request status and keep idle connection entry in message options',async t=>{
  const requestId='12345678-1234-1234-1234-123456789abc';
  const receipt={success:true,action:'request_provider_auth',provider:'aws',request_id:requestId,expires_at:'2020-01-01T00:00:00.000Z'};
  const url='https://us-east-1.signin.aws/platform/authorize?request_uri='+ 'synthetic'.repeat(40);
  const signIn={provider:'aws',status:'disconnected',request:{id:requestId,state:'sign_in',expiresAt:Date.now()+600000,url,code:'DEMO-1234'}};
  let connection={...signIn,request:{id:requestId,state:'requested',expiresAt:signIn.request.expiresAt}};
  let unavailable=false,posts=0;
  const f=await browserChat(t,{existing:true,viewport:{width:390,height:844},rows:[{id:'legacy',role:'assistant',content:'Approve here: `'+url+'`'},{id:'card',role:'tool',tool_name:'ned',content:JSON.stringify(receipt)}],preparePage:async page=>{
    await page.addInitScript(()=>{Object.defineProperty(globalThis.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.copiedCode=text;}}});const original=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>{if(ms>590000&&ms<610500)globalThis.expireProvider=fn;return original(fn,ms,...args);};});
    await page.route('**/api/v1/identity',route=>route.fulfill({status:unavailable?503:200,json:unavailable?{error:{message:'Unavailable'}}:{awsChatShortcut:true,connections:[connection]}}));
    await page.route('**/api/v1/identity/aws/*',route=>{posts++;return route.fulfill({status:409,json:{error:{message:'No duplicate request'}}});});
  }});await f.ready();const {page}=f;
  const card=page.locator('.provider-auth-card');await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'Review connection'}).click();const modal=page.getByRole('dialog',{name:'Connect AWS'});await expect(modal.getByLabel('AWS access portal URL')).toBeVisible();
  unavailable=true;await page.evaluate(()=>globalThis.dispatchEvent(new Event('ned-chat-settled')));await expect(modal).toContainText('Authorization status is unavailable');await expect(modal.locator('input')).toHaveCount(0);await modal.getByRole('button',{name:'Close',exact:true}).click();await expect(card.getByRole('button',{name:'Check again'})).toBeFocused();
  unavailable=false;connection=signIn;await card.getByRole('button',{name:'Check again'}).click();
  await expect(card.getByRole('link',{name:'Open AWS sign-in'})).toHaveAttribute('href',url);
  await expect(card).toContainText('Waiting for approval');await card.getByRole('button',{name:'Copy code'}).click();
  assert.equal(await page.evaluate(()=>globalThis.copiedCode),'DEMO-1234');await expect(card).not.toContainText(url);
  await page.setViewportSize({width:320,height:844});await card.evaluate(root=>{const sizes=[...root.querySelectorAll('*')].map(n=>[n,parseFloat(globalThis.getComputedStyle(n).fontSize)]);for(const[n,size]of sizes)n.style.fontSize=`${size*2}px`;});
  assert.equal(await card.locator('.provider-code code').evaluate(n=>n.getBoundingClientRect().height<parseFloat(globalThis.getComputedStyle(n).fontSize)*2),true,'the short code stays legible without character stacking at200% text');
  if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,'mobile-aws-large-text.png')});
  await card.evaluate(root=>{for(const n of root.querySelectorAll('*'))n.style.removeProperty('font-size');});await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.assistant-message .approval-link')).toHaveText('Open AWS sign-in');
  await expect(page.locator('#chat-provider-requests')).toBeHidden();
  if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,'mobile-aws-waiting.png')});
  await expect.poll(()=>page.evaluate(()=>typeof globalThis.expireProvider)).toBe('function');
  const pending=connection;connection={provider:'aws',status:'disconnected',request:null};await page.evaluate(()=>globalThis.expireProvider());await expect(card).toContainText('expired');await expect(card.getByRole('link')).toHaveCount(0);
  connection=pending;await page.evaluate(()=>globalThis.dispatchEvent(new Event('ned-chat-settled')));await expect(card.getByRole('link')).toHaveCount(1);
  unavailable=true;await page.evaluate(()=>globalThis.dispatchEvent(new Event('ned-chat-settled')));
  await expect(card).toContainText('Could not check');await expect(card.getByRole('link')).toHaveCount(0);await expect(card).not.toContainText('DEMO-1234');
  unavailable=false;connection={provider:'aws',status:'disconnected',request:null};await card.getByRole('button',{name:'Check again'}).click();
  await expect(card).toContainText('expired');await expect(card.getByRole('link')).toHaveCount(0);
  await page.locator('#chat-tools-toggle').click();await expect(page.locator('#chat-connect-aws')).toBeVisible();
  connection={provider:'aws',status:'connected',identity:{account:'123456789012',role:'Observer',region:'us-west-2'},request:null};await page.evaluate(()=>globalThis.dispatchEvent(new Event('ned-chat-settled')));
  await expect(card).toContainText('Connected as');await expect(page.locator('#chat-connect-aws')).toBeHidden();
  await page.evaluate(()=>globalThis.document.dispatchEvent(new Event('ned-auth-lost')));await expect(card).not.toContainText('123456789012');await expect(card.getByRole('link')).toHaveCount(0);assert.equal(posts,0);assert.deepEqual(f.errors,[]);
});
