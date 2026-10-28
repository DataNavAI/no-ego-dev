import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {loginToHub,runHubAuthentication} from '../../../../src/hub-cli.js';
import {createHubCredentialStore,canonicalHubOrigin} from '../../../../src/hub-credentials.js';
import {runCli} from '../../../../src/cli.js';
import {runCommunicatorCli} from '../../../../src/communicator/cli.js';
const token='ned_synthetic_oauth_credential_0000000000';
const account={id:'account-fixture',name:'Fixture operator',email:'fixture@example.test'};
const code='synthetic_authorization_code_00000000';
async function fixture(t,handler){
  const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  return `http://127.0.0.1:${server.address().port}`;
}
async function storage(t){const home=await fs.mkdtemp(path.join(os.tmpdir(),'ned-oauth-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));return {home,store:createHubCredentialStore({home})};}
function callbackUrl(authorize,params={code}){const a=new URL(authorize),callback=new URL(a.searchParams.get('redirect_uri'));callback.searchParams.set('state',a.searchParams.get('state'));for(const [k,v]of Object.entries(params))callback.searchParams.set(k,v);return callback;}
const quiet={log(){},error(){}};

test('TC-016: native PKCE login saves the returned account privately and never puts credentials in the browser URL or output',async t=>{
  const {home,store}=await storage(t);let authorization,exchanged=0;
  const origin=await fixture(t,async(req,res)=>{
    assert.equal(req.url,'/api/oauth/token');assert.equal(req.method,'POST');assert.equal(req.headers.origin,undefined);
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);exchanged++;
    assert.deepEqual(Object.keys(body).sort(),['client_id','code','code_verifier','grant_type','redirect_uri']);
    assert.equal(body.code,code);assert.equal(body.client_id,'ned-cli');assert.equal(body.grant_type,'authorization_code');
    assert.equal(body.redirect_uri,authorization.searchParams.get('redirect_uri'));
    assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'),authorization.searchParams.get('code_challenge'));
    assert.equal(authorization.href.includes(body.code_verifier),false);
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({access_token:token,token_type:'Bearer',token_id:'token-fixture',account}));
  });
  const output=[];
  const credential=await loginToHub(origin,{store,io:{log:s=>output.push(s)},openBrowser:async url=>{
    authorization=new URL(url);assert.equal(authorization.origin,origin);assert.equal(authorization.pathname,'/api/oauth/authorize');
    assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');assert.equal(authorization.searchParams.get('response_type'),'code');
    assert.match(authorization.searchParams.get('state'),/^[A-Za-z0-9_-]{43}$/);
    const callback=callbackUrl(url);assert.equal(callback.hostname,'127.0.0.1');
    const response=await fetch(callback);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
    assert.equal((await response.text()).includes(code),false);
  }});
  assert.equal(exchanged,1);assert.deepEqual(await store.read(origin),credential);assert.deepEqual(credential.account,account);
  assert.equal(output.join('\n').includes(token),false);assert.equal(output.join('\n').includes(code),false);
  const directory=path.join(home,'.ned','hub-credentials');assert.equal((await fs.stat(directory)).mode&0o777,0o700);
  const files=await fs.readdir(directory);assert.equal(files.length,1);assert.equal((await fs.stat(path.join(directory,files[0]))).mode&0o777,0o600);
  assert.equal(await store.read('https://other.example'),null);
});

test('TC-016: wrong Host, path, duplicate state and wrong state cannot consume the pending login',async t=>{
  const {store}=await storage(t);let exchanges=0;
  const origin=await fixture(t,(_req,res)=>{exchanges++;res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:token,token_type:'Bearer',token_id:'token-fixture',account}));});
  let browser;
  await loginToHub(origin,{store,io:quiet,openBrowser:async url=>{
    browser=(async()=>{
      const callback=callbackUrl(url),wrong=new URL(callback);wrong.searchParams.set('state','x'.repeat(43));assert.equal((await fetch(wrong)).status,400);
      const duplicate=new URL(callback);duplicate.searchParams.append('state',new URL(url).searchParams.get('state'));assert.equal((await fetch(duplicate)).status,400);
      const badPath=new URL(callback);badPath.pathname='/other';assert.equal((await fetch(badPath)).status,400);
      await new Promise((resolve,reject)=>{const request=http.get(callback,{headers:{Host:'attacker.example'}},response=>{assert.equal(response.statusCode,400);response.resume();response.on('end',resolve);});request.on('error',reject);});
      assert.equal((await fetch(callback)).status,200);
    })();return browser;
  }});
  await browser;assert.equal(exchanges,1);
});

