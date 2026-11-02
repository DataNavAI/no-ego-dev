import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createSecretStore} from '../../../../src/secrets.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {secretRequestRow} from '../../../../src/communicator/public/secret-request.js';
import {projectHistoryMessage} from '../../../../src/communicator/chat-history.js';
function setup(t){const home=mkdtempSync(join(tmpdir(),'ned-request-'));t.after(()=>rmSync(home,{recursive:true,force:true}));return home;}
test('TC-007: native adapter creates only a named request and history accepts only closed native results',t=>{
  const home=setup(t);
  const script=`import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('p',sys.argv[1]);p=importlib.util.module_from_spec(s);s.loader.exec_module(p)\nprint(p.handle(json.loads(sys.argv[2])))`;
  const call=args=>JSON.parse(execFileSync(process.env.NED_TEST_PYTHON||'python3',['-c',script,resolve('plugins/ned/__init__.py'),JSON.stringify(args)],{env:{HOME:home,PATH:process.env.PATH,NED_AGENT_HOME:home,NED_CLI_PATH:resolve('bin/ned.js'),NED_NODE_PATH:process.execPath,PYTHONDONTWRITEBYTECODE:'1'},encoding:'utf8',timeout:20000}));
  const result=call({action:'request_secret',key:'ADMIN_PASSWORD'});assert.equal(result.success,true);assert.match(result.request_id,/^[a-f0-9]{64}$/);assert.deepEqual(Object.keys(result).sort(),['action','expires_at','key','request_id','success']);
  const row={id:'native',role:'tool',tool_name:'ned',content:JSON.stringify(result)};
  assert.deepEqual(secretRequestRow(row),result);assert.deepEqual(JSON.parse(projectHistoryMessage(row).content),result);
  for(const bad of [{...row,role:'assistant'},{...row,role:'user'},{...row,tool_name:'terminal'},{...row,content:JSON.stringify({...result,value:'synthetic-never'})},{...row,content:JSON.stringify({...result,key:'bad key'})},{...row,content:JSON.stringify({...result,request_id:'../key'})}])assert.equal(secretRequestRow(bad),null);
  assert.equal(projectHistoryMessage({...row,content:JSON.stringify({...result,value:'synthetic-never'})}).content,'');
  for(const args of [{action:'request_secret',key:'bad'},{action:'request_secret',key:'TOKEN',value:'never'},{action:'request_secret',path:'/tmp/secret'},{action:'request_secret'},{action:'other',key:'TOKEN'}])assert.equal(call(args).success,false);
  assert.deepEqual(createSecretStore({home}).list(),[]);
});
test('TC-007: durable requests expire, isolate, revoke and retry without overwriting',t=>{
  const home=setup(t);let now=Date.now();const store=createSecretStore({home,clock:()=>now});
  const request=store.request('TOKEN'),other=store.request('TOKEN');assert.deepEqual(store.requestStatus(request.request_id),{key:'TOKEN',saved:false});
  const isolated=createSecretStore({home:setup(t)});assert.throws(()=>isolated.submitRequest(request.request_id,'synthetic'),{code:'not_found'});
  assert.throws(()=>store.submitRequest(request.request_id,''),{code:'invalid_value'});
  const value='synthetic-request\n exact whitespace ';
  assert.deepEqual(store.submitRequest(request.request_id,value),{key:'TOKEN',saved:true});
  const reopened=createSecretStore({home});assert.deepEqual(reopened.requestStatus(request.request_id),{key:'TOKEN',saved:true});reopened.submitRequest(request.request_id,'different-retry');assert.equal(reopened.get('TOKEN'),value);
  assert.ok(!readFileSync(join(home,'.ned/secrets/vault.sqlite')).includes(Buffer.from(value)));
  assert.throws(()=>store.submitRequest(other.request_id,'stale'),{code:'not_found'});
  store.set('TOKEN','replacement');assert.throws(()=>store.submitRequest(request.request_id,'stale'),{code:'not_found'});
  const pending=store.request('TOKEN');store.delete('TOKEN');assert.throws(()=>store.requestStatus(pending.request_id),{code:'not_found'});
  const expiring=store.request('NEW');now+=900000;assert.throws(()=>store.submitRequest(expiring.request_id,'expired'),{code:'not_found'});assert.deepEqual(store.list(),[]);
});
test('TC-007: protected HTTP submits metadata only, rejects malformed writes, and serializes competing submissions',async t=>{
  const home=setup(t),events=[],app=createCommunicatorServer({home,databasePath:join(home,'ned.sqlite'),logger:{event:(...args)=>events.push(args)}});await app.listen();t.after(()=>app.close());
  const store=createSecretStore({home}),grant=store.request('TOKEN'),path=`/api/secrets/requests/${grant.request_id}`;
  const call=(suffix='submit',body={value:'synthetic-http-request'},headers={})=>fetch(app.url+path+'/'+suffix,{method:'POST',headers:{Origin:app.url,'X-NED-Secrets':'1',...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  for(const [body,headers,code] of [[{value:'bad'},{Origin:'https://attacker.example'},403],[{value:'bad'},{Origin:''},403],[{value:'bad'},{'X-NED-Secrets':''},403],[{value:'bad'},{'Sec-Fetch-Site':'cross-site'},403],[{value:'bad',key:'OTHER'},{},400],[{value:''},{},400],[{value:'x'.repeat(65537)},{},400],[{value:'x'.repeat(400001)},{},413],[[],{},400]])assert.equal((await call('submit',body,headers)).status,code);
  const status=await fetch(app.url+path+'/status',{method:'POST',headers:{Origin:app.url,'X-NED-Secrets':'1'}});assert.deepEqual(await status.json(),{key:'TOKEN',saved:false});
  assert.equal((await call('status',{})).status,400);
  const malformed=await fetch(app.url+path+'/submit',{method:'POST',headers:{Origin:app.url,'X-NED-Secrets':'1','Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  assert.equal((await fetch(app.url+path+'/submit?value=bad',{method:'POST',headers:{Origin:app.url,'X-NED-Secrets':'1'}})).status,403);
  assert.equal((await fetch(app.url+path+'/submit',{headers:{Origin:app.url,'X-NED-Secrets':'1'}})).status,405);
  assert.equal((await call('submit',{value:'bad'},{'Content-Type':'text/plain'})).status,415);
  const results=await Promise.all([call('submit',{value:'synthetic-first'}),call('submit',{value:'synthetic-second'})]);
  for(const result of results){assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.deepEqual(await result.json(),{key:'TOKEN',saved:true});}
  assert.ok(['synthetic-first','synthetic-second'].includes(store.get('TOKEN')));const saved=store.get('TOKEN');await call();assert.equal(store.get('TOKEN'),saved);
  assert.ok(!JSON.stringify(events).includes(saved));
  const disabled=createCommunicatorServer({home,databasePath:join(home,'ned.sqlite'),secretsEnabled:false});await disabled.listen();t.after(()=>disabled.close());assert.equal((await fetch(disabled.url+path+'/submit',{method:'POST',headers:{Origin:disabled.url,'X-NED-Secrets':'1','Content-Type':'application/json'},body:JSON.stringify({value:'bad'})})).status,403);assert.equal(store.get('TOKEN'),saved);
});
