import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient,createApiEventSource} from '../../../../apps/com/src/public/api-client.js';

test('TC-007: a stale401 cannot clear newer validated access',async()=>{
  let persisted=null,release,lost=0;
  const held=new Promise(resolve=>{release=resolve;});
  const client=createApiClient({origin:'https://instance.example',storage:()=>({getItem:()=>persisted,setItem:(_key,value)=>{persisted=value;},removeItem:()=>{persisted=null;}}),request:async resource=>resource.endsWith('/auth/context')?Response.json({instanceId:'d'.repeat(64)}):held});
  client.onLost(()=>{lost++;});
  await client.validate('a'.repeat(64));const pending=client.fetch('/api/v1/health');
  await client.validate('b'.repeat(64));release(new Response('{}',{status:401}));
  await assert.rejects(pending,{name:'AbortError'});assert.equal(JSON.parse(persisted).token,'b'.repeat(64));assert.equal(lost,0);
});

test('TC-007: authenticated SSE preserves split Unicode, event IDs and stops reconnection after401',{timeout:5000},async context=>{
  let persisted=null,calls=0,seen,received;
  const arrived=new Promise(resolve=>received=resolve),ended=new Promise(resolve=>seen=resolve),requests=[];
  const client=createApiClient({origin:'https://instance.example',storage:()=>({getItem:()=>persisted,setItem:(_key,value)=>{persisted=value;},removeItem:()=>{persisted=null;}}),request:async(resource,options)=>{
    requests.push({resource,headers:options.headers});
    if(resource.endsWith('/auth/context'))return Response.json({instanceId:'d'.repeat(64)});
    if(++calls===2)return new Response('{}',{status:401});
    const bytes=new TextEncoder().encode('id: opaque-1\nretry: 100\ndata: {"text":"𝟙 hello"}\n\n');
    return new Response(new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
  }});
  await client.validate('a'.repeat(64));
  const Source=createApiEventSource(client.fetch,listener=>client.onLost(listener)),source=new Source('/api/v1/workspace/events');context.after(()=>source.close());
  source.onmessage=event=>{assert.equal(event.lastEventId,'opaque-1');assert.equal(event.data,'{"text":"𝟙 hello"}');received();};source.onerror=()=>{if(source.readyState===2)seen();};
  await arrived;await ended;assert.equal(calls,2);assert.equal(source.readyState,2);assert.equal(persisted,null);
  assert.equal(requests.at(-1).headers.authorization,'Bearer '+'a'.repeat(64));assert.equal(requests.at(-1).headers['last-event-id'],'opaque-1');
});

test('TC-007: forgetting access aborts an active stream and credentials never go to external resources',async()=>{
  let signal;
  const client=createApiClient({origin:'https://instance.example',storage:()=>undefined,request:async(resource,options)=>{
    if(resource.endsWith('/auth/context'))return Response.json({instanceId:'d'.repeat(64)});
    signal=options.signal;return new Response(new ReadableStream({start(){},cancel(){}}),{headers:{'content-type':'text/event-stream'}});
  }});
  await client.validate('a'.repeat(64));const response=await client.fetch('/api/v1/workspace/events');client.forget();assert.equal(signal.aborted,true);await response.body.cancel();
  await assert.rejects(client.fetch('https://foreign.example/api/v1/health'));
});