test('TC-016: denial, failed exchange, redirect, oversized response, timeout and interruption preserve a good credential',async t=>{
  for(const mode of ['denied','exchange-failure','redirect','oversized','invalid-token','timeout','interrupted'])await t.test(mode,async t=>{
    const {store}=await storage(t);let foreignCalls=0;
    const foreign=await fixture(t,(_req,res)=>{foreignCalls++;res.end();});
    const origin=await fixture(t,(_req,res)=>{
      if(mode==='exchange-failure'){res.writeHead(503);res.end();return;}
      if(mode==='redirect'){res.writeHead(302,{location:foreign});res.end();return;}
      res.setHeader('content-type','application/json');
      res.end(mode==='oversized'?'x'.repeat(8193):JSON.stringify({access_token:'bad',token_type:'Bearer',token_id:'id',account}));
    });
    const previous={hub:origin,token,tokenId:'previous',account};await store.write(previous);
    const controller=new AbortController();let callback;
    await assert.rejects(loginToHub(origin,{store,io:quiet,signal:controller.signal,timeoutMs:mode==='timeout'?10:2000,openBrowser:async url=>{
      callback=callbackUrl(url);
      if(mode==='timeout')return;
      if(mode==='interrupted'){controller.abort();return;}
      if(mode==='denied')callback=callbackUrl(url,{error:'access_denied'});
      await fetch(callback);
    }}));
    assert.deepEqual(await store.read(origin),previous);assert.equal(foreignCalls,0);
    await assert.rejects(fetch(callback)); // listener was released on every settlement path
  });
});

test('TC-016: credential storage rejects symlinks and insecure files without changing a good credential',async t=>{
  const {home,store}=await storage(t);const origin='https://hub.example';const value={hub:origin,token,tokenId:'id',account};
  await store.write(value);const directory=path.join(home,'.ned','hub-credentials');const file=path.join(directory,(await fs.readdir(directory))[0]);
  await fs.chmod(file,0o644);await assert.rejects(store.read(origin));await assert.rejects(store.write({...value,tokenId:'changed'}));await fs.chmod(file,0o600);assert.deepEqual(await store.read(origin),value);
  const target=path.join(home,'target');await fs.rename(file,target);await fs.symlink(target,file);await assert.rejects(store.read(origin));await assert.rejects(store.write(value));assert.deepEqual(JSON.parse(await fs.readFile(target,'utf8')),value);
  await fs.unlink(file);await fs.rename(target,file);await fs.chmod(directory,0o755);await assert.rejects(store.read(origin));await fs.chmod(directory,0o700);
  await store.remove(origin,'different-token');assert.deepEqual(await store.read(origin),value);await store.remove(origin,token);assert.equal(await store.read(origin),null);
  assert.equal(canonicalHubOrigin('https://HUB.example:443/'),origin);
  for(const invalid of ['http://remote.example','https://hub.example/path','https://user@hub.example','https://hub.example/?x=1'])assert.throws(()=>canonicalHubOrigin(invalid));
});

test('TC-016: logout revokes only the saved origin and offline failure retains it; no saved credential makes no request',async t=>{
  const {store}=await storage(t);let calls=0,status=503;
  const origin=await fixture(t,(req,res)=>{calls++;assert.equal(req.method,'DELETE');assert.equal(req.url,'/api/oauth/token');assert.equal(req.headers.authorization,`Bearer ${token}`);res.writeHead(status);res.end();});
  const other={hub:'https://other.example',token,tokenId:'other',account};await store.write(other);
  const value={hub:origin,token,tokenId:'id',account};await store.write(value);const signals=new EventEmitter();
  assert.equal(await runCommunicatorCli(['--logout'],quiet,{hubCredentialStore:store,signals,env:{NED_HUB_URL:origin}}),1);assert.deepEqual(await store.read(origin),value);
  status=204;assert.equal(await runCommunicatorCli(['--logout'],quiet,{hubCredentialStore:store,signals,env:{NED_HUB_URL:origin}}),0);assert.equal(await store.read(origin),null);assert.deepEqual(await store.read(other.hub),other);
  assert.equal(await runCommunicatorCli(['--logout'],quiet,{hubCredentialStore:store,signals,env:{NED_HUB_URL:origin}}),0);assert.equal(calls,2);
  await store.write(value);status=401;assert.equal(await runCommunicatorCli(['--logout'],quiet,{hubCredentialStore:store,signals,env:{NED_HUB_URL:origin}}),0);
  assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
});

