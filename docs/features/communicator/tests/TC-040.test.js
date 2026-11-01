import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {chatActivity} from '../../../../src/communicator/chat-activity.js';
import {consumeTurnStream} from '../../../../src/communicator/public/turn-stream.js';
import {writeTurnEvents} from '../../../../src/communicator/turn-events.js';
import {browserChat,expect} from './browser-chat-fixture.js';
import {chatHarness} from './chat-harness.js';
import {readChatStream} from '../../../../src/communicator/chat-stream.js';
import {streamEvents,streamFrame} from './stream-fixtures.js';

test('TC-040: upstream activity cannot forward metadata or cross message/run/session boundaries',async()=>{
  const build=()=>{const events=streamEvents('session');events.splice(2,0,{event:'tool.progress',data:{session_id:'session',run_id:'run_synthetic',message_id:'msg_synthetic',seq:100,tool_name:'_thinking',delta:'PRIVATE',preview:'PRIVATE',args:'PRIVATE'}});return events;};
  const upstream=events=>new Response(events.map(streamFrame).join(''),{headers:{'content-type':'text/event-stream'}});
  const observed=[];await readChatStream(upstream(build()),'session',()=>{},{onActivity:value=>observed.push(value)});
  assert.deepEqual(observed,['working','thinking','writing']);
  for(const field of ['session_id','run_id','message_id']){const events=build();events[2].data[field]='foreign';await assert.rejects(readChatStream(upstream(events),'session',()=>{}));}
});

test('TC-040: Stop dominates later activity and prose; failure clears activity styling',async()=>{
  const chat=await chatHarness();await chat.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await chat.respond({data:[]});
  chat.elements.get('chat-message').value='Work';chat.elements.get('chat-form').dispatch('submit');
  const status=chat.elements.get('chat-status');assert.equal(status.textContent,'Working…');
  const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await chat.respond({turn:{id,status:'pending'}},202);
  await chat.respond({turn:{id,status:'pending'},activity:{turn_id:id,session_id:'nedcom-main',version:1,activity:'thinking'}});
  assert.equal(status.textContent,'Thinking…');chat.elements.get('chat-send').click();
  assert.equal(status.textContent,'Stopping response…');
  await chat.respond({turn:{id,status:'pending'},activity:{turn_id:id,session_id:'nedcom-main',version:2,activity:'reading'},stream:{cursor:0,next:5,text:'Hello'}});
  assert.equal(status.textContent,'Stopping response…');
  await chat.respond({turn:{id,status:'failed'}});
  assert.match(status.textContent,/Delivery could not be confirmed/);assert.equal(status.dataset.activity,undefined);
});

test('TC-040: activity uses only known categories, not private tool metadata',()=>{
  for(const [event,tool,expected] of [['run.started',null,'working'],['tool.progress','_thinking','thinking'],['tool.started','web_search','searching'],['tool.started','read_file','reading'],['tool.started','terminal','running'],['tool.completed','web_search','working'],['tool.failed','terminal','working'],['assistant.delta',null,'writing'],['tool.started','PRIVATE /path?token=secret','working'],['irrelevant','web_search',undefined]])assert.equal(chatActivity(event,tool),expected);
});

test('TC-040: slow subscribers coalesce activity without changing prose cursors',()=>{
  const res=new EventEmitter(),writes=[];let released=0;
  res.writeHead=()=>{};res.flushHeaders=()=>{};res.write=wire=>{writes.push(wire);return writes.length!==2;};res.end=()=>{};
  const turn={id:'turn',session:'session',status:'pending',activity:'thinking',activityVersion:1,text:'Hello',listeners:new Set()};
  writeTurnEvents(turn,res,0,{admit:()=>true,release:()=>released++});
  for(const activity of ['searching','reading','running']){turn.activity=activity;turn.activityVersion++;for(const pump of turn.listeners)pump();}
  assert.equal(writes.length,2);res.emit('drain');
  assert.match(writes[2],/"version":4,"activity":"running"/);assert.match(writes[3],/"cursor":0,"next":5,"text":"Hello"/);
  assert.equal(writes.filter(wire=>wire.includes('event: activity')).length,2);
  res.emit('close');assert.equal(released,1);assert.equal(turn.listeners.size,0);
});

test('TC-040: browser activity validates closed enum and identity independently of prose',async()=>{
  const turn='turn',session='session';
  const activity={turn_id:turn,session_id:session,version:1,activity:'thinking'};
  const terminal={turn:{id:turn,status:'completed'},session_id:session,message:{role:'assistant',content:'Hello'}};
  const frame=(event,payload)=>`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  const response=wire=>new Response(wire,{headers:{'content-type':'text/event-stream'}});
  const observed=[],prose=[];
  await consumeTurnStream(response(frame('activity',activity)+frame('delta',{cursor:0,next:5,text:'Hello'})+frame('terminal',terminal)),turn,session,text=>prose.push(text),value=>observed.push(value));
  assert.deepEqual(observed,['thinking']);assert.deepEqual(prose,['Hello']);
  for(const invalid of [{...activity,activity:'private'},{...activity,turn_id:'foreign'},{...activity,session_id:'foreign'},{...activity,version:0},{...activity,preview:'PRIVATE'}])await assert.rejects(consumeTurnStream(response(frame('activity',invalid)+frame('terminal',terminal)),turn,session,()=>{}));
  await assert.rejects(consumeTurnStream(response(frame('activity',activity).repeat(2)+frame('terminal',terminal)),turn,session,()=>{}));
});

test('TC-040: real browser shows pre-prose activity then clears it after streaming',async t=>{
  const fixture=await browserChat(t);await fixture.ready();
  await fixture.draft.fill('Synthetic activity request');await fixture.draft.press('Enter');
  await expect(fixture.page.locator('#chat-status')).toHaveText('Working…');
  await expect.poll(()=>fixture.turns.length).toBe(1);
  const turn=fixture.turns[0];
  for(const [event,tool,label] of [['tool.progress','_thinking','Thinking…'],['tool.started','web_search','Searching the web…'],['tool.started','PRIVATE tool','Working…'],['tool.started','read_file','Reading files…'],['tool.failed','read_file','Working…']]){
    turn.activity(event,tool);await expect(fixture.page.locator('#chat-status')).toHaveText(label);
    await expect(fixture.page.locator('[data-state="streaming"]')).toHaveCount(0);
  }
  assert.doesNotMatch(await fixture.page.locator('body').innerText(),/PRIVATE/);
  turn.partial();await expect(fixture.page.locator('#chat-status')).toHaveText('Writing response…');
  await expect(fixture.page.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
  turn.finish();await expect(fixture.page.locator('#chat-status')).toHaveText('');
  await expect(fixture.page.locator('#chat-send')).toHaveAttribute('aria-label','Send message');
  assert.equal(fixture.network.filter(path=>/\/turns\/[^/]+\/events$/.test(path)).length,1);
  assert.equal(fixture.network.filter(path=>/\/turns\/[^/]+$/.test(path)).length,0);
  assert.deepEqual(fixture.errors,[]);
});
