import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createSecretStore} from '../../../../src/secrets.js';
import {secretShareRow} from '../../../../src/communicator/public/secret-share.js';
import {projectHistoryMessage} from '../../../../src/communicator/chat-history.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
function setup(t){const home=mkdtempSync(join(tmpdir(),'ned-native-share-'));t.after(()=>rmSync(home,{recursive:true,force:true}));let now=Date.now();const store=createSecretStore({home,clock:()=>now});return {home,store,expire:()=>{now+=900001;}};}
test('TC-005: native registration dispatch checks managed exports without printing bytes or paths',t=>{
  const f=setup(t);f.store.set('ADMIN_PASSWORD','synthetic-native-password');const path=f.store.get('ADMIN_PASSWORD',{file:true}).path;
  const script=`import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location('ned_plugin',sys.argv[1]);p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)\nclass Context:\n def register_tool(self,**kwargs):\n  assert kwargs['name']=='ned' and kwargs['toolset']=='ned'\n  assert kwargs['schema']['parameters']['additionalProperties'] is False\n  self.handler=kwargs['handler']\nc=Context();p.register(c);print(c.handler(json.loads(sys.argv[2])))`;
  const call=args=>execFileSync(process.env.NED_TEST_PYTHON||'python3',['-c',script,resolve('plugins/ned/__init__.py'),JSON.stringify(args)],{env:{...process.env,HOME:f.home,NED_CLI_PATH:resolve('bin/ned.js'),NED_NODE_PATH:process.execPath},encoding:'utf8',timeout:20000});
  const raw=call({action:'secure_share_secret',path}),result=JSON.parse(raw);
  assert.equal(result.success,true);assert.match(result.share_id,/^[a-f0-9]{64}$/);assert.ok(!raw.includes(path));assert.ok(!raw.includes('synthetic-native-password'));
  assert.equal(f.store.revealShare(result.share_id).value,'synthetic-native-password');
  for(const args of [{action:'wrong',path},{action:'secure_share_secret',path:'/tmp/missing'},{action:'secure_share_secret',path,value:'never'},{action:'secure_share_secret',path:path+';echo attacker'}])assert.equal(JSON.parse(call(args)).success,false);
  writeFileSync(path,'stale');assert.equal(JSON.parse(call({action:'secure_share_secret',path})).success,false);
  assert.equal(f.store.get('ADMIN_PASSWORD'),'synthetic-native-password');
});
test('TC-005: grants persist, expire and revoke on rotation or deletion',t=>{
  const f=setup(t);f.store.set('TOKEN','synthetic-token');const path=f.store.get('TOKEN',{file:true}).path;
  const share=f.store.share(path);assert.equal(createSecretStore({home:f.home}).revealShare(share.share_id).value,'synthetic-token');f.expire();assert.throws(()=>f.store.revealShare(share.share_id),error=>error.code==='not_found');
  const newer=f.store.share(path);f.store.set('TOKEN','rotated');assert.throws(()=>f.store.revealShare(newer.share_id));
  const last=f.store.share(f.store.get('TOKEN',{file:true}).path);f.store.delete('TOKEN');assert.throws(()=>f.store.revealShare(last.share_id));
  assert.throws(()=>f.store.share('/etc/passwd'));assert.throws(()=>f.store.revealShare('../TOKEN'));
});
test('TC-005: only exact native successful results survive history projection; metadata stays nonsecret',()=>{
  const grant={success:true,action:'secure_share_secret',share_id:'a'.repeat(64),expires_at:'2026-12-01T00:00:00.000Z'};
  const row={id:'tool-1',role:'tool',name:'ned',content:JSON.stringify(grant)};assert.deepEqual(secretShareRow(row),grant);assert.deepEqual(JSON.parse(projectHistoryMessage(row).content),grant);
  for(const bad of [{...row,role:'assistant'},{...row,role:'user'},{...row,name:'terminal'},{...row,content:JSON.stringify({...grant,value:'never'})},{...row,content:'invalid'},{...row,content:JSON.stringify({...grant,expires_at:'not-a-date'})},{...row,content:JSON.stringify({...grant,share_id:'../TOKEN'})}])assert.equal(secretShareRow(bad),null);
  assert.equal(projectHistoryMessage({...row,content:JSON.stringify({...grant,value:'never'})}).content,'');
  const projected=projectHistoryMessage({id:'assistant',role:'assistant',content:'Ready',tool_calls:[{function:{name:'ned',arguments:'private path'}}]});assert.deepEqual(projected.tool_calls,[]);

});
test('TC-005: shared reveal retains Origin/custom-header and disabled-server controls',async t=>{
  const f=setup(t);f.store.set('TOKEN','synthetic-http-share');const grant=f.store.share(f.store.get('TOKEN',{file:true}).path);
  const app=createCommunicatorServer({home:f.home,databasePath:join(f.home,'ned.sqlite')});await app.listen();t.after(()=>app.close());
  const url=app.url+'/api/secrets/shares/'+grant.share_id+'/reveal';
  assert.equal((await fetch(url,{method:'POST'})).status,403);
  const good=await fetch(url,{method:'POST',headers:{Origin:app.url,'X-NED-Secrets':'1'}});assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');assert.equal((await good.json()).value,'synthetic-http-share');
  assert.equal((await fetch(url,{headers:{'X-NED-Secrets':'1'}})).status,403);
  const disabled=createCommunicatorServer({home:f.home,databasePath:join(f.home,'ned.sqlite'),secretsEnabled:false});await disabled.listen();t.after(()=>disabled.close());
  assert.equal((await fetch(disabled.url+'/api/secrets/shares/'+grant.share_id+'/reveal',{method:'POST',headers:{Origin:disabled.url,'X-NED-Secrets':'1'}})).status,403);
});
test('TC-005: native tool resolves a PATH symlink to the container-style JavaScript CLI',t=>{
  const f=setup(t);f.store.set('TOKEN','synthetic-fallback-token');const path=f.store.get('TOKEN',{file:true}).path;
  const bin=join(f.home,'bin');mkdirSync(bin);symlinkSync(resolve('bin/ned.js'),join(bin,'ned'));
  const script="import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location('ned_plugin',sys.argv[1]);p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)\nprint(p.handle({'action':'secure_share_secret','path':sys.argv[2]}))";
  const env={...process.env,HOME:f.home,PATH:bin,NED_NODE_PATH:process.execPath};delete env.NED_CLI_PATH;
  const output=execFileSync(process.env.NED_TEST_PYTHON||'python3',['-c',script,resolve('plugins/ned/__init__.py'),path],{env,encoding:'utf8',timeout:20000});
  const result=JSON.parse(output);assert.equal(result.success,true);assert.equal(f.store.revealShare(result.share_id).value,'synthetic-fallback-token');assert.ok(!output.includes(path));assert.ok(!output.includes('synthetic-fallback-token'));
  env.NED_CLI_PATH=join(f.home,'missing.js');
  assert.equal(JSON.parse(execFileSync(process.env.NED_TEST_PYTHON||'python3',['-c',script,resolve('plugins/ned/__init__.py'),path],{env,encoding:'utf8',timeout:20000})).success,false);
});