test('TC-016: COM uses saved credentials only for its configured origin and explicit environment token wins',async()=>{
  const origin='https://hub.example',saved={hub:origin,token,tokenId:'id',account};
  for(const mode of ['saved','override','local']){
    const signals=new EventEmitter();let reads=0,connected=0;
    const env=mode==='local'?{}:{NED_HUB_URL:origin,NED_INSTANCE_NAME:'fixture',...(mode==='override'?{NED_HUB_TOKEN:'ned_explicit_override_0000000000'}:{})};
    const result=await runCommunicatorCli([],quiet,{env,home:'/synthetic',signals,hubCredentialStore:{async read(hub){reads++;if(mode==='local')return null;assert.equal(hub,origin);return saved;}},createServer(){return {async listen(){setImmediate(()=>signals.emit('SIGTERM'));return 'http://127.0.0.1:1234';},async close(){}};},startHub(config){connected++;assert.equal(config.token,mode==='override'?env.NED_HUB_TOKEN:token);return {async close(){}};}});
    assert.equal(result,0);assert.equal(reads,mode==='override'?0:1);assert.equal(connected,mode==='local'?0:1);
  }
});


test('TC-016: installed login command forwards interruption and releases its callback listener',async t=>{
  const {home}=await storage(t);const bin=path.join(home,'.local/share/ned/current/app/bin');await fs.mkdir(bin,{recursive:true});
  await fs.writeFile(path.join(bin,'../package.json'),'{"type":"module"}');
  await fs.writeFile(path.join(bin,'ned.js'),`import {runCli} from ${JSON.stringify(new URL('../../../../src/cli.js',import.meta.url).href)}; process.exitCode=await runCli(process.argv.slice(2));`);
  for(const signal of ['SIGINT','SIGTERM']){
    const child=spawn(process.execPath,[fileURLToPath(new URL('../../../../bin/ned-launcher.js',import.meta.url)),'com','--login','--no-browser'],{env:{PATH:process.env.PATH,HOME:home,NED_HUB_URL:'https://hub.example',NED_LAUNCHER_MODULE:fileURLToPath(new URL('../../../../src/launcher.js',import.meta.url))},stdio:['ignore','pipe','pipe']});
    let output='',errors='';let ready,rejectReady;const started=new Promise((resolve,reject)=>{ready=resolve;rejectReady=reject;});
    child.stdout.on('data',chunk=>{output+=chunk;const url=output.match(/https:\/\/hub\.example\/api\/oauth\/authorize\?[^\s]+/);if(url)ready(new URL(new URL(url[0]).searchParams.get('redirect_uri')));});child.stderr.on('data',chunk=>{errors+=chunk;});
    const ended=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,received)=>resolve({code,received}));});
    const deadline=setTimeout(()=>{child.kill('SIGKILL');rejectReady(new Error('login startup deadline'));},5000);
    t.after(async()=>{clearTimeout(deadline);if(child.exitCode===null)child.kill('SIGKILL');await ended;});
    const callback=await started;clearTimeout(deadline);child.kill(signal);
    const exitDeadline=setTimeout(()=>child.kill('SIGKILL'),5000);const result=await ended;clearTimeout(exitDeadline);
    assert.deepEqual(result,{code:1,received:null});assert.match(errors,/interrupted/);await assert.rejects(fetch(callback));assert.equal(output.includes(token),false);
  }
});

