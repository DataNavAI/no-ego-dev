import {modelCatalog} from './catalog-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHermesModelAdapter} from '../../../../apps/core/src/hermes-model.js';
import {createModelSetup} from '../../../../apps/core/src/model-setup.js';

const until=async(fn,predicate)=>{for(let i=0;i<1000;i++){const value=await fn();if(predicate(value))return value;await new Promise(r=>setImmediate(r));}throw Error('Expected state not reached');};
async function fixture(t,{clock=Date.now}={}){
  const root=await mkdtemp(path.join(tmpdir(),'ned-device-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});let event,commit,resolve,reject,commits=0,stops=0;
  const adapter={available:async()=>true,async start(input,hooks){event=hooks.event;commit=hooks.beforeCommit;const done=new Promise((yes,no)=>{resolve=yes;reject=no;});queueMicrotask(()=>event({type:'challenge',verificationUri:'https://auth.openai.com/codex/device',userCode:'NED-TEST',deviceSecret:'never-return'}));return {done,stop(){stops++;reject(Error('stopped'));}};}};
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter,clock});t.after(async()=>{await models.close();await rm(root,{recursive:true,force:true});});
  return {models,profile,get commits(){return commits;},get stops(){return stops;},async approve(){let release;try{release=await commit();commits++;await writeFile(path.join(profile,'config.yaml'),'model: {provider: openai, default: persisted}\n',{mode:0o600});resolve();}catch{reject(Error('denied'));}finally{await release?.();}},event:value=>event(value)};
}
async function start(f,authorize=()=>true){return f.models.startLogin({action:'login',nonce:(await f.models.status()).nonce,provider:'openai-codex',model:'fixture-model'},authorize);}
test('TC-003: device challenge is redacted, one active job survives status readback and commits only once',async t=>{
  const f=await fixture(t),job=await start(f);const waiting=await until(()=>f.models.login(job.id),j=>j.state==='waiting');assert.equal(waiting.userCode,'NED-TEST');assert(!JSON.stringify(waiting).includes('never-return'));assert.equal((await f.models.status()).login.id,job.id);await assert.rejects(start(f),e=>e.code==='model_login_active');await f.approve();await until(()=>f.models.login(job.id),j=>j.state==='complete');assert.equal(f.commits,1);assert(!JSON.stringify(f.models.login(job.id)).includes('NED-TEST'));assert((await readFile(path.join(f.profile,'config.yaml'),'utf8')).includes('persisted'));
});
test('TC-003: cancellation, credential revocation and profile replacement cannot commit a pending grant',async t=>{
  for(const mode of ['cancel','revoked','changed'])await t.test(mode,async t=>{
    const f=await fixture(t);let authorized=true;const job=await start(f,()=>authorized);await until(()=>f.models.login(job.id),j=>j.state==='waiting');
    if(mode==='cancel')await f.models.cancelLogin(job.id);else if(mode==='revoked'){authorized=false;assert.throws(()=>f.models.login(job.id),e=>e.status===401);}else await writeFile(path.join(f.profile,'config.yaml'),'agent: {max_turns: 8}\n',{mode:0o600});
    await f.approve();await until(async()=>{try{return f.models.login(job.id);}catch{return {state:'cancelled'};}},j=>['cancelled','failed'].includes(j.state));assert.equal(f.commits,0);
  });
});
test('TC-003: malformed adapter challenge never exposes an arbitrary URL and shutdown cancels pending login',async t=>{
  const f=await fixture(t),job=await start(f);await until(()=>f.models.login(job.id),j=>j.state==='waiting');f.event({type:'challenge',verificationUri:'https://attacker.invalid',userCode:'NED-TEST'});assert.equal(f.models.login(job.id).state,'failed');assert(!JSON.stringify(f.models.login(job.id)).includes('attacker'));assert(f.stops>0);
  const next=await start(f);await until(()=>f.models.login(next.id),j=>j.state==='waiting');await f.models.close();assert.equal(f.commits,0);assert(f.stops>1);
});

