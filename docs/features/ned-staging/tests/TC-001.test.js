import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingEnvironment,validateLaunch,createStagingController} from '../../../../src/staging/controller.js';

test('TC-001: staging credentials and unsafe preserved settings fail closed',()=>{
  const options={root:'/tmp/owned-stage',node:process.execPath,systemPath:'/usr/bin:/bin'};
  const env=stagingEnvironment(options,{HOME:'/real/home',CODEX_HOME:'/real/codex',GH_TOKEN:'normal-token',OPENROUTER_API_KEY:'normal-key',BASH_ENV:'/normal/rc'});
  assert.equal(env.HOME,'/real/home');assert.equal(env.CODEX_HOME,undefined);assert.equal(env.GH_TOKEN,undefined);assert.equal(env.OPENROUTER_API_KEY,undefined);assert.equal(env.BASH_ENV,undefined);
  assert.equal(env.HERMES_HOME,'/tmp/owned-stage/hermes/profiles/ned-staging');
  const safe={model:{provider:'openrouter'},terminal:{backend:'local',cwd:'/tmp/owned-stage/projects',auto_source_bashrc:false,shell_init_files:[]},fallback_providers:[],auxiliary:{summary:{provider:'auto'}},skills:{external_dirs:[]}};
  assert.doesNotThrow(()=>validateLaunch(options,safe));
  for(const provider of ['openai-codex','qwen','bedrock']) assert.throws(()=>validateLaunch(options,{...safe,model:{provider}}),/provider/);
  assert.throws(()=>validateLaunch(options,{...safe,terminal:{...safe.terminal,auto_source_bashrc:true}}),/terminal/);
  assert.throws(()=>validateLaunch(options,{...safe,auxiliary:{summary:{provider:'openai-codex'}}}),/provider/);
  assert.throws(()=>validateLaunch(options,{...safe,skills:{external_dirs:['/normal/skills']}}),/[Ee]xternal/);
  assert.equal(typeof createStagingController,'function');
});

