import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

test('TC-012: accepted turns survive HTTP completion, serialize sends and bind status to session and credentials',async t=>{
  const pending=[];let clock=0;let key='synthetic-key';
  const gateway=http.createServer(async(req,res)=>{
    for await(const chunk of req)void chunk;
    pending.push({req,res});
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const env={NED_HERMES_URL:`http://127.0.0.1:${gateway.address().port}`,get NED_HERMES_API_KEY(){return key;}};
  const app=createCommunicatorServer({gateway:{env,now:()=>clock}});
  await app.listen();t.after(()=>app.close());
  const post=session=>fetch(`${app.url}/api/chat/sessions/${session}/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Reply after the HTTP response has finished.'}),signal:AbortSignal.timeout(2000)});
  const status=(session,id)=>fetch(`${app.url}/api/chat/sessions/${session}/turns/${id}`);
  const accepted=await post('session-a');assert.equal(accepted.status,202);
  const {turn}=await accepted.json();assert.match(turn.id,/^[a-f0-9-]{36}$/);
  assert.deepEqual(await(await status('session-a',turn.id)).json(),{turn:{id:turn.id,status:'pending'}});
  assert.equal((await post('session-a')).status,409);
  assert.equal((await status('session-b',turn.id)).status,404);
  key='rotated-key';assert.equal((await status('session-a',turn.id)).status,404);assert.equal((await post('session-a')).status,409);key='synthetic-key';
  while(!pending.length)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,1);assert.equal(pending[0].res.destroyed,false);
  pending[0].res.end(JSON.stringify({session_id:'session-a',message:{content:'Persisted synthetic reply'}}));
  let result;
  do{result=await(await status('session-a',turn.id)).json();}while(result.turn.status==='pending');
  assert.deepEqual(result,{turn:{id:turn.id,status:'completed'},session_id:'session-a',message:{role:'assistant',content:'Persisted synthetic reply'}});
  clock=900000;assert.equal((await status('session-a',turn.id)).status,404);
  const restarted=createCommunicatorServer({gateway:{env}});await restarted.listen();t.after(()=>restarted.close());
  assert.equal((await fetch(`${restarted.url}/api/chat/sessions/session-a/turns/${turn.id}`)).status,404);
  assert.equal(pending.length,1);
});

test('TC-012: turn capacity rejects without delivery, bad upstream identity fails sanitized and shutdown releases work',async t=>{
  const requests=[];
  const gateway=http.createServer(async(req,res)=>{for await(const chunk of req)void chunk;requests.push({req,res});});
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-key'}});
  await app.listen();t.after(()=>app.close());
  const post=session=>fetch(`${app.url}/api/chat/sessions/${session}/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Held reply'})});
  const turns=[];
  for(let index=0;index<16;index++){const response=await post(`session-${index}`);assert.equal(response.status,202);turns.push((await response.json()).turn);}
  assert.equal((await post('overflow')).status,503);
  while(requests.length<16)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,16);
  requests[0].res.end(JSON.stringify({session_id:'another-session',message:{content:'PRIVATE'}}));
  let result;
  do{result=await(await fetch(`${app.url}/api/chat/sessions/session-0/turns/${turns[0].id}`)).json();}while(result.turn.status==='pending');
  assert.equal(result.turn.status,'failed');assert.deepEqual(result.error,{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'});assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  await app.close();
});