test('TC-003: expired challenge terminates its owned process and cannot commit',async t=>{
  let now=10000;const f=await fixture(t,{clock:()=>now}),job=await start(f);await until(()=>f.models.login(job.id),j=>j.state==='waiting');now=job.expiresAt;assert.equal(f.models.login(job.id).state,'expired');await f.approve();assert.equal(f.commits,0);assert(f.stops>0);
});
test('TC-003: Gemini and Claude keys validate at fixed native provider endpoints for hosted overrides',async t=>{
  for(const provider of ['gemini','anthropic'])await t.test(provider,async t=>{
    const root=await mkdtemp(path.join(tmpdir(),'ned-native-key-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});let commits=0;
    const key='synthetic-native-provider-key';const adapter={available:async()=>true,async start(input,hooks){assert.equal(input.action,'configure');assert.equal(input.provider,provider);assert.equal(input.apiKey,key);const done=(async()=>{const release=await hooks.beforeCommit();try{commits++;await writeFile(path.join(profile,'.env'),(provider==='gemini'?'GEMINI_API_KEY':'ANTHROPIC_API_KEY')+'='+key+'\n',{mode:0o600});await writeFile(path.join(profile,'config.yaml'),'model: {provider: '+provider+', default: chosen}\nned_model: {kind: instance}\n',{mode:0o600});}finally{await release();}})();return {done,stop(){}};}};
    const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter,fetch:async(url,options)=>{if(String(url).includes('/api/models/instances/'))return Response.json({configured:false,connection:null,baseUrl:'https://hub.example/api/models/instances/'+ 'a'.repeat(36)+'/v1'});assert.equal(url,provider==='gemini'?'https://generativelanguage.googleapis.com/v1beta/models':'https://api.anthropic.com/v1/models');assert.equal(options.headers[provider==='gemini'?'x-goog-api-key':'x-api-key'],key);assert.equal(options.redirect,'error');return new Response('{}');}});
    t.after(async()=>{await models.close();await rm(root,{recursive:true,force:true});});
    await models.register({origin:'https://hub.example',id:'11111111-1111-4111-8111-111111111111',token:'ned_'+'a'.repeat(43),kind:'hosted'});
    const result=await models.configure({nonce:(await models.status()).nonce,provider,model:'chosen',apiKey:key});assert.equal(result.configured,true);assert.equal(commits,1);assert.equal((await models.prepare()).provider,provider);assert(!(JSON.stringify(await models.status())).includes(key));
  });
});

test('TC-003: cancellation retains its process slot until the owned child actually exits',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-device-stop-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});const exits=[];let started=0;
  const adapter={available:async()=>true,async start(input,hooks){started++;const done=new Promise((resolve,reject)=>{exits.push(()=>reject(Error('owned child exited')));});queueMicrotask(()=>hooks.event({type:'challenge',verificationUri:'https://auth.openai.com/codex/device',userCode:'NED-TEST'}));return {done,stop(){/* Termination requested; the controlled child has not exited. */}};}};
  const models=createModelSetup({modelCatalog,home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter});t.after(async()=>{for(const exit of exits)exit();await models.close();await rm(root,{recursive:true,force:true});});
  const request=async()=>models.startLogin({action:'login',nonce:(await models.status()).nonce,provider:'openai-codex',model:'fixture'},()=>true);
  const job=await request();await until(()=>models.login(job.id),j=>j.state==='waiting');const cancelling=models.cancelLogin(job.id);await assert.rejects(request(),e=>e.code==='model_login_active');assert.equal(started,1);for(const exit of exits)exit();await cancelling;
});

