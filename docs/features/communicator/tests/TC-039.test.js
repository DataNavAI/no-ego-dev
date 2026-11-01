import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {chatHarness} from './chat-harness.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {streamEvents,streamFrame} from './stream-fixtures.js';

const turnId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const page=start=>Array.from({length:50},(_,index)=>({id:start+index,role:index%3===0?'tool':'assistant',content:`Row ${start+index}`}));
async function ready(){const chat=await chatHarness();await chat.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await chat.respond({data:page(50)});return chat;}

test('TC-039: scrolling loads older raw pages single-flight, preserves viewport and stops retrying after failure',async()=>{
  const chat=await ready(),transcript=chat.elements.get('transcript');
  transcript.scrollTop=0;const anchor=transcript.firstElementChild,top=anchor.getBoundingClientRect().top;
  transcript.dispatch('scroll');transcript.dispatch('scroll');
  assert.equal(chat.requests.length,1);assert.equal(chat.requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=50');
  await chat.respond({data:page(0)});await chat.respond({data:page(50)});
  assert.equal(anchor.dataset.messageId,transcript.children.find(row=>row.dataset.messageId===anchor.dataset.messageId).dataset.messageId);
  assert.equal(transcript.children.find(row=>row.dataset.messageId===anchor.dataset.messageId).getBoundingClientRect().top,top);
  transcript.scrollTop=0;transcript.dispatch('scroll');assert.equal(chat.requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=100');
  await chat.respond({},403);transcript.dispatch('scroll');assert.equal(chat.requests.length,0);assert.deepEqual(chat.delays(),[]);
  assert.equal(chat.elements.get('chat-retry').hidden,false);assert.match(chat.elements.get('chat-status').textContent,/Earlier messages/);
  chat.elements.get('chat-retry').click();assert.equal(chat.requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=100');
  await chat.respond({data:[]});await chat.respond({data:page(50)});transcript.dispatch('scroll');assert.equal(chat.requests.length,0);
});

test('TC-039: pending user echo and cleared draft precede acknowledgement; early Stop binds only accepted turn and waits for terminal',async()=>{
  const chat=await ready(),draft=chat.elements.get('chat-message'),send=chat.elements.get('chat-send');
  draft.value='Immediate message';chat.elements.get('chat-form').dispatch('submit');
  assert.equal(draft.value,'');assert.equal(draft.disabled,false);assert.equal(send.disabled,false);assert.equal(send.attributes['aria-label'],'Stop response');
  assert.equal(chat.elements.get('transcript').children.at(-1).textContent,'YouImmediate message');assert.equal(chat.elements.get('transcript').children.at(-1).dataset.state,'pending');
  send.click();assert.equal(send.disabled,true);assert.equal(chat.requests.length,1);
  await chat.respond({turn:{id:turnId,status:'pending'}},202);
  assert.equal(chat.requests[0].url,`/api/chat/sessions/nedcom-main/turns/${turnId}/stop`);assert.deepEqual(JSON.parse(chat.requests[0].options.body),{});
  await chat.respond({turn:{id:turnId,status:'stopping'}});assert.equal(send.disabled,true);
  draft.value='Next draft';
  await chat.respond({turn:{id:turnId,status:'pending'},stream:{cursor:0,next:7,text:'Partial'}});
  assert.equal(send.disabled,true);assert.equal(chat.elements.get('transcript').children.at(-1).dataset.state,'streaming');
  await chat.respond({turn:{id:turnId,status:'stopped'},session_id:'nedcom-main',message:{role:'assistant',content:'Partial'}});
  await chat.respond({data:page(52)});assert.equal(send.attributes['aria-label'],'Send message');assert.equal(draft.value,'Next draft');assert.equal(chat.requests.length,0);
});

test('TC-039: rejected input restores captured text and uncertain failure never overwrites a newer draft or replays',async()=>{
  for(const newer of ['', 'New draft']){
    const chat=await ready(),draft=chat.elements.get('chat-message');draft.value='Original';chat.elements.get('chat-form').dispatch('submit');draft.value=newer;
    await chat.respond({error:{code:'invalid_attachment',message:'Remove attachment.'}},400);
    assert.equal(draft.value,newer||'Original');assert.equal(chat.elements.get('chat-send').disabled,false);
  }
  const chat=await ready(),draft=chat.elements.get('chat-message');draft.value='Captured';chat.elements.get('chat-form').dispatch('submit');draft.value='Preserve newer';
  await chat.respond({},503);assert.equal(draft.value,'Preserve newer');assert.equal(chat.elements.get('chat-send').disabled,true);
  chat.elements.get('chat-form').dispatch('submit');assert.equal(chat.requests.length,0);
});

test('TC-039: HTTP Stop is owned, retries early registration, waits for stream completion and never targets a later run',{timeout:15000},async t=>{
  let upstream,announce;const started=new Promise(resolve=>announce=resolve);let stops=0;const env={NED_HERMES_API_KEY:'synthetic'};
  const events=streamEvents('session-a','Partial response');
  const gateway=http.createServer(async(req,res)=>{
    for await(const chunk of req)void chunk;
    if(req.url==='/api/sessions/session-a/chat/stream'){
      upstream=res;res.writeHead(200,{'content-type':'text/event-stream'});res.write(events.slice(0,3).map(streamFrame).join(''));announce();return;
    }
    if(req.url===`/v1/runs/${events[0].data.run_id}/stop`){
      stops++;assert.equal(req.headers.authorization,'Bearer synthetic');res.writeHead(stops===1?409:200,{'content-type':'application/json'});res.end(JSON.stringify(stops===1?{error:{code:'run_not_active'}}:{run_id:events[0].data.run_id,status:'stopping'}));return;
    }
    res.writeHead(404);res.end();
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,env}});await app.listen();t.after(()=>app.close());
  const post=(path,body={})=>fetch(app.url+'/api/chat/sessions'+path,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const accepted=await(await post('/session-a/chat',{input:'Stop this response'})).json();await started;
  const path=`/session-a/turns/${accepted.turn.id}`;
  assert.equal((await post(`/other-session/turns/${accepted.turn.id}/stop`)).status,404);
  assert.equal((await post(path+'/stop',{run_id:'foreign'})).status,400);assert.equal(stops,0);
  const stop=await post(path+'/stop');assert.equal(stop.status,200);assert.equal((await stop.json()).turn.status,'stopping');assert.equal(stops,2);assert.equal(upstream.writableEnded,false);
  assert.equal((await(await fetch(app.url+'/api/chat/sessions'+path)).json()).turn.status,'pending');
  upstream.end(events.slice(3).map(streamFrame).join(''));
  const stream=await fetch(app.url+'/api/chat/sessions'+path+'/events');const wire=await stream.text();assert.match(wire,/"status":"stopped"/);assert.match(wire,/Partial response/);
  await post(path+'/stop');assert.equal(stops,2);
  env.NED_HERMES_API_KEY='rotated';assert.equal((await post(path+'/stop')).status,404);assert.equal(stops,2);
});

test('TC-039: hidden and underfilled pages fill automatically, bound a batch and resume on real upward intent',async()=>{
  for(const visible of [false,true]){
    const chat=await chatHarness(),transcript=chat.elements.get('transcript');
    const hidden=start=>Array.from({length:50},(_,index)=>({id:start+index,role:'tool',content:'Hidden'}));
    const latest=hidden(1000);if(visible)latest[0]={...latest[0],role:'assistant',content:'Short visible page'};
    await chat.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await chat.respond({data:latest});
    assert.equal(chat.requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=50');
    for(let ordinal=1;ordinal<=20;ordinal++){
      assert.equal(chat.requests[0].url,`/api/chat/sessions/nedcom-main/messages?offset=${ordinal*50}`);
      await chat.respond({data:hidden(1000-ordinal*50)});await chat.respond({data:latest});
    }
    assert.equal(chat.requests.length,0);assert.equal(transcript.children.length,0);assert.equal(chat.elements.get('older').hidden,true);
    transcript.dispatch('wheel',{deltaY:-1});assert.match(chat.requests[0].url,/offset=1050$/);
    transcript.dispatch('keydown',{key:'PageUp'});assert.equal(chat.requests.length,1);
    await chat.respond({data:[{id:'old-readable',role:'assistant',content:'Reachable older response'}]});await chat.respond({data:latest});
    assert.equal(transcript.children.length,1);assert.match(transcript.textContent,/Reachable older response/);assert.equal(chat.requests.length,0);
  }
});

test('TC-039: automatic viewport fill failure retains short prose and retries only on explicit recovery',async()=>{
  const chat=await chatHarness();await chat.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  const latest=Array.from({length:50},(_,index)=>({id:index,role:index===0?'assistant':'tool',content:index===0?'Retained prose':'Hidden'}));
  await chat.respond({data:latest});await chat.respond({},403);
  assert.match(chat.elements.get('transcript').textContent,/Retained prose/);assert.match(chat.elements.get('chat-status').textContent,/Earlier messages could not/);
  for(const event of ['scroll','wheel','keydown'])chat.elements.get('transcript').dispatch(event,{deltaY:-1,key:'Home'});
  assert.equal(chat.requests.length,0);assert.deepEqual(chat.delays(),[]);
  chat.elements.get('chat-retry').click();assert.match(chat.requests[0].url,/offset=50$/);
  await chat.respond({data:[]});await chat.respond({data:latest});assert.equal(chat.requests.length,0);
});

test('TC-039: normal completion wins a racing Stop; rejected Stop preserves live delivery and cannot replay',{timeout:15000},async t=>{
  for(const response of [{status:200,body:{run_id:'run_synthetic',status:'completed'}},{status:503,body:{}},{status:200,body:{run_id:'foreign',status:'stopping'}}]){
    await t.test(JSON.stringify(response),async t=>{
      let upstream,announce;const started=new Promise(resolve=>announce=resolve);let stops=0;
      const events=streamEvents('session-a','Normally completed');
      const gateway=http.createServer(async(req,res)=>{
        for await(const chunk of req)void chunk;
        if(req.url==='/api/sessions/session-a/chat/stream'){upstream=res;res.writeHead(200,{'content-type':'text/event-stream'});res.write(events.slice(0,3).map(streamFrame).join(''));announce();return;}
        stops++;assert.equal(req.url,'/v1/runs/run_synthetic/stop');res.writeHead(response.status,{'content-type':'application/json'});res.end(JSON.stringify(response.body));
      });
      await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
      const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
      const post=(path,body={})=>fetch(app.url+'/api/chat/sessions'+path,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const accepted=await(await post('/session-a/chat',{input:'A normal reply'})).json();await started;
      const path=`/session-a/turns/${accepted.turn.id}`;
      assert.equal((await post(path+'/stop')).status,response.status===200&&response.body.run_id==='run_synthetic'?200:503);
      assert.equal(upstream.writableEnded,false);assert.equal((await post('/session-a/chat',{input:'Do not replay while pending'})).status,409);
      upstream.end(events.slice(3).map(streamFrame).join(''));
      const wire=await(await fetch(app.url+'/api/chat/sessions'+path+'/events')).text();assert.match(wire,/"status":"completed"/);assert.doesNotMatch(wire,/"status":"stopped"/);
      assert.match(wire,/Normally completed/);await post(path+'/stop');assert.equal(stops,1);
    });
  }
});

test('TC-039: a failed Stop re-enables only Stop while live prose continues and a newer draft survives',async()=>{
  const chat=await ready(),draft=chat.elements.get('chat-message'),send=chat.elements.get('chat-send');
  draft.value='Original message';chat.elements.get('chat-form').dispatch('submit');await chat.respond({turn:{id:turnId,status:'pending'}},202);
  send.click();assert.equal(chat.requests.length,2);
  const streamRequest=chat.requests.shift();
  await chat.respond({},503);assert.equal(send.disabled,false);assert.equal(send.attributes['aria-label'],'Stop response');assert.match(chat.elements.get('chat-status').textContent,/Could not stop/);
  chat.requests.unshift(streamRequest);draft.value='New draft';chat.elements.get('chat-form').dispatch('submit');assert.equal(chat.requests.length,1);
  await chat.respond({turn:{id:turnId,status:'pending'},stream:{cursor:0,next:8,text:'Still on'}});assert.match(chat.elements.get('transcript').textContent,/Still on/);
  await chat.respond({turn:{id:turnId,status:'completed'},session_id:'nedcom-main',message:{role:'assistant',content:'Completed'}});await chat.respond({data:page(52)});
  assert.equal(draft.value,'New draft');assert.equal(send.attributes['aria-label'],'Send message');assert.equal(chat.requests.length,0);
});
