import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {resolve} from 'node:path';
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
  await expect(modal.getByLabel('AWS region')).toBeVisible();
  await expect(modal.getByLabel('AWS region')).toBeFocused();
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
  await expect(modal.getByLabel('AWS region')).toHaveCount(0);
});
