import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readChatStream} from '../../../../src/communicator/chat-stream.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {streamEvents,streamFrame} from './stream-fixtures.js';
import {chatHarness} from './chat-harness.js';
import {consumeTurnStream} from '../../../../src/communicator/public/turn-stream.js';
import {writeTurnEvents} from '../../../../src/communicator/turn-events.js';
import {EventEmitter} from 'node:events';

const raw=events=>events.map(streamFrame).join('');
test('TC-019: browser SSE parser handles byte-split Unicode and rejects broken cursors, identity, EOF and encoding',async()=>{
  const turn='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const delta={cursor:0,next:4,text:'A🙂B'};
  const terminal={turn:{id:turn,status:'completed'},session_id:'session-a',message:{role:'assistant',content:'**Final**'}};
  const frame=(event,data)=>`event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
  const response=wire=>new Response(new ReadableStream({start(controller){for(const byte of Buffer.from(wire))controller.enqueue(Uint8Array.of(byte));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
  const observed=[];
  assert.deepEqual(await consumeTurnStream(response(': heartbeat\r\n\r\n'+frame('delta',delta)+frame('terminal',terminal)),turn,'session-a',text=>observed.push(text)),terminal);
  assert.deepEqual(observed,['A🙂B']);
  for(const wire of [frame('delta',{...delta,cursor:1}),frame('delta',delta),frame('terminal',{...terminal,session_id:'foreign'}),frame('terminal',{...terminal,turn:{id:turn,status:'failed'}}),frame('terminal',terminal).trimEnd(),Buffer.from([255])])await assert.rejects(consumeTurnStream(response(wire),turn,'session-a',()=>{}));
});

test('TC-019: stream backpressure uses retained cursor and releases bounded subscriber on disconnect',()=>{
  const res=new EventEmitter();const writes=[];let releases=0;
  res.writeHead=()=>{};res.flushHeaders=()=>{};res.write=value=>{writes.push(value);return writes.length!==2;};res.end=()=>{};
  const turn={id:'synthetic',status:'pending',text:'x'.repeat(40000),listeners:new Set()};
  assert.equal(writeTurnEvents(turn,res,0,{admit:()=>true,release:()=>releases++}),true);
  assert.equal(writes.length,2);for(const update of turn.listeners)update();assert.equal(writes.length,2);
  res.emit('drain');assert.equal(writes.length,4);assert.equal(turn.listeners.size,1);
  res.emit('close');assert.equal(turn.listeners.size,0);assert.equal(releases,1);assert.equal(res.listenerCount('drain'),0);
});

test('TC-019: actual HTTP SSE flushes before prose, streams before terminal and never polls or cancels accepted work',async t=>{
  let upstream,ready;const started=new Promise(resolve=>ready=resolve);let posts=0;
  const events=streamEvents('session-a','Early 🙂');
  const gateway=http.createServer(async(req,res)=>{posts++;for await(const chunk of req)void chunk;upstream=res;res.writeHead(200,{'content-type':'text/event-stream'});res.write(raw(events.slice(0,2)));ready();});
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
  const accepted=await(await fetch(`${app.url}/api/chat/sessions/session-a/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Hello'})})).json();await started;
  const endpoint=`${app.url}/api/chat/sessions/session-a/turns/${accepted.turn.id}/events`;
  const response=await fetch(endpoint);assert.match(response.headers.get('content-type'),/^text\/event-stream/);assert.equal(response.headers.get('x-accel-buffering'),'no');
  let early;const visible=new Promise(resolve=>early=resolve);
  const result=consumeTurnStream(response,accepted.turn.id,'session-a',text=>{assert.equal(text,'Early 🙂');early();});
  upstream.write(raw(events.slice(2,3)));await visible;assert.equal(upstream.writableEnded,false);
  const disconnected=await fetch(endpoint);await disconnected.body.cancel();assert.equal(upstream.destroyed,false);
  upstream.end(raw(events.slice(3)));assert.equal((await result).message.content,'Early 🙂');assert.equal(posts,1);
  assert.equal((await fetch(endpoint.replace('/session-a/','/foreign/'))).status,404);
});
function upstream(text,fragment=false){
  const bytes=Buffer.from(text);
  return {headers:new Headers({'Content-Type':'text/event-stream; charset=utf-8'}),body:(async function*(){if(fragment){for(const byte of bytes)yield Buffer.from([byte]);}else yield bytes;})()};
}
test('TC-019: actual SSE reader preserves fragmented Unicode, multiline fields and distinct reordered sequence IDs',async()=>{
  const events=streamEvents('session-a','Hello 🙂 café\n**world**');
  [events[1].data.seq,events[2].data.seq]=[events[2].data.seq,events[1].data.seq];
  events.splice(3,0,{event:'tool.progress',data:{session_id:'session-a',run_id:'run_synthetic',message_id:'msg_synthetic',seq:7,delta:'PRIVATE REASONING',args:'PRIVATE'}});
  let text=raw(events).replaceAll('\n','\r\n');
  text=text.replace('data: {','id: ignored\r\n: keepalive\r\ndata: {');
  text=text.replace('"run_synthetic","seq":1','"run_synthetic",\r\ndata: "seq":1');
  const observed=[];
  assert.equal(await readChatStream(upstream(text,true),'session-a',value=>observed.push(value)),'Hello 🙂 café\n**world**');
  assert.deepEqual(observed,['Hello 🙂 café\n**world**']);
});