test('TC-003: closing the adapter before or during interpreter discovery cannot create a late process',async()=>{
  for(const race of [false,true]){
    const adapter=createHermesModelAdapter({env:{NED_HERMES_PYTHON:process.execPath},profile:tmpdir()});
    if(race){const attempt=adapter.start({action:'inspect'});void attempt.catch(()=>{});await adapter.close();await assert.rejects(attempt,/closed/);}else{await adapter.close();await assert.rejects(adapter.start({action:'inspect'}),/closed/);}
    assert.equal(await adapter.available(),false);
  }
});

for(const [provider,verificationUri]of [
  ['claude-subscription-directsdk-experimental','https://claude.ai/oauth/authorize?opaque-synthetic-challenge'],
  ['antigravity-subscription-directsdk','https://accounts.google.com/o/oauth2/auth?state=synthetic'],
])test('TC-003: '+provider+' manual authorization codes are submitted once and never read back',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-manual-code-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});let resolve,reject,submissions=0;
  const adapter={available:async()=>true,async start(input,hooks){
    assert.equal(input.action,'subscription');assert.equal(input.provider,provider);
    const done=new Promise((yes,no)=>{resolve=yes;reject=no;});queueMicrotask(()=>hooks.event({type:'challenge',method:'manual_code',verificationUri}));
    return {done,stop(){reject(Error('stopped'));},submit(code){assert.equal(code,'synthetic-authorization-code');submissions++;}};
  }};
  const service=createModelSetup({home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter,modelCatalog:async()=>({[provider]:['fixture-model']})});
  t.after(async()=>{resolve();await service.close();await rm(root,{recursive:true,force:true});});
  const nonce=(await service.status()).nonce,job=await service.startLogin({action:'login',nonce,provider,model:'fixture-model'},()=>true);
  const waiting=await until(()=>service.login(job.id),j=>j.state==='waiting');assert.equal(waiting.method,'manual_code');assert.equal(waiting.acceptsCode,true);assert.equal(waiting.provider,provider);
  assert.throws(()=>service.submitLoginCode(job.id,'bad\ncode'),e=>e.status===400);assert.equal(submissions,0);
  const submitted=service.submitLoginCode(job.id,'synthetic-authorization-code');assert.equal(submitted.acceptsCode,false);assert(!JSON.stringify(submitted).includes('synthetic-authorization-code'));
  assert.throws(()=>service.submitLoginCode(job.id,'synthetic-authorization-code'),e=>e.status===409);assert.equal(submissions,1);
  await service.cancelLogin(job.id);assert.throws(()=>service.submitLoginCode(job.id,'synthetic-authorization-code'),e=>e.status===409);
});

test('TC-003: manual code rejects an expired or revoked job before passing input to its client',async t=>{
  for(const mode of ['revoked','expired'])await t.test(mode,async t=>{
    const root=await mkdtemp(path.join(tmpdir(),'ned-manual-denial-')),profile=path.join(root,'profile');await mkdir(profile,{mode:0o700});let authorized=true,now=1000,reject;
    const provider='antigravity-subscription-directsdk',adapter={available:async()=>true,async start(input,hooks){const done=new Promise((_,no)=>{reject=no;});queueMicrotask(()=>hooks.event({type:'challenge',method:'manual_code',verificationUri:'https://accounts.google.com/o/oauth2/auth?state=synthetic'}));return {done,stop(){reject(Error('stopped'));},submit(){assert.fail('denied code reached client');}};}};
    const service=createModelSetup({home:root,env:{HERMES_HOME:profile},hermesAdapter:adapter,clock:()=>now,modelCatalog:async()=>({[provider]:['fixture']})});t.after(async()=>{await service.close();await rm(root,{recursive:true,force:true});});
    const job=await service.startLogin({action:'login',nonce:(await service.status()).nonce,provider,model:'fixture'},()=>authorized);await until(()=>service.login(job.id),j=>j.state==='waiting');
    if(mode==='revoked')authorized=false;else now=job.expiresAt;
    assert.throws(()=>service.submitLoginCode(job.id,'synthetic-authorization-code'),e=>e.status===(mode==='revoked'?401:409));
  });
});