test('TC-016: concurrent replacement and stale logout retain the new credential',async t=>{
  const {home,store}=await storage(t),origin='https://hub.example';
  const old={hub:origin,token,tokenId:'old',account},replacement={...old,token:'ned_new_synthetic_credential_0000000000',tokenId:'new'};
  await store.write(old);
  const directory=path.join(home,'.ned','hub-credentials'),file=path.join(directory,(await fs.readdir(directory))[0]),lock=`${file}.lock`;
  await fs.mkdir(lock,{mode:0o700});
  const writing=store.write(replacement),removing=store.remove(origin,token);
  assert.deepEqual(await store.read(origin),old);
  await fs.rmdir(lock);await Promise.all([writing,removing]);
  assert.deepEqual(await store.read(origin),replacement);
  assert.equal((await fs.readdir(directory)).length,1);
});

test('TC-016: a repeated valid callback is consumed once while exchange is pending',async t=>{
  const {store}=await storage(t);let finishExchange,exchangeStarted;
  const started=new Promise(resolve=>{exchangeStarted=resolve;});const held=new Promise(resolve=>{finishExchange=resolve;});let exchanges=0,browser;
  const origin=await fixture(t,async(_req,res)=>{exchanges++;exchangeStarted();await held;res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:token,token_type:'Bearer',token_id:'id',account}));});
  const login=loginToHub(origin,{store,io:quiet,openBrowser:async url=>{
    browser=(async()=>{const callback=callbackUrl(url);assert.equal((await fetch(callback)).status,200);await started;assert.equal((await fetch(callback)).status,410);finishExchange();})();return browser;
  }});
  await login;await browser;assert.equal(exchanges,1);
});

test('TC-016: committed login/logout survives unlock EIO and precommit failure preserves the previous credential',async t=>{
  const {home,store}=await storage(t);let exchanges=0,revocations=0;
  const replacement='ned_replacement_synthetic_credential_00000000';
  const origin=await fixture(t,async(req,res)=>{
    if(req.method==='DELETE'){revocations++;res.writeHead(204);res.end();return;}
    if(req.method==='GET'){res.writeHead(401);res.end();return;}
    exchanges++;for await(const chunk of req)assert.ok(chunk.length);
    res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:replacement,token_type:'Bearer',token_id:'new',account}));
  });
  const previous={hub:origin,token,tokenId:'old',account};await store.write(previous);
  const directory=path.join(home,'.ned','hub-credentials');const lock=path.join(directory,(await fs.readdir(directory))[0]+'.lock');
  const rmdir=fs.rmdir,rename=fs.rename;const fault=()=>Object.assign(new Error('synthetic cleanup failure'),{code:'EIO'});
  const signals=new EventEmitter(),logs=[],errors=[];const io={log:s=>logs.push(s),error:s=>errors.push(s)};
  const dependencies={hubCredentialStore:store,env:{NED_HUB_URL:origin},signals,openBrowser:async url=>{assert.equal((await fetch(callbackUrl(url))).status,200);}};
  try {
    fs.rmdir=async target=>{if(target===lock)throw fault();return rmdir(target);};
    assert.equal(await runHubAuthentication('login',io,dependencies),0);
    assert.equal((await store.read(origin)).token,replacement);assert.equal(revocations,0);
    assert.match(logs.at(-1),/^Signed in/);assert.match(errors.at(-1),/lock cleanup failed/);assert.equal(errors.join(' ').includes('Previous credentials were preserved'),false);
    assert.equal((await fs.lstat(lock)).isDirectory(),true);
    fs.rmdir=rmdir;await rmdir(lock); // operator recovery only after the completed operation
    fs.rmdir=async target=>{if(target===lock)throw fault();return rmdir(target);};
    assert.equal(await runCommunicatorCli(['--logout'],io,dependencies),0);
    assert.equal(await store.read(origin),null);assert.equal(revocations,1);assert.match(logs.at(-1),/^Signed out/);assert.match(errors.at(-1),/lock cleanup failed/);
    fs.rmdir=rmdir;await rmdir(lock);
    assert.equal(await runCommunicatorCli(['--logout'],io,dependencies),0);assert.equal(revocations,1);
    await store.write(previous);
    fs.rename=async()=>{throw Object.assign(new Error('synthetic precommit failure'),{code:'EACCES'});};
    assert.equal(await runHubAuthentication('login',io,dependencies),1);
    assert.deepEqual(await store.read(origin),previous);assert.equal(revocations,2);assert.equal(exchanges,2);
    assert.match(errors.at(-1),/Previous credentials were preserved/);assert.deepEqual(await fs.readdir(directory),[path.basename(lock).slice(0,-5)]);
  }finally {fs.rmdir=rmdir;fs.rename=rename;}
});

