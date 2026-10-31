import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {createSecretStore} from '../../../../src/secrets.js';
async function fixture(t,extra={}){const home=mkdtempSync(join(tmpdir(),'ned-secret-http-'));const events=[];const app=createCommunicatorServer({home,databasePath:join(home,'ned.sqlite'),logger:{event:(...args)=>events.push(args)},...extra});await app.listen();t.after(async()=>{await app.close();rmSync(home,{recursive:true,force:true});});const call=(path='',method='GET',body,headers={})=>fetch(app.url+'/api/secrets'+path,{method,headers:{Origin:app.url,'X-NED-Secrets':'1',...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {app,home,events,call};}
test('TC-002: Settings API shares encrypted CLI vault and requires explicit reveal',async t=>{
  const f=await fixture(t),value='synthetic-HTTP-only';
  assert.equal((await f.call('/ADMIN_PASSWORD','PUT',{value})).status,200);
  assert.equal(createSecretStore({home:f.home}).get('ADMIN_PASSWORD'),value);
  const list=await f.call();assert.equal(list.status,200);assert.equal(list.headers.get('cache-control'),'no-store');const metadata=await list.text();assert.ok(metadata.includes('ADMIN_PASSWORD'));assert.ok(!metadata.includes(value));
  const reveal=await f.call('/ADMIN_PASSWORD/reveal','POST');assert.equal(reveal.status,200);assert.equal((await reveal.json()).value,value);
  for(const [path,method,body,headers,expected] of [
    ['/ADMIN_PASSWORD/reveal','GET',undefined,{},405],
    ['/ADMIN_PASSWORD/reveal','HEAD',undefined,{},405],
    ['/ADMIN_PASSWORD','PUT',{value:'bad'},{Origin:'https://attacker.example'},403],
    ['/ADMIN_PASSWORD','PUT',{value:'bad'},{Origin:''},403],
    ['','GET',undefined,{'X-NED-Secrets':''},403],
    ['','GET',undefined,{'Sec-Fetch-Site':'cross-site'},403],
    ['?value=never','GET',undefined,{},403],
    ['/ADMIN_PASSWORD','PUT',{value:'bad',path:'/private'}, {},400],
    ['/ADMIN_PASSWORD','PUT',[],{},400],
    ['/ADMIN_PASSWORD','PUT',{value:''},{},400],
    ['/ADMIN_PASSWORD','PUT',{value:'a'.repeat(400001)},{},413],
    ['/ADMIN_PASSWORD/reveal','POST',{anything:'ignored'},{},400],
  ]){const out=await f.call(path,method,body,headers);assert.equal(out.status,expected,`${method} ${path}`);}
  const invalid=await fetch(f.app.url+'/api/secrets/ADMIN_PASSWORD',{method:'PUT',headers:{Origin:f.app.url,'X-NED-Secrets':'1','Content-Type':'application/json'},body:'{invalid'});assert.equal(invalid.status,400);
  assert.equal(createSecretStore({home:f.home}).get('ADMIN_PASSWORD'),value);
  assert.equal(JSON.stringify(f.events).includes(value),false);
  assert.equal((await f.call('/ADMIN_PASSWORD','DELETE')).status,200);
  assert.equal((await f.call('/ADMIN_PASSWORD/reveal','POST')).status,404);
});
test('TC-002: explicitly disabled COM denies every secret API and leaves vault untouched',async t=>{
  const f=await fixture(t,{secretsEnabled:false});
  for(const [path,method,body] of [['','GET'],['/ADMIN_PASSWORD','PUT',{value:'synthetic'}],['/ADMIN_PASSWORD/reveal','POST'],['/ADMIN_PASSWORD','DELETE']])assert.equal((await f.call(path,method,body)).status,403);
  assert.deepEqual(createSecretStore({home:f.home}).list(),[]);
});