test('TC-001: interrupted initial installation retries without deleting user data or manual lock repair',async t=>{
 const {fixture}=await import('./fixtures.js');const f=await fixture(t);
 f.setBoundary(phase=>{if(phase==='native_update_completed'){const e=new Error('initial crash');e.simulatedCrash=true;throw e;}});
 await assert.rejects(f.controller.setup(),/initial crash/);f.setBoundary(null);
 assert.equal((await f.controller.setup()).result,'updated');assert.equal(f.task(),'Stage task');assert.equal((await f.controller.setup()).result,'unchanged');
});
test('TC-001: dotenv fallback and external secret sources are rejected before native loading',()=>{
 const options={root:'/tmp/owned-stage',node:process.execPath};
 const safe={model:{provider:'openrouter'},terminal:{backend:'local',cwd:'/tmp/owned-stage/projects',auto_source_bashrc:false,shell_init_files:[]}};
 for(const unsafe of [{env_present:false},{env_keys:['OPENROUTER_API_KEY','OPENAI_BASE_URL']},{external_secrets:true},{op_env_present:true}])assert.throws(()=>validateLaunch(options,{...safe,...unsafe}),/environment|secret-source/);
 assert.doesNotThrow(()=>validateLaunch(options,{...safe,env_present:true,env_keys:['OPENROUTER_API_KEY']}));
});
test('TC-001: CLI projects remain canonical staging folders and normal scopes are rejected',async t=>{
 const {fixture}=await import('./fixtures.js');const {stagingCliArguments}=await import('../../../../src/staging/controller.js');const f=await fixture(t);await f.controller.setup();
 assert.deepEqual(await stagingCliArguments(f.root,['task','list']),['task','list','--project',f.root+'/projects/alpha']);
 await assert.rejects(stagingCliArguments(f.root,['task','init','--project',f.root+'/hermes']),/owned/);
 await assert.rejects(stagingCliArguments(f.root,['task','list','--database','/normal/db']),/forbidden/);
 await assert.rejects(stagingCliArguments(f.root,['doctor']),/local staging/);
});
test('TC-001: native argv cannot override guarded provider model credentials tools or terminal settings',async()=>{
 const {stagingHermesArguments}=await import('../../../../src/staging/controller.js');
 for(const args of [[],['chat'],['--help'],['--version'],['skills','list'],['chat','-q','Try staging','--oneshot']])assert.deepEqual(stagingHermesArguments(args),args);
 for(const override of [['--provider','openai-codex'],['--provider=qwen'],['--base-url','https://external.invalid'],['--api-key=synthetic'],['--model','x'],['-m','x'],['-mx'],['--toolsets','all'],['-t','all'],['--query-file','/normal/file'],['--config','/normal/config'],['--terminal-cwd=/normal']]){
  assert.throws(()=>stagingHermesArguments(['chat',...override]),/overrides/);assert.throws(()=>stagingHermesArguments(override),/overrides/);
 }
 assert.throws(()=>stagingHermesArguments(['skills','list','--provider=qwen']),/overrides/);
});
test('TC-001: STAGE-R1-001 effective endpoint and auxiliary credential flags reject native consumed overrides',()=>{
 const options={root:'/tmp/stage',node:process.execPath};const config={model:{provider:'openrouter'},terminal:{backend:'local',cwd:'/tmp/stage/projects',auto_source_bashrc:false,shell_init_files:[]}};
 for(const value of [{...config,model:{provider:'openrouter',api_base:true}},{...config,auxiliary:{compression:{provider:'auto',base_url:true}}},{...config,auxiliary:{compression:{provider:'auto',api_key:true}}},{...config,custom_providers:{configured:true}}])assert.throws(()=>validateLaunch(options,value),/provider|override/);
});
test('TC-001: STAGE-R1-002 mutable DB and profile boundaries reject external symlinks before consumers',async t=>{
 const {fixture}=await import('./fixtures.js');const fs=await import('node:fs/promises');const f=await fixture(t);await f.controller.setup();const moved=f.root+'/outside.sqlite';await fs.rename(f.db,moved);await fs.symlink(moved,f.db);await assert.rejects(f.controller.preflight(),/unsafe|replaced|symbolic/i);await fs.unlink(f.db);await fs.rename(moved,f.db);const before=await fs.readFile(f.profile+'/config.yaml');await fs.rename(f.profile+'/config.yaml',f.root+'/outside-config');await fs.symlink(f.root+'/outside-config',f.profile+'/config.yaml');await assert.rejects(f.controller.update(),/unsafe|replaced|symbolic/i);assert.deepEqual(await fs.readFile(f.root+'/outside-config'),before);await fs.unlink(f.profile+'/config.yaml');await fs.rename(f.root+'/outside-config',f.profile+'/config.yaml');const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');await promisify(execFile)('mkfifo',[f.root+'/controller.lock']);assert.equal((await f.controller.status()).health,'unavailable');await fs.unlink(f.root+'/controller.lock');
});
test('TC-001: STAGE-R1-004 npm runtime paths do not use normal HOME defaults',()=>{
 const env=stagingEnvironment({root:'/tmp/owned-stage',node:process.execPath},{HOME:'/normal'});assert.equal(env.NPM_CONFIG_USERCONFIG,'/tmp/owned-stage/npm/user.npmrc');assert.equal(env.NPM_CONFIG_GLOBALCONFIG,'/tmp/owned-stage/npm/global.npmrc');assert.equal(env.NPM_CONFIG_CACHE,'/tmp/owned-stage/npm/cache');assert.equal(env.HOME,'/normal');
});
test('TC-001: STAGE-R2-001 promotion between release selection and locked launch never executes stale code',async t=>{
 const {fixture,B}=await import('./fixtures.js');const fs=await import('node:fs/promises');const f=await fixture(t);await f.controller.setup();
 let selected,continueLaunch;const selectedBarrier=new Promise(resolve=>selected=resolve),promotionBarrier=new Promise(resolve=>continueLaunch=resolve);const marker=f.root+'/projects/launched-release';
 const launching=(async()=>{const {active}=await f.controller.preflight();selected();await promotionBarrier;return f.controller.preflight({launch:{selectedActive:active,executable:process.execPath,argv:['-e',`require('node:fs').writeFileSync(${JSON.stringify(marker)},${JSON.stringify(active.sha)})`]}});})();
 await selectedBarrier;f.setMain(B);await f.controller.update();const before=await f.read('status.json');continueLaunch();await assert.rejects(launching,/release changed/i);await assert.rejects(fs.stat(marker),{code:'ENOENT'});assert.deepEqual(await f.read('status.json'),before);assert.equal(f.task(),'Stage task');
 const {active}=await f.controller.preflight();await assert.rejects(f.controller.preflight({launch:{selectedActive:{...active,cli_digest:'0'.repeat(64)},executable:process.execPath,argv:['-e','process.exit(4)']}}),/release changed/i);
 const {handle}=await f.controller.preflight({launch:{selectedActive:active,executable:process.execPath,argv:['-e',`require('node:fs').writeFileSync(${JSON.stringify(marker)},${JSON.stringify(B)})`]}});assert.equal((await handle.done).code,0);assert.equal(await fs.readFile(marker,'utf8'),B);assert.equal((await f.controller.recoverWork()).result,'work_reconciled');assert.equal((await f.controller.status()).active.sha,B);
});