test('TC-016: unlock never removes a replacement lock and precommit errors retain their original cause',async t=>{
  const {home,store}=await storage(t),origin='https://hub.example',old={hub:origin,token,tokenId:'old',account};await store.write(old);
  const directory=path.join(home,'.ned','hub-credentials'),file=path.join(directory,(await fs.readdir(directory))[0]),lock=`${file}.lock`;
  const rename=fs.rename,rmdir=fs.rmdir;
  try {
    fs.rename=async(from,to)=>{await rename(from,to);await rename(lock,`${lock}.retired`);await fs.mkdir(lock,{mode:0o700});};
    const result=await store.write({...old,tokenId:'new'});assert.deepEqual(result,{ok:true,cleanupWarning:true});
    assert.equal((await fs.lstat(lock)).isDirectory(),true);assert.equal((await store.read(origin)).tokenId,'new');
    fs.rename=rename;await rmdir(lock);await rmdir(`${lock}.retired`);
    const failure=Object.assign(new Error('synthetic precommit failure'),{code:'EACCES'});
    fs.rename=async()=>{throw failure;};fs.rmdir=async()=>{throw Object.assign(new Error('synthetic cleanup failure'),{code:'EIO'});};
    await assert.rejects(store.write(old),error=>error===failure);assert.equal((await store.read(origin)).tokenId,'new');
  }finally {fs.rename=rename;fs.rmdir=rmdir;}
});

test('TC-016: default staging, production and explicit custom Hub selection share isolated credentials',async()=>{
  for(const [env,expected]of [[{},'https://staging.hub.datanav.app'],[{NED_ENV:'production'},'https://hub.datanav.app'],[{NED_ENV:'staging'},'https://staging.hub.datanav.app'],[{NED_ENV:'production',NED_HUB_URL:'http://localhost:4321'},'http://localhost:4321']]){
    let read,started=0;
    assert.equal(await runCommunicatorCli(['--logout'],quiet,{env,signals:new EventEmitter(),hubCredentialStore:{async read(origin){read=origin;return null;}},createServer(){started++;}}),0);
    assert.equal(read,expected);assert.equal(started,0);
    const signals=new EventEmitter();let connected;
    assert.equal(await runCommunicatorCli([],quiet,{env:{...env,NED_INSTANCE_NAME:'fixture'},home:'/synthetic',signals,hubCredentialStore:{async read(origin){assert.equal(origin,expected);return {hub:origin,token,tokenId:'id',account};}},createServer(){return {async listen(){setImmediate(()=>signals.emit('SIGTERM'));return 'http://127.0.0.1:1234';},async close(){}};},startHub(config){connected=config;return {async close(){}};}}),0);
    assert.equal(connected.hub.origin,expected);
  }
  for(const env of [{NED_ENV:'prod'},{NED_HUB_URL:'https://hub.example/path'},{NED_ENV:'unknown',NED_HUB_URL:'https://hub.example'}]){
    assert.equal(await runCommunicatorCli(['--logout'],quiet,{env,hubCredentialStore:{async read(){assert.fail('invalid issuer accessed credentials');}}}),2);
  }
});


test('TC-016: retired hub command and address flags reject without browser, credential or server effects',async()=>{
  const dependencies={env:{},hubCredentialStore:{async read(){assert.fail('credential read');}},openBrowser(){assert.fail('browser opened');},createServer(){assert.fail('COM started');}};
  for(const argv of [['hub','login'],['hub','logout'],['com','--hub','https://hub.example'],['com','--no-browser'],['com','--logout','--port','0'],['com','--logout','--logout'],['com','--login','--logout'],['com','--login','--login']])assert.equal(await runCli(argv,quiet,dependencies),2);
});

