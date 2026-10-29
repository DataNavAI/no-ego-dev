import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

const canonical={id:'nedcom-main',title:'NED Chat',source:'api_server'};

async function fixture(t,{initial=[],malformed=false,fail=false,race=false}={}){
  const rows=new Map(initial.map(row=>[row.id,{...row}]));
  const calls=[];
  let missingReads=0;let releaseRace;
  const raceReady=new Promise(resolve=>{releaseRace=resolve;});
  const gateway=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    calls.push({method:req.method,path:req.url,body});
    res.setHeader('Content-Type','application/json');
    if(fail){res.writeHead(503);res.end(JSON.stringify({error:'private'}));return;}
    if(req.method==='GET'&&req.url==='/api/sessions/nedcom-main'){
      const row=rows.get(canonical.id);
      if(!row){
        if(race){missingReads+=1;if(missingReads===2)releaseRace();await raceReady;}
        res.writeHead(404);res.end(JSON.stringify({error:'missing'}));return;
      }
      res.end(malformed?'not json':JSON.stringify({object:'hermes.session',session:row}));return;
    }
    if(req.method==='POST'&&req.url==='/api/sessions'){
      const input=JSON.parse(body);
      if(rows.has(input.id)){res.writeHead(409);res.end(JSON.stringify({error:'exists'}));return;}
      if([...rows.values()].some(row=>row.title===input.title)){res.writeHead(400);res.end(JSON.stringify({error:'title conflict'}));return;}
      // Hermes normalizes unsupported custom source labels to api_server.
      const row={...input,source:'api_server'};
      rows.set(input.id,row);res.writeHead(201);res.end(JSON.stringify({object:'hermes.session',session:row}));return;
    }
    res.writeHead(404);res.end('{}');
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const settings={url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-key'};
  return {rows,calls,settings};
}

async function app(t,settings){
  const instance=createCommunicatorServer({gateway:settings});await instance.listen();t.after(()=>instance.close());return instance;
}

const ensure=instance=>fetch(`${instance.url}/api/chat/sessions/fixed`,{method:'POST',headers:{Origin:instance.url,'Content-Type':'application/json'},body:'{}'});

test('TC-014: fixed session is reused across refresh and COM restart without adopting unrelated recency',async t=>{
  const gateway=await fixture(t,{initial:[{id:'recent-unrelated',title:'Other',source:'cli'},canonical]});
  const first=await app(t,gateway.settings);
  assert.deepEqual(await(await ensure(first)).json(),{session:canonical});
  assert.deepEqual(await(await ensure(first)).json(),{session:canonical});
  await first.close();
  const restarted=await app(t,gateway.settings);
  assert.deepEqual(await(await ensure(restarted)).json(),{session:canonical});
  assert.equal(gateway.calls.filter(call=>call.method==='POST').length,0);
  assert.deepEqual([...gateway.rows.keys()],['recent-unrelated','nedcom-main']);
});

test('TC-014: missing fixed session is created once and a concurrent 409 race re-reads it',async t=>{
  const gateway=await fixture(t,{race:true});
  const instance=await app(t,gateway.settings);
  const responses=await Promise.all([ensure(instance),ensure(instance)]);
  assert.deepEqual(responses.map(response=>response.status),[200,200]);
  assert.deepEqual(await Promise.all(responses.map(response=>response.json())),[{session:canonical},{session:canonical}]);
  assert.deepEqual(gateway.rows.get(canonical.id),canonical);
  assert.equal(gateway.calls.filter(call=>call.method==='POST').length,2);
  assert.equal(gateway.calls.filter(call=>call.method==='GET').length,3);
  for(const call of gateway.calls.filter(call=>call.method==='POST'))assert.deepEqual(JSON.parse(call.body),canonical);
});

test('TC-014: gateway contexts stay isolated and unsafe provider identities fail closed',async t=>{
  const one=await fixture(t);const two=await fixture(t);
  const first=await app(t,one.settings);const second=await app(t,two.settings);
  assert.equal((await ensure(first)).status,200);assert.equal((await ensure(second)).status,200);
  assert.deepEqual(one.rows.get(canonical.id),canonical);assert.deepEqual(two.rows.get(canonical.id),canonical);

  for(const initial of [
    [{id:'nedcom-main',title:'NED Chat',source:'cli'}],
    [{id:'nedcom-main',title:'Renamed',source:'api_server'}],
    [{id:'unrelated',title:'NED Chat',source:'cli'}],
  ]){
    await t.test(JSON.stringify(initial),async child=>{
      const bad=await fixture(child,{initial});const isolated=await app(child,bad.settings);
      const response=await ensure(isolated);assert.equal(response.status,503);
      assert.deepEqual(await response.json(),{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});
      assert.deepEqual([...bad.rows.values()],initial);
    });
  }
  for(const mode of [{malformed:true},{fail:true}]){
    await t.test(JSON.stringify(mode),async child=>{
      const bad=await fixture(child,{initial:[canonical],...mode});const isolated=await app(child,bad.settings);
      assert.equal((await ensure(isolated)).status,503);
    });
  }
});

test('TC-014: fixed ensure accepts only same-origin empty JSON objects',async t=>{
  const gateway=await fixture(t);const instance=await app(t,gateway.settings);
  for(const request of [
    {headers:{Origin:'http://evil.test','Content-Type':'application/json'},body:'{}'},
    {headers:{Origin:instance.url,'Content-Type':'text/plain'},body:'{}'},
    {headers:{Origin:instance.url,'Content-Type':'application/json'},body:'[]'},
    {headers:{Origin:instance.url,'Content-Type':'application/json'},body:'{"extra":true}'},
  ])assert.ok([400,403].includes((await fetch(`${instance.url}/api/chat/sessions/fixed`,{method:'POST',...request})).status));
  assert.equal(gateway.calls.length,0);
});