test('TC-019: malformed, mismatched and nonterminal streams cannot confirm delivery',async t=>{
  const variants={
    session:events=>{events[2].data.session_id='foreign';},
    run:events=>{events[2].data.run_id='foreign';},
    message:events=>{events[2].data.message_id='foreign';},
    duplicate:events=>{events[2].data.seq=events[1].data.seq;},
    partial:events=>{events[3].data.partial=true;},
    interrupted:events=>{events[3].data.interrupted=true;},
    incomplete:events=>{events[3].data.completed=false;},
    missingAssistant:events=>{events.splice(3,1);},
    missingRun:events=>{events.splice(4,1);},
    missingDone:events=>{events.pop();},
    error:events=>{events[3].event='error';events[3].data.message='PRIVATE';},
    missingMessage:events=>{events.splice(1,1);},
    duplicateCompletion:events=>{events.splice(4,0,{...events[3],data:{...events[3].data,seq:8}});},
  };
  for(const [name,mutate] of Object.entries(variants))await t.test(name,async()=>{const events=streamEvents('session-a');mutate(events);await assert.rejects(readChatStream(upstream(raw(events)),'session-a',()=>{}));});
  for(const text of ['event: done\ndata: nope\n\n',raw(streamEvents('session-a')).trimEnd(),`data: ${'x'.repeat(4194305)}`,Buffer.from([255])])await assert.rejects(readChatStream(upstream(text),'session-a',()=>{}));
  const wrong=upstream(raw(streamEvents('session-a')));wrong.headers=new Headers({'Content-Type':'application/json'});await assert.rejects(readChatStream(wrong,'session-a',()=>{}));
});