test('TC-016: COM login waits for Hub authorization, saves the account, then connects using default or explicit identity',async t=>{
  for(const publish of [false,true])await t.test(publish?'explicit name':'default hostname',async t=>{
    const {store,home}=await storage(t);const events=[];let started=0,connections=0;
    const origin=await fixture(t,(_req,res)=>{events.push('exchange');res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:token,token_type:'Bearer',token_id:'issued',account}));});
    const signals=new EventEmitter();
    const result=await runCli(['com','--login','--port','1234'],quiet,{env:{NED_HUB_URL:origin,...(publish?{NED_INSTANCE_NAME:'fixture'}:{})},home,signals,hubCredentialStore:store,openBrowser:async url=>{events.push('browser');assert.equal(started,0);await fetch(callbackUrl(url));},createServer(options){started++;events.push('server');assert.equal(options.port,1234);return {async listen(){assert.equal((await store.read(origin)).account.id,account.id);setImmediate(()=>signals.emit('SIGTERM'));return 'http://127.0.0.1:1234';},async close(){}};},startHub(config){connections++;assert.equal(config.token,token);assert.equal(config.hub.origin,origin);return {async close(){}};}});
    assert.equal(result,0);assert.deepEqual(events,['browser','exchange','server']);assert.equal(started,1);assert.equal(connections,1);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
  });
});

test('TC-016: denied login and explicit token ambiguity never start COM or publish an instance',async t=>{
  const {store,home}=await storage(t);const signals=new EventEmitter();let browser=0;
  const dependencies={env:{},home,signals,hubCredentialStore:store,openBrowser:async url=>{browser++;await fetch(callbackUrl(url,{error:'access_denied'}));},createServer(){assert.fail('COM started');},startHub(){assert.fail('instance registered');}};
  assert.equal(await runCli(['com','--login'],quiet,dependencies),1);assert.equal(browser,1);assert.equal(await store.read('https://staging.hub.datanav.app'),null);
  assert.equal(await runCli(['com','--login'],quiet,{...dependencies,env:{NED_HUB_TOKEN:token}}),2);assert.equal(browser,1);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
});

test('TC-016: interruption during post-login credential lookup cannot start COM',async()=>{
  const signals=new EventEmitter();let reads=0;
  const result=await runCli(['com'],quiet,{env:{NED_INSTANCE_NAME:'fixture'},home:'/synthetic',signals,hubCredentialStore:{async read(){reads++;signals.emit('SIGTERM');return {token};}},createServer(){assert.fail('COM started after interrupt');}});
  assert.equal(result,0);assert.equal(reads,1);assert.equal(signals.listenerCount('SIGTERM'),0);
});

test('TC-016: hostname identities are deterministic and explicit invalid or obsolete configuration has no effects',async()=>{
  const {resolveInstanceName}=await import('../../../../src/communicator/hub.js');
  for(const [host,expected]of [['MoonK.local','moonk-local'],['123','ned-123'],['','ned-'],['A','a--'],['API','ned-api'],['x'.repeat(60),'x'.repeat(40)]])assert.equal(resolveInstanceName({},host),expected);
  for(const env of [{NED_INSTANCE_NAME:'Bad_Name'},{NED_INSTANCE_NAME:'api'},{NED_INSTANCE_NAME:''},{NED_HUB_ENV:'production'},{NED_HUB_SLUG:'fixture'}]){
    const errors=[];
    assert.equal(await runCommunicatorCli(['--login'],{log(){},error:s=>errors.push(s)},{env,hubCredentialStore:{read(){assert.fail('credential read');}},openBrowser(){assert.fail('browser');},createServer(){assert.fail('server');}}),2);
    assert.match(errors.join(' '),/NED_INSTANCE_NAME|NED_ENV/);
  }
});

