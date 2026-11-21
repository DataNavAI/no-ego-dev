import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parse} from 'yaml';
import {createModelSetup} from '../../../../apps/core/src/model-setup.js';
import {createCommunicatorServer} from '../../../../apps/com/src/server.js';
import {exposeNedApiPath} from '../../../../apps/core/src/api-paths.js';
async function fixture(t,{config='',env={},fetch:request=async()=>new Response('{}'),enabled=true}={}){
  const root=await mkdtemp(path.join(tmpdir(),'ned-model-setup-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});if(config)await writeFile(path.join(profile,'config.yaml'),config,{mode:0o600});
  const models=createModelSetup({home:root,env:{HERMES_HOME:profile,...env},fetch:request,enabled});
  t.after(async()=>{await models.close();await rm(root,{recursive:true,force:true});});return {root,profile,models,file:path.join(profile,'config.yaml')};
}
test('TC-001: private local setup validates provider, preserves YAML and consumes opaque writes once',async t=>{
  let calls=0;
  const f=await fixture(t,{config:'agent:\n  max_turns: 7\n',fetch:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/models');assert.equal(options.headers.Authorization,'Bearer synthetic-provider-key');assert.equal(options.redirect,'error');return new Response('{}');}});
  const status=await f.models.status();assert.equal(status.configured,false);assert.match(status.nonce,/^[A-Za-z0-9_-]{43}$/);
  const input={nonce:status.nonce,provider:'openai',model:'gpt-4.1',apiKey:'synthetic-provider-key'};
  assert.deepEqual(await f.models.configure(input),{configured:true,source:'profile',model:'gpt-4.1'});
  const saved=parse(await readFile(f.file,'utf8'));assert.equal(saved.agent.max_turns,7);assert.equal(saved.model.default,'gpt-4.1');assert.equal(saved.providers['ned-model'].api_key,input.apiKey);assert.equal((await stat(f.file)).mode&0o777,0o600);
  assert.equal((await f.models.status()).configured,true);assert(!(JSON.stringify(await f.models.status())).includes(input.apiKey));
  await assert.rejects(f.models.configure(input),error=>error.status===400);assert.equal(calls,1);
  await f.models.configure({...input,nonce:(await f.models.status()).nonce,model:'gpt-4.1-mini',replace:true});assert.equal((await f.models.prepare()).model,'gpt-4.1-mini');assert.equal(calls,2);assert.equal(parse(await readFile(f.file,'utf8')).agent.max_turns,7);
});
test('TC-001: invalid credentials, stale profile and unsafe files never overwrite state',async t=>{
  const f=await fixture(t,{config:'agent: {max_turns: 8}\n',fetch:async()=>new Response('private provider detail',{status:401})});
  const before=await readFile(f.file,'utf8'),input={nonce:(await f.models.status()).nonce,provider:'openrouter',model:'openai/gpt-4.1',apiKey:'synthetic-provider-key'};
  await assert.rejects(f.models.configure(input),error=>error.status===422&&!error.message.includes('private provider detail'));assert.equal(await readFile(f.file,'utf8'),before);
  const next=(await f.models.status()).nonce;await writeFile(f.file,'agent: {max_turns: 9}\n');await assert.rejects(f.models.configure({...input,nonce:next}),error=>error.status===409);
  await writeFile(path.join(f.profile,'.env'),'OPENAI_API_KEY=synthetic-provider-key\n',{mode:0o644});await assert.rejects(f.models.status());
  await rm(path.join(f.profile,'.env'));await rm(f.file);await symlink(path.join(f.root,'outside'),f.file);await assert.rejects(f.models.status());
});
test('TC-001: account inheritance stores scoped capability, preserves valid override and blocks revoked/default mismatch',async t=>{
  const id=randomUUID(),connection={id:randomUUID(),version:randomUUID(),provider:'openai',model:'gpt-4.1'},token='ned_'+ 'a'.repeat(43),origin='https://staging.ned.datanav.app';let configured=true;
  const f=await fixture(t,{config:'agent: {max_turns: 4}\n',fetch:async(url,options)=>{assert.equal(url,origin+'/api/models/instances/'+id+'?verify=1');assert.equal(options.headers.Authorization,'Bearer '+token);return Response.json({configured,connection:configured?connection:null,baseUrl:origin+'/api/models/instances/'+id+'/v1'});}});
  await f.models.register({origin,id,token,kind:'hosted'});assert.equal((await f.models.status()).configured,true);assert.deepEqual(await f.models.prepare(),{provider:'custom:ned-hub',model:'gpt-4.1'});
  const raw=await readFile(f.file,'utf8'),saved=parse(raw);assert.equal(saved.providers['ned-hub'].api_key,token);assert(!raw.includes('synthetic-provider-key'));assert.equal(saved.agent.max_turns,4);
  connection.version=randomUUID();connection.model='gpt-4.1-mini';assert.equal((await f.models.status()).configured,false);assert.equal((await f.models.prepare()).model,'gpt-4.1-mini');
  configured=false;await assert.rejects(f.models.prepare(),error=>error.code==='model_setup_required');assert.equal((await f.models.status()).configured,false);assert.equal((await stat(f.file)).mode&0o777,0o600);
  await f.models.register({origin,id:randomUUID(),token,kind:'hosted'});assert.equal((await f.models.status()).configured,false);await assert.rejects(f.models.prepare(),error=>error.code==='model_setup_required');
  const override=await fixture(t,{config:'model: {provider: openai, default: my-local-model}\n',env:{OPENAI_API_KEY:'existing-profile-key'},fetch:async()=>{throw Error('Existing provider must bypass Hub');}});
  await override.models.register({origin,id,token,kind:'hosted'});assert.equal((await override.models.status()).source,'profile');assert.equal((await override.models.prepare()).model,'my-local-model');assert(!(await readFile(override.file,'utf8')).includes('ned-hub'));
});
test('TC-001: Core-owned model setup rejects missing Origin/header, public exposure and chat before configuration',async t=>{
  const f=await fixture(t);const app=createCommunicatorServer({home:f.root,env:{HERMES_HOME:f.profile,NED_HERMES_URL:'http://127.0.0.1:9',NED_HERMES_API_KEY:'synthetic-gateway-key'},databasePath:path.join(f.root,'ned.sqlite'),initializeDatabase:true,modelSetup:f.models});await app.listen();t.after(()=>app.close());
  const call=(method='GET',body,headers={})=>fetch(app.url+'/api/v1/model-setup',{method,headers:{'X-NED-Models':'1','Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await call()).status,200);assert.equal((await call('POST',{})).status,403);assert.equal((await call('GET',null,{'X-NED-Models':''})).status,403);assert.equal((await call('POST',{}, {Origin:app.url})).status,400);
  const chat=await fetch(app.url+'/api/v1/chat/sessions/fixture/chat',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Blocked before provider setup'})});assert.equal(chat.status,409);assert.equal((await chat.json()).error.code,'model_setup_required');
  for(const route of ['/api/v1/model-setup','/api/model-setup']){assert.equal(exposeNedApiPath(route),true);assert.equal(exposeNedApiPath(route,{publicTunnel:true}),false);}
  const denied=createCommunicatorServer({home:f.root,env:{HERMES_HOME:f.profile},databasePath:path.join(f.root,'ned.sqlite'),secretsEnabled:false});await denied.listen();t.after(()=>denied.close());assert.equal((await fetch(denied.url+'/api/v1/model-setup',{headers:{'X-NED-Models':'1'}})).status,403);
});