test('TC-019: background SSE returns bounded pending deltas before completion and never replays rejected streams',async t=>{
  let response,requests=0,key='synthetic-key',requestBody;
  const gateway=http.createServer(async(req,res)=>{
    requests++;assert.equal(req.url,'/api/sessions/session-a/chat/stream');
    let body='';for await(const chunk of req)body+=chunk;requestBody=JSON.parse(body);
    response=res;res.writeHead(200,{'Content-Type':'text/event-stream'});
    const events=streamEvents('session-a','x'.repeat(20000)+' 🙂');
    res.write(raw(events.slice(0,3)));
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const env={NED_HERMES_URL:`http://127.0.0.1:${gateway.address().port}`,get NED_HERMES_API_KEY(){return key;}};
  const app=createCommunicatorServer({gateway:{env}});await app.listen();t.after(()=>app.close());
  const post=()=>fetch(`${app.url}/api/chat/sessions/session-a/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Hello'})});
  const accepted=await post();assert.equal(accepted.status,202);const {turn}=await accepted.json();
  const status=cursor=>fetch(`${app.url}/api/chat/sessions/session-a/turns/${turn.id}${cursor===undefined?'':`?cursor=${cursor}`}`);
  let pending;
  for(let attempt=0;attempt<100;attempt++){pending=await(await status()).json();if(pending.stream?.text)break;await new Promise(resolve=>setImmediate(resolve));}
  assert.equal(pending.turn.status,'pending');assert.deepEqual(pending.stream,{cursor:0,next:16384,text:'x'.repeat(16384)});assert.equal(response.writableEnded,false);
  assert.deepEqual(requestBody,{input:'Hello'});
  const rest=await(await status(16384)).json();assert.equal(rest.stream.text,'x'.repeat(3616)+' 🙂');assert.equal(rest.stream.next,20003);
  assert.equal((await status(20004)).status,400);assert.equal((await status('-1')).status,400);
  assert.equal((await post()).status,409);assert.equal(requests,1);
  key='rotated';assert.equal((await status()).status,404);key='synthetic-key';
  response.end(raw(streamEvents('session-a','Authoritative final').slice(3)));
  let result;
  for(let attempt=0;attempt<100;attempt++){result=await(await status(20003)).json();if(result.turn.status!=='pending')break;await new Promise(resolve=>setImmediate(resolve));}
  assert.deepEqual(result,{turn:{id:turn.id,status:'completed'},session_id:'session-a',message:{role:'assistant',content:'Authoritative final'}});
  assert.equal(requests,1);
});

async function initialized(count=1){
  const harness=await chatHarness();
  await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  await harness.respond({data:Array.from({length:count},(_,index)=>({id:index,role:'assistant',content:`History ${index}`}))});
  return harness;
}
test('TC-019: long polls wake for prose, preserve fast completion and release disconnected bounded waiters',async t=>{
  let response,requested;
  const requestReady=new Promise(resolve=>{requested=resolve;});
  const events=streamEvents('session-a','Quick reply');
  const gateway=http.createServer(async(req,res)=>{
    for await(const chunk of req)void chunk;
    response=res;res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(raw(events.slice(0,2)));requested();
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
  const accepted=await(await fetch(`${app.url}/api/chat/sessions/session-a/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'Hello'})})).json();
  await requestReady;
  const endpoint=`${app.url}/api/chat/sessions/session-a/turns/${accepted.turn.id}?wait=1`;
  const controllers=Array.from({length:4},()=>new AbortController());
  const pending=controllers.map(controller=>fetch(endpoint,{signal:controller.signal}).catch(error=>error));
  await new Promise(resolve=>setTimeout(resolve,75));
  assert.equal((await fetch(endpoint)).status,429);
  controllers[0].abort();await pending[0];
  await new Promise(resolve=>setTimeout(resolve,25));
  let settled=false;
  const replacement=fetch(endpoint).then(result=>{settled=true;return result;});
  await new Promise(resolve=>setTimeout(resolve,75));assert.equal(settled,false);assert.equal(response.destroyed,false);
  response.write(raw(events.slice(2,3)));
  const first=await(await replacement).json();assert.equal(first.turn.status,'pending');assert.deepEqual(first.stream,{cursor:0,next:11,text:'Quick reply'});
  for(const result of await Promise.all(pending.slice(1)))assert.equal(result.status,200);
  response.end(raw(events.slice(3)));
  let result;
  do{result=await(await fetch(endpoint)).json();}while(result.turn.status==='pending');
  assert.equal(result.turn.status,'completed');assert.deepEqual(result.stream,{cursor:0,next:11,text:'Quick reply'});assert.equal(result.message.content,'Quick reply');
  assert.equal((await fetch(endpoint+'&cursor=12')).status,400);
  assert.equal((await fetch(endpoint.replace('wait=1','wait=2'))).status,400);
});