test('TC-016: cached login reuses identity; only revoked401 reauthenticates and transient or invalid responses preserve it',async t=>{
  for(const mode of ['valid','revoked','server','mismatch','redirect','oversized','interrupted'])await t.test(mode,async t=>{
    const {home,store}=await storage(t);let validations=0,exchanges=0,browsers=0;const signals=new EventEmitter();
    const origin=await fixture(t,async(req,res)=>{
      if(req.url==='/api/oauth/token'&&req.method==='GET'){
        validations++;assert.equal(req.headers.authorization,`Bearer ${token}`);
        if(mode==='interrupted')signals.emit('SIGTERM');
        if(mode==='revoked'||mode==='server'){res.writeHead(mode==='revoked'?401:503);res.end();return;}
        if(mode==='redirect'){res.writeHead(302,{location:'/api/oauth/token'});res.end();return;}
        res.setHeader('content-type','application/json');res.end(mode==='oversized'?'x'.repeat(8193):JSON.stringify({account:{...account,id:mode==='mismatch'?'other':account.id}}));return;
      }
      exchanges++;for await(const chunk of req)assert.ok(chunk.length);
      res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:token,token_type:'Bearer',token_id:'fresh',account}));
    });
    const previous={hub:origin,token,tokenId:'old',account};await store.write(previous);
    const result=await runHubAuthentication('login',quiet,{env:{NED_HUB_URL:origin},home,signals,hubCredentialStore:store,openBrowser:async url=>{browsers++;await fetch(callbackUrl(url));}});
    assert.equal(validations,1);assert.equal(result,['valid','revoked'].includes(mode)?0:1);assert.equal(browsers,mode==='revoked'?1:0);assert.equal(exchanges,mode==='revoked'?1:0);
    assert.equal((await store.read(origin)).tokenId,mode==='revoked'?'fresh':'old');assert.equal(signals.listenerCount('SIGTERM'),0);
  });
});

test('TC-016: separate installed COM processes reuse the private cached credential and default hostname',async t=>{
  const {home,store}=await storage(t);let registrations=0,validations=0;
  const bin=path.join(home,'.local/share/ned/current/app/bin');await fs.mkdir(bin,{recursive:true});
  await fs.writeFile(path.join(bin,'../package.json'),'{"type":"module"}');
  await fs.writeFile(path.join(bin,'ned.js'),`import {runCli} from ${JSON.stringify(new URL('../../../../src/cli.js',import.meta.url).href)}; process.exitCode=await runCli(process.argv.slice(2));`);
  const origin=await fixture(t,async(req,res)=>{
    assert.equal(req.headers.authorization,`Bearer ${token}`);
    if(req.url==='/api/oauth/token'&&req.method==='GET'){validations++;res.setHeader('content-type','application/json');res.end(JSON.stringify({account:account}));return;}
    assert.equal(req.url,'/api/instances');let body='';for await(const chunk of req)body+=chunk;
    const expected=os.hostname().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    assert.equal(JSON.parse(body).slug,/^[a-z]/.test(expected)&&!['api','auth','tunnel','healthz','assets','connect','favicon','robots','login','logout'].includes(expected)?expected.padEnd(3,'-').slice(0,40):`ned-${expected}`.padEnd(3,'-').slice(0,40));
    registrations++;res.writeHead(401);res.end();
  });
  await store.write({hub:origin,token,tokenId:'cached',account});
  for(const flags of [[],['--login']]){
    const child=spawn(process.execPath,[fileURLToPath(new URL('../../../../bin/ned-launcher.js',import.meta.url)),'com',...flags],{env:{PATH:process.env.PATH,HOME:home,NED_HUB_URL:origin,NED_LAUNCHER_MODULE:fileURLToPath(new URL('../../../../src/launcher.js',import.meta.url))},stdio:['ignore','pipe','pipe']});
    t.after(()=>child.kill('SIGKILL'));let output='',errors='';
    const ready=new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(new Error('registration deadline')),10000);child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('registration rejected (401)')){clearTimeout(deadline);resolve();}});child.once('exit',()=>{clearTimeout(deadline);reject(new Error(`early exit ${errors}`));});});
    child.stderr.on('data',chunk=>{errors+=chunk;});const closed=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
    await ready;child.kill('SIGTERM');assert.deepEqual(await closed,{code:0,signal:null});assert.equal(output.includes('/api/oauth/authorize'),false);assert.equal(output.includes(token),false);assert.equal(errors,'');
    assert.equal((await store.read(origin)).tokenId,'cached');
  }
  assert.equal(registrations,2);assert.equal(validations,1);
});
