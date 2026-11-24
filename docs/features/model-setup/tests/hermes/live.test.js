import test from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {createHermesModelAdapter} from '../../../../../apps/core/src/hermes-model.js';

test('TC-003 Hermes: real device exchange/store and Gemini/Claude config use private installed Hermes semantics',{timeout:45000},async t=>{
  const python=process.env.NED_HERMES_TEST_PYTHON,source=process.env.NED_HERMES_TEST_SOURCE;if(!python||!source)throw Error('Use npm run test:core:hermes; actual adapter acceptance never skips');
  const root=await mkdtemp(path.join(tmpdir(),'ned-hermes-auth-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const launcher=path.join(root,'python'),fixture=fileURLToPath(new URL('./provider-boundary.py',import.meta.url));
  await writeFile(launcher,'#!'+python+'\n'+await readFile(fixture,'utf8'),{mode:0o700});
  for(const provider of ['openai-codex','gemini','anthropic']){
    const profile=path.join(root,provider);await mkdir(profile,{mode:0o700});await writeFile(path.join(profile,'config.yaml'),'agent: {max_turns: 7}\n',{mode:0o600});
    const adapter=createHermesModelAdapter({env:{PATH:'/usr/bin:/bin',NED_HERMES_SOURCE:source,NED_HERMES_PYTHON:launcher},profile});assert(await adapter.available());const catalog=await adapter.catalog();for(const id of ['openai','openrouter','gemini','anthropic','openai-codex']){assert(catalog[id].length>0);assert(catalog[id].length<=100);assert(catalog[id].every(model=>typeof model==='string'&&model.length<=200));}const chatModels=JSON.parse(execFileSync(python,['-I','-c',"import json,os,sys;sys.path.insert(0,os.environ['NED_HERMES_SOURCE']);from hermes_cli.models import _PROVIDER_MODELS;print(json.dumps(_PROVIDER_MODELS['openai']))"],{env:{PATH:'/usr/bin:/bin',HOME:root,HERMES_HOME:profile,NED_HERMES_SOURCE:source},encoding:'utf8',stdio:['pipe','pipe','pipe']}));assert(catalog.openai.every(id=>chatModels.includes(id)));assert.equal(catalog.openai[0],chatModels[0]);let challenges=0,commits=0;
    const key=provider==='gemini'?'AIza'+ 'S'.repeat(35):'sk-ant-api03-'+ 'S'.repeat(100);
    const operation=await adapter.start({action:provider==='openai-codex'?'device':'configure',provider,model:'synthetic-model',...(provider==='openai-codex'?{}:{apiKey:key})},{event:m=>{const raw=JSON.stringify(m);assert(!raw.includes(key)&&!raw.includes('private-device-id')&&!raw.includes('private-refresh-token'));if(m.type==='challenge'){challenges++;assert.equal(m.userCode,'NED-TEST');}},beforeCommit:async()=>{commits++;return ()=>{};}});
    await operation.done;assert.equal(commits,1);assert.equal(challenges,provider==='openai-codex'?1:0);
    const config=parse(await readFile(path.join(profile,'config.yaml'),'utf8'));assert.equal(config.model.provider,provider);assert.equal(config.model.default,'synthetic-model');assert.equal(config.agent.max_turns,7);assert.equal((await stat(path.join(profile,'config.yaml'))).mode&0o777,0o600);
    const privateFile=path.join(profile,provider==='openai-codex'?'auth.json':'.env');const raw=await readFile(privateFile,'utf8');assert(raw.includes(provider==='openai-codex'?'private-refresh-token':key));assert.equal((await stat(privateFile)).mode&0o777,0o600);
    if(provider!=='openai-codex'){
      const code=`import json,os,sys;sys.path.insert(0,os.environ['NED_HERMES_SOURCE']);from hermes_cli.runtime_provider import resolve_runtime_provider;i=json.load(sys.stdin);r=resolve_runtime_provider(requested=i['provider']);assert r['api_key']==i['key'];assert r['provider']==i['provider'];print(json.dumps({'provider':r['provider'],'apiMode':r['api_mode']}))`;
      const runtime=JSON.parse(execFileSync(python,['-I','-c',code],{input:JSON.stringify({provider,key}),env:{PATH:'/usr/bin:/bin',HOME:root,HERMES_HOME:profile,NED_HERMES_SOURCE:source},encoding:'utf8',stdio:['pipe','pipe','pipe']}));assert.equal(runtime.provider,provider);assert(runtime.apiMode);
    }
    const disconnect=await adapter.start({action:'disconnect',provider,model:'disconnected'},{beforeCommit:async()=>()=>{}});await disconnect.done;const removed=parse(await readFile(path.join(profile,'config.yaml'),'utf8'));assert.equal(removed.model.provider,'custom:ned-unconfigured');assert.equal(removed.model.default,'');assert(!(await readFile(privateFile,'utf8')).includes(provider==='openai-codex'?'private-refresh-token':key));await adapter.close();
  }
  for(const [kind,owned] of [['local','ned-model'],['hub','ned-hub']]){
    const profile=path.join(root,kind);await mkdir(profile,{mode:0o700});
    const config={model:{provider:'custom:'+owned,default:'synthetic-model'},ned_model:{kind,provider:owned},providers:{[owned]:{api_key:'synthetic-private-owned-key',base_url:'https://api.openai.com/v1'},unrelated:{api_key:'synthetic-unrelated-key'}}};
    await writeFile(path.join(profile,'config.yaml'),JSON.stringify(config),{mode:0o600});
    const adapter=createHermesModelAdapter({env:{PATH:'/usr/bin:/bin',NED_HERMES_SOURCE:source,NED_HERMES_PYTHON:launcher},profile});
    const operation=await adapter.start({action:'disconnect',provider:'hub',model:'disconnected'},{beforeCommit:async()=>()=>{}});await operation.done;
    const removed=parse(await readFile(path.join(profile,'config.yaml'),'utf8'));assert.equal(removed.model.provider,'custom:ned-unconfigured');assert.equal(removed.providers[owned],undefined);assert.equal(removed.providers.unrelated.api_key,'synthetic-unrelated-key');assert.equal(removed.ned_model.kind,'instance');await adapter.close();
  }
});

test('TC-003 Hermes: actual Antigravity plugin never borrows launch-profile credentials or keyring',{timeout:15000},async t=>{
  const python=process.env.NED_HERMES_TEST_PYTHON,source=process.env.NED_HERMES_TEST_SOURCE;if(!python||!source)throw Error('Use npm run test:core:hermes');
  const root=await mkdtemp(path.join(tmpdir(),'ned-subscription-scope-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const result=JSON.parse(execFileSync(python,['-I',fileURLToPath(new URL('./subscription-scope.py',import.meta.url)),root],{env:{PATH:'/usr/bin:/bin',HOME:root,HERMES_HOME:root,NED_HERMES_TEST_SOURCE:source},encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:12000}));
  assert.deepEqual(result,{profiles:2,scope:'PASS',hostFallback:'DENIED'});
});
