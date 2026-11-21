import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {apiFixture} from './helpers.js';
import {streamEvents,streamFrame} from '../../communicator/tests/stream-fixtures.js';

test('TC-003: canonical chat streams before completion and retains alias history on both listeners',{timeout:20000},async parent=>{
for(const kind of ['core','com'])await parent.test(kind,async context=>{
  const session={id:'nedcom-main',title:'NED Chat',source:'api_server'};
  let exists=false,upstreamResponse,releaseStarted,admissions=0;
  const started=new Promise(resolve=>{releaseStarted=resolve;});
  const gateway=http.createServer(async(req,res)=>{
    for await(const chunk of req)void chunk;
    assert.equal(req.headers.authorization,'Bearer synthetic-api-key');
    const json=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
    if(req.url==='/api/sessions/nedcom-main')return json(exists?200:404,exists?{session}:{});
    if(req.url==='/api/sessions'){exists=true;return json(201,{session});}
    if(req.url.startsWith('/api/sessions/nedcom-main/messages?'))return json(200,{data:[{id:1,role:'assistant',content:'Persisted synthetic reply'}]});
    if(req.url==='/api/sessions/nedcom-main/chat/stream'){
      admissions++;
      const events=streamEvents(session.id,'Incremental reply');
      res.writeHead(200,{'content-type':'text/event-stream'});res.write(events.slice(0,3).map(streamFrame).join(''));
      upstreamResponse=res;releaseStarted(()=>res.end(events.slice(3).map(streamFrame).join('')));return;
    }
    return json(404,{});
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  context.after(async()=>{upstreamResponse?.end();gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));});
  const fixture=await apiFixture(context,{kind,chatGateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-api-key'}});
  const headers={origin:fixture.app.url};
  const fixed=await fixture.request('/api/v1/chat/sessions/fixed',{method:'POST',headers,body:{}});assert.equal(fixed.status,200);assert.deepEqual((await fixed.json()).session,session);
  const rejected=await fixture.request(`/api/v1/chat/sessions/${session.id}/chat`,{method:'POST',body:{input:'Missing origin'}});assert.equal(rejected.status,403);await rejected.body.cancel();
  const submitted=await fixture.request(`/api/v1/chat/sessions/${session.id}/chat`,{method:'POST',headers,body:{input:'Stream the synthetic reply'}});assert.equal(submitted.status,202);const accepted=await submitted.json();
  const release=await started;
  const duplicate=await fixture.request(`/api/chat/sessions/${session.id}/chat`,{method:'POST',headers,body:{input:'Do not double admit'}});assert.equal(duplicate.status,409);await duplicate.body.cancel();
  const stream=await fixture.request(`${kind==='com'?'/api/chat':'/api/v1/chat'}/sessions/${session.id}/turns/${accepted.turn.id}/events`);assert.equal(stream.status,200);assert.match(stream.headers.get('content-type'),/^text\/event-stream/);
  const reader=stream.body.getReader();let received='';
  while(!received.includes('Incremental reply')){const chunk=await reader.read();assert.equal(chunk.done,false);received+=new TextDecoder().decode(chunk.value);}
  assert.ok(!received.includes('event: terminal'),'prose arrives while upstream completion remains held');
  release();
  for(;;){const chunk=await reader.read();if(chunk.done)break;received+=new TextDecoder().decode(chunk.value);}
  assert.ok(received.includes('event: terminal'));
  assert.equal(admissions,1,'canonical and legacy callers share one pending-turn guard');
  const canonical=await fixture.request(`/api/v1/chat/sessions/${session.id}/messages?offset=0`),legacy=await fixture.request(`/api/chat/sessions/${session.id}/messages?offset=0`);
  assert.equal(canonical.status,200);assert.equal(legacy.status,200);assert.deepEqual(await canonical.json(),await legacy.json());
  const activity=await fixture.request(`/api/v1/activity/events?project=${fixture.projectId}`);assert.match(activity.headers.get('content-type'),/^text\/event-stream/);await activity.body.cancel();
});
});