test('TC-019: shipped controller opens one HTTP stream and consumes a fast terminal delta before final rendering',async()=>{
  const harness=await initialized();const {elements,requests}=harness;
  elements.get('chat-message').value='Hello';elements.get('chat-form').dispatch('submit');
  const turn={id:'dddddddd-dddd-dddd-dddd-dddddddddddd',status:'pending'};
  await harness.respond({turn});assert.ok(requests[0].url.endsWith('/events'));
  await harness.respond({turn,stream:{cursor:0,next:5,text:'First'}});
  const bubble=elements.get('transcript').children.at(-1);assert.equal(bubble.dataset.state,'streaming');assert.equal(requests.length,0);
  await harness.respond({turn:{...turn,status:'completed'},stream:{cursor:5,next:11,text:' final'},session_id:'nedcom-main',message:{role:'assistant',content:'Authoritative final'}});
  assert.equal(bubble.dataset.state,'completed');assert.match(bubble.textContent,/Authoritative final/);
  await harness.respond({data:[{id:9,role:'assistant',content:'Authoritative final'}]});assert.equal(elements.get('chat-message').value,'');
});
test('TC-019: shipped controller updates one literal bubble before completion without stealing a scrolled reader',async()=>{
  const harness=await initialized(50);const {elements,requests}=harness;
  const transcript=elements.get('transcript');transcript.scrollTop=100;
  elements.get('chat-message').value='Keep draft until confirmed';elements.get('chat-form').dispatch('submit');
  const turn={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',status:'pending'};
  await harness.respond({turn});
  await harness.respond({turn,stream:{cursor:0,next:8,text:'<script>'}});
  assert.equal(transcript.children.length,52);const bubble=transcript.children.at(-1);
  assert.equal(bubble.children[1].textContent,'<script>');assert.equal(bubble.dataset.state,'streaming');assert.equal(transcript.scrollTop,100);
  await harness.tick();assert.equal(requests.length,0);
  await harness.respond({turn,stream:{cursor:8,next:14,text:'hello!'}});
  assert.equal(transcript.children.at(-1),bubble);assert.equal(bubble.children[1].textContent,'<script>hello!');assert.equal(transcript.scrollTop,100);
  await harness.tick();await harness.respond({turn:{...turn,status:'completed'},session_id:'nedcom-main',message:{role:'assistant',content:'**Final**'}});
  assert.equal(bubble.dataset.state,'completed');assert.ok(bubble.textContent.includes('**Final**'));
  assert.match(elements.get('chat-status').textContent,/New reply/);assert.equal(elements.get('chat-message').value,'');assert.equal(requests.length,0);
});
test('TC-019: live failure remains incomplete, retains draft and cannot replay; bottom readers follow and final history restores focus',async()=>{
  const harness=await initialized();const {elements,requests,document}=harness;
  const draft=elements.get('chat-message');draft.value='retained';draft.focus();elements.get('chat-form').dispatch('submit');
  const turn={id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',status:'pending'};
  await harness.respond({turn});await harness.respond({turn,stream:{cursor:0,next:5,text:'Early'}});
  const bubble=elements.get('transcript').children.at(-1);assert.ok(elements.get('transcript').scrollCalls.length>1);
  await harness.tick();await harness.respond({turn:{...turn,status:'failed'},error:{code:'gateway_unavailable'}});
  assert.equal(bubble.dataset.state,'incomplete');assert.equal(draft.value,'retained');assert.match(elements.get('chat-status').textContent,/Delivery could not be confirmed/);
  elements.get('chat-form').dispatch('submit');assert.equal(requests.length,0);
  elements.get('chat-retry').dispatch('click');await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await harness.respond({data:[]});
  draft.value='second';elements.get('chat-form').dispatch('submit');await harness.respond({turn});await harness.respond({turn,stream:{cursor:0,next:5,text:'Early'}});
  await harness.tick();await harness.respond({turn:{...turn,status:'completed'},session_id:'nedcom-main',message:{role:'assistant',content:'Final'}});
  await harness.respond({data:[{id:9,role:'assistant',content:'Final'}]});
  assert.equal(elements.get('transcript').children.length,1);assert.equal(draft.value,'');assert.equal(document.activeElement,draft);
});

test('TC-019: a 200-row historical window reserves a live slot without dropping the visible reader or corrupting paging state',async()=>{
  const harness=await initialized(50);const {elements}=harness;
  const page=start=>Array.from({length:50},(_,index)=>({id:String(start+index),role:'assistant',content:`Historical ${start+index}`}));
  for(const start of [-50,-100,-150]){elements.get('older').dispatch('click');await harness.respond({data:page(start)});await harness.respond({data:page(0)});}
  const transcript=elements.get('transcript');assert.equal(transcript.children.length,200);
  transcript.scrollTop=200;const anchor=transcript.children[2];const before=anchor.getBoundingClientRect().top;
  elements.get('chat-message').value='One response';elements.get('chat-form').dispatch('submit');
  const turn={id:'cccccccc-cccc-cccc-cccc-cccccccccccc',status:'pending'};
  await harness.respond({turn});await harness.respond({turn,stream:{cursor:0,next:5,text:'Early'}});
  assert.equal(transcript.children.length,200);assert.equal(transcript.children[2],anchor);assert.equal(anchor.getBoundingClientRect().top,before);
  await harness.tick();await harness.respond({turn:{...turn,status:'failed'}});
  assert.equal(transcript.children.length,200);assert.equal(transcript.children.at(-1).dataset.state,'incomplete');
});
