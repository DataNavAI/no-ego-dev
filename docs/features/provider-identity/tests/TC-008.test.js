import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {hubFixture,token} from './hub-fixture.js';
import {startContainerCom} from '../../../../scripts/container/com.mjs';
import test from 'node:test';
import {browserChat, expect} from '../../communicator/tests/browser-chat-fixture.js';
import {runIdentityCli} from '../../../../src/identity-cli.js';

const arn = 'arn:aws:sts::123456789012:assumed-role/Synthetic/NED';
const challenge = 'https://us-east-1.signin.aws.amazon.com/v1/authorize?request_uri=synthetic';
const credential = 'synthetic-access-key';
const code = 'synthetic-one-time-code';

test('TC-008: AWS console modal hands a code to the isolated CLI and enables confirmed use', async t => {
  const temporaryHomes = [];
  let releaseVerification;
  function awsSpawn(command, args, options) {
    assert.equal(command, 'aws');
    assert.equal(options.env.AWS_ACCESS_KEY_ID, args[0] === 'sts' ? credential : undefined);
    if (args[0] === 'login') {
      assert.deepEqual(args, ['login','--remote','--region','us-east-1']);
      temporaryHomes.push(options.env.HOME);
    }
    if (args[0] === 'configure') releaseVerification = join(options.env.HOME,'verification-ready');
    const programs = {
      login: `console.log(${JSON.stringify(challenge)});let code='';process.stdin.on('data',chunk=>code+=chunk);process.stdin.on('end',()=>{process.exitCode=code===${JSON.stringify(code+'\n')}?0:1;});`,
      configure: `const fs=require('node:fs');const ready=setInterval(()=>{if(!fs.existsSync(${JSON.stringify(releaseVerification)}))return;clearInterval(ready);console.log(JSON.stringify({Version:1,AccessKeyId:${JSON.stringify(credential)},SecretAccessKey:'synthetic-secret',SessionToken:'synthetic-session',Expiration:new Date(Date.now()+3600000).toISOString()}));},20);`,
      sts: `console.log(JSON.stringify({Account:'123456789012',Arn:${JSON.stringify(arn)}}));`,
    };
    return spawn(process.execPath, ['-e', programs[args[0]]], options);
  }
  const hub = await hubFixture(t);
  let local, env, requestId;
  const mockFetch = (url, options) => fetch(local + new URL(url).pathname, {
    ...options, headers:{...options.headers,Origin:local},
  });
  const identityOptions = {awsSpawn,fetch:mockFetch};
  const fixture = await browserChat(t, {identityOptions,deferLogin:true,
    async startApp(options) {
      const file = join(options.home,'hub-token');
      await writeFile(file,token,{mode:0o600});
      env = {...process.env,NED_CONTAINER:'1',NED_HUB_URL:hub.origin,NED_HUB_TOKEN_FILE:file,NED_INSTANCE_NAME:'aws-owner'};
      const app = await startContainerCom({...options,env,port:0,host:'127.0.0.1'});
      local = 'http://127.0.0.1:' + app.server.address().port;
      await hub.ready;
      return {...app,url:hub.origin};
    },
    preparePage(page, origin) {
      return page.context().addCookies([{name:'hub-owner',value:'fixture',url:origin}]);
    },
    async onTurn({home}) {
      let output;
      const io = {log:value=>{output=value;},error:message=>assert.fail(message)};
      assert.equal(await runIdentityCli(['connect','aws','--receipt'],io,{home,env,identityOptions}),0);
      const receipt = JSON.parse(output);
      requestId = receipt.request_id;
      return {reply:'Use the card to connect AWS.',toolRows:[{id:requestId,role:'tool',tool_name:'ned',
        content:JSON.stringify(receipt)}]};
    },
  });
  const origin = hub.origin;
  await fixture.ready();
  async function send(text, count) {
    await fixture.draft.fill(text);
    await fixture.draft.press('Enter');
    await expect.poll(() => fixture.turns.length).toBe(count);
    fixture.turns.at(-1).finish();
  }
  await send('Sign in to AWS', 1);
  const card = fixture.page.locator('.provider-auth-card').last();
  const modal = fixture.page.getByRole('dialog',{name:'Connect AWS'});
  async function openConsoleLogin() {
    await card.getByRole('button',{name:'Review connection'}).click();
    await modal.getByRole('button',{name:'Sign in with AWS Console'}).click();
    await expect(modal.getByRole('link',{name:'Open AWS Console sign-in'})).toHaveAttribute('href',challenge);
  }
  await openConsoleLogin();
  await modal.getByRole('button',{name:'Cancel connection'}).click();
  await expect(modal).toBeHidden();
  await expect.poll(async () => access(temporaryHomes[0]).then(()=>true,()=>false)).toBe(false);
  const staleId = requestId;

  await send('Start another AWS sign-in', 2);
  await openConsoleLogin();
  assert.notEqual(requestId, staleId);
  const stale = await fetch(origin+'/api/v1/identity/aws/start',{method:'POST',headers:{
    Origin:origin,Cookie:'hub-owner=fixture','X-NED-Identity':'1','X-NED-Identity-Id':staleId,'Content-Type':'application/json',
  },body:JSON.stringify({code})});
  assert.equal(stale.status,409);
  await modal.getByLabel('One-time AWS code').fill(code);
  await modal.getByRole('button',{name:'Verify AWS identity'}).click();
  await expect(modal.getByRole('button',{name:'Check verification'})).toBeVisible({timeout:9000});
  await expect(modal.getByRole('link',{name:'Open AWS Console sign-in'})).toHaveCount(0);
  await writeFile(releaseVerification,'ready');
  await modal.getByRole('button',{name:'Check verification'}).click();
  await expect(modal).toContainText(arn);
  await assert.rejects(access(temporaryHomes[1]),{code:'ENOENT'});
  const options = {home:fixture.home,env};
  const log = [];
  const io = {log:value=>log.push(value),error:value=>log.push(value)};
  const execute = ['exec','aws','--','aws','sts','get-caller-identity'];
  assert.equal(await runIdentityCli(execute,io,options),1);
  await modal.getByRole('button',{name:'Confirm connection'}).click();
  await expect(modal).toBeHidden();
  assert.equal(await runIdentityCli(execute,io,{...options,identityOptions:{spawn:awsSpawn}}),0);
  assert.equal(await runIdentityCli(['status','aws'],io,options),0);
  assert.match(log.at(-1), /"status":"connected"/);
  assert.match(log.at(-1), /assumed-role\/Synthetic\/NED/);
  assert.ok(log.every(line => !line.includes(credential) && !line.includes(code)));
});