test('TC-005: HTTP history removes native inputs in serialized calls and structured content while preserving generic tools',async t=>{
  const {createServer}=await import('node:http');const f=setup(t),path='/synthetic/private/export/ADMIN_PASSWORD';
  const native={type:'function',function:{name:'ned',arguments:JSON.stringify({action:'secure_share_secret',path})}};
  const generic={type:'function',function:{name:'terminal',arguments:'safe command'}};
  const embedded={type:'tool_use',name:'ned',input:{action:'secure_share_secret',path}};
  const ordinary={type:'tool_use',name:'terminal',input:{command:'safe command'}};
  const rows=[{id:'serialized',role:'assistant',content:'Ready',tool_calls:JSON.stringify([native,generic])},{id:'embedded',role:'assistant',content:JSON.stringify([{type:'text',text:'Ready'},embedded,ordinary])},{id:'array',role:'assistant',content:[embedded,ordinary]},{id:'nested',role:'assistant',content:[[embedded,{type:'text',text:'Nested prose'}]]},{id:'data',role:'assistant',content:{ordinary:'structured data'}}];
  const gateway=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:rows}));});
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>gateway.close(resolve)));
  const app=createCommunicatorServer({home:f.home,databasePath:join(f.home,'ned.sqlite'),gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
  const response=await fetch(app.url+'/api/chat/sessions/nedcom-main/messages?offset=0');assert.equal(response.status,200);const output=await response.text();assert.ok(!output.includes(path),'Native export path must not reach browser history');
  const result=JSON.parse(output).data;assert.deepEqual(JSON.parse(result[0].tool_calls),[generic]);assert.deepEqual(JSON.parse(result[1].content),[{type:'text',text:'Ready'},ordinary]);assert.deepEqual(result[2].content,[ordinary]);assert.deepEqual(result[3].content,[[{type:'text',text:'Nested prose'}]]);assert.deepEqual(result[4].content,{ordinary:'structured data'});
});
