import {test} from 'node:test';
import {mkdirSync,writeFileSync,symlinkSync,existsSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fixture,assert,join,resolve} from './helpers.js';
import {createHubCredentialStore} from '../../../../src/hub-credentials.js';
import {createSecretStore} from '../../../../src/secrets.js';
import {createComLogger} from '../../../../src/communicator/logging.js';
import {createFileTelemetry} from '../../../../src/telemetry.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {resolveGatewaySettings} from '../../../../src/communicator/gateway-settings.js';

test('TC-003: private stores align with selected root and explicit legacy home remains hermetic',async t=>{
  const f=fixture(t),profile=join(f.base,'new/profile'),other=join(f.base,'other');
  const env={NED_AGENT_HOME:profile,CODEX_THREAD_ID:'ambient',CODEX_HOME:other};
  const hub=createHubCredentialStore({env});const credential={hub:'https://synthetic.invalid',token:'ned_'+ 'x'.repeat(24),tokenId:'synthetic-id',account:{id:'synthetic-user',name:'Fixture'}};
  await hub.write(credential);assert.deepEqual(await hub.read(credential.hub),credential);
  assert.equal(await createHubCredentialStore({env:{NED_AGENT_HOME:other}}).read(credential.hub),null);
  const logger=createComLogger({env,pid:123});assert.equal(logger.path,join(profile,'.ned/logs/com-123.jsonl'));logger.event('synthetic');logger.close();
  const telemetry=createFileTelemetry({env});assert.equal(telemetry.path,join(profile,'.ned/telemetry.json'));await telemetry.enable({consent:true});assert.equal((await telemetry.status()).enabled,true);
  const store=createSecretStore({env});store.set('TOKEN','synthetic-root-value');const exported=store.get('TOKEN',{file:true});assert.equal(exported.path,join(profile,'.ned/secrets/files/TOKEN'));
  assert.equal(statSync(exported.path).mode&0o777,0o600);
  const app=createCommunicatorServer({env});await app.listen();t.after(()=>app.close());
  const response=await fetch(app.url+'/api/secrets',{headers:{'X-NED-Secrets':'1'}});assert.equal(response.status,200);assert.deepEqual((await response.json()).secrets.map(item=>item.key),['TOKEN']);
  assert.equal(existsSync(other),false);
  // Gateway profile selection is independent from the explicit NED storage home.
  const gateway=join(f.base,'gateway-profile');mkdirSync(gateway);writeFileSync(join(gateway,'config.yaml'),'gateway:\n  api_server:\n    port: 19876\n');
  const settings=await resolveGatewaySettings({env:{...env,HERMES_HOME:gateway,NED_HERMES_API_KEY:'synthetic-key'},home:f.home});
  assert.equal(settings.url,'http://127.0.0.1:19876');
  const legacyEnv={CODEX_THREAD_ID:'ambient',CODEX_HOME:other,NED_AGENT_HOME:'invalid'};
  const legacy=createSecretStore({home:f.home,env:legacyEnv});legacy.set('LEGACY','synthetic-legacy');assert.equal(legacy.get('LEGACY'),'synthetic-legacy');
  const legacyHub=createHubCredentialStore({home:f.home,env:legacyEnv});await legacyHub.write(credential);assert.deepEqual(await legacyHub.read(credential.hub),credential);
  const legacyLog=createComLogger({home:f.home,env:legacyEnv,pid:124});assert.equal(legacyLog.path,join(f.home,'.ned/logs/com-124.jsonl'));legacyLog.close();
  assert.equal(createFileTelemetry({home:f.home,env:legacyEnv}).path,join(f.home,'.ned/telemetry.json'));
  assert.deepEqual(readdirSync(f.project),[]);
});

test('TC-003: registered native plugin binds child vault to actual Hermes profile under inherited Codex',t=>{
  const f=fixture(t),profile=join(f.base,'profile'),codex=join(f.base,'codex'),operator=join(f.base,'operator');
  const store=createSecretStore({env:{NED_AGENT_HOME:profile}});store.set('TOKEN','synthetic-native-profile');const exported=store.get('TOKEN',{file:true}).path;
  const modules=join(f.base,'modules');mkdirSync(modules);writeFileSync(join(modules,'hermes_constants.py'),`def get_hermes_home():\n    return ${JSON.stringify(profile)}\n`);
  const install=join(f.home,'.local/share/ned/current');mkdirSync(join(install,'runtime/bin'),{recursive:true});symlinkSync(process.execPath,join(install,'runtime/bin/node'));symlinkSync(resolve('.'),join(install,'app'),'dir');
  const script=`import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('ned_plugin',sys.argv[1]);p=importlib.util.module_from_spec(s);s.loader.exec_module(p)\nclass Context:\n def register_tool(self,**kwargs): self.handler=kwargs['handler']\nc=Context();p.register(c);print(c.handler({'action':'secure_share_secret','path':sys.argv[2]}))`;
  const call=(file,extra={})=>{
    const result=spawnSync(process.env.NED_TEST_PYTHON||'python3',['-c',script,resolve('plugins/ned/__init__.py'),file],{env:{...f.env,PYTHONPATH:modules,CODEX_THREAD_ID:'inherited',CODEX_HOME:codex,HERMES_HOME:join(f.base,'stale-hermes'),...extra},encoding:'utf8',timeout:20000});
    assert.equal(result.status,0,result.stderr);assert.ok(!result.stdout.includes('synthetic-native-profile'));assert.ok(!result.stdout.includes(file));return JSON.parse(result.stdout);
  };
  const grant=call(exported);assert.equal(grant.success,true);assert.equal(store.revealShare(grant.share_id).value,'synthetic-native-profile');assert.equal(existsSync(codex),false);
  const own=createSecretStore({env:{NED_AGENT_HOME:operator}});own.set('TOKEN','synthetic-operator');const ownFile=own.get('TOKEN',{file:true}).path;
  const explicit=call(ownFile,{NED_AGENT_HOME:operator});assert.equal(explicit.success,true);assert.equal(own.revealShare(explicit.share_id).value,'synthetic-operator');
  assert.equal(call(exported,{NED_AGENT_HOME:''}).success,false,'invalid operator override must not fall back');
});
