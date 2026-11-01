import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures.js';
import {readActivity} from '../../../../src/communicator/activity.js';
import {messageParts} from '../../../../src/communicator/public/message-content.js';
import {mountActivity} from '../../../../src/communicator/public/activity-ui.js';
import {chatHarness} from './chat-harness.js';

function event(f,projectId,id,type,status,title,sequence){
  const database=f.writer.connection;
  database.prepare('INSERT OR IGNORE INTO ned_work_items(project_id,id,type,title,description,priority,state,created_by,created_at,updated_at) VALUES(?,?,?,?,?,2,?,?,?,?)').run(projectId,id,type,title,'PRIVATE DESCRIPTION','open','fixture','2026-10-28','2026-10-28');
  database.prepare('INSERT INTO ned_task_events(id,project_id,item_id,type,actor,value,created_at) VALUES(?,?,?,?,?,?,?)').run('event-'+sequence,projectId,id,'updated','PRIVATE ACTOR',JSON.stringify({projectId,id,type,title,status,description:'PRIVATE DESCRIPTION'}),'2026-10-28T10:00:00Z');
}
test('TC-029: project-scoped latest event snapshots are bounded, validated and read only',async t=>{
  const f=await fixture(t);
  event(f,'project-0','g','goal','working','Goal A',1);
  event(f,'project-0','t','task','ready','Task A',2);
  event(f,'project-1','g','goal','done','PRIVATE B',3);
  event(f,'project-0','t','task','done','Task A',4);
  const before=f.writer.connection.prepare('SELECT * FROM ned_task_events').all();
  const data=readActivity(f.databasePath,'project-0');
  assert.deepEqual(data.updates.map(row=>[row.kind,row.title,row.status,row.sequence]),[['goal','Goal A','working',1],['task','Task A','done',4]]);
  assert.doesNotMatch(JSON.stringify(data),/PRIVATE|actor|description/);
  assert.deepEqual(f.writer.connection.prepare('SELECT * FROM ned_task_events').all(),before);
  assert.throws(()=>readActivity(f.databasePath,'missing'));
  assert.throws(()=>readActivity(f.home+'/missing.sqlite','project-0'));
  f.writer.connection.prepare("UPDATE ned_task_events SET value=? WHERE id='event-4'").run(JSON.stringify({projectId:'project-1',type:'task',title:'Spoof',status:'done'}));
  assert.throws(()=>readActivity(f.databasePath,'project-0'));
  f.writer.connection.prepare("UPDATE ned_task_events SET value=? WHERE id='event-4'").run('x'.repeat(65537));
  assert.throws(()=>readActivity(f.databasePath,'project-0'));
});
test('TC-029: one HTTP SSE response delivers initial and changed project status',async t=>{
  const f=await fixture(t);event(f,'project-0','t','task','working','Task A',1);
  const controller=new AbortController();t.after(()=>controller.abort());
  const response=await fetch(f.app.url+'/api/activity/events?project=project-0',{signal:controller.signal});
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const reader=response.body.getReader();const decoder=new TextDecoder();
  const initial=decoder.decode((await reader.read()).value);assert.match(initial,/working/);assert.doesNotMatch(initial,/PRIVATE/);
  event(f,'project-0','t','task','done','Task A',2);
  let changed='';
  while(!changed.includes('done'))changed+=decoder.decode((await reader.read()).value);
  assert.match(changed,/done/);controller.abort();
  assert.equal((await f.get('/api/activity/events?project=')).status,400);
});
test('TC-029: tool/unknown/malformed structured payloads never produce visible projection',()=>{
  for(const content of ['private',[],{secret:'private'},'x'.repeat(70000)])assert.deepEqual(messageParts({role:'tool',content}),[]);
  for(const content of [{type:'tool_result',content:[{type:'text',text:'private'}]},[{type:'tool_use',input:'private'}],{unknown:'private'},'[{"type":"tool_use","input":','[{"type":"tool_use","input":"'+'x'.repeat(4*1024*1024)])assert.deepEqual(messageParts({role:'assistant',content}),[]);
  for(const content of ['[Link](https://example.test)','{ordinary prose','[a thought'])assert.deepEqual(messageParts({role:'assistant',content}),[{kind:'text',text:content}]);
  for(const content of ['{"tool_calls":"HIDDEN_TOOL"','{"tool_result":"private"','[{"tool_use":','{"function_call":'])assert.deepEqual(messageParts({role:'assistant',content}),[]);
  assert.deepEqual(messageParts({role:'assistant',content:[{type:'text',text:'Visible'},{type:'tool_result',content:'private'}],tool_calls:'private'}),[{kind:'text',text:'Visible'}]);
  assert.deepEqual(messageParts({role:'user',content:'[1,2]'}),[{kind:'text',text:'[1,2]'}]);
});
test('TC-029: hidden rows preserve history offsets and do not create empty bubbles',async()=>{
  const harness=await chatHarness();
  await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  await harness.respond({data:Array.from({length:50},(_,id)=>({id,role:'tool',content:'private'}))});
  assert.equal(harness.elements.get('transcript').children.length,0);
  assert.equal(harness.elements.get('older').hidden,true);
  harness.elements.get('transcript').dispatch('scroll');
  assert.equal(harness.requests.length,1);
  assert.match(harness.requests[0].url,/offset=50$/);
  await harness.respond({data:[{id:'older-message',role:'assistant',content:'Visible'}]});
  await harness.respond({data:Array.from({length:50},(_,id)=>({id,role:'tool',content:'private'}))});
  assert.equal(harness.elements.get('transcript').children.length,1);
});
test('TC-029: selection clears prior status and ignores stale events and failures',()=>{
  const nodes=new Map();const sources=[];
  function node(){return {value:'',hidden:false,dataset:{},children:[],listeners:{},textContent:'',append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;this.textContent='';},addEventListener(name,callback){this.listeners[name]=callback;},removeEventListener(){}};}
  for(const id of ['project','chat-activity','chat-activity-content'])nodes.set(id,node());
  const document={getElementById:id=>nodes.get(id),createElement:node};
  class EventSource{constructor(url){this.url=url;sources.push(this);}close(){this.closed=true;}}
  const dispose=mountActivity({document,EventSource});
  const project=nodes.get('project'),content=nodes.get('chat-activity-content');
  assert.equal(nodes.get('chat-activity').hidden,true);
  project.value='project-0';project.listeners.change();
  sources[0].onmessage({data:JSON.stringify({projectId:'project-0',updates:[{kind:'task',title:'Task A',status:'working',time:'2026-10-28T10:00:00Z'}]})});
  assert.equal(content.children[0].children[1].textContent,'Task A');assert.match(content.children[0].children[0].textContent,/In progress/);
  project.value='project-1';project.listeners.change();
  assert.equal(sources[0].closed,true);assert.equal(content.children.length,0);assert.equal(nodes.get('chat-activity').hidden,true);
  sources[0].onmessage({data:'bad'});assert.equal(content.textContent,'');assert.equal(nodes.get('chat-activity').hidden,true);
  sources[1].onmessage({data:JSON.stringify({projectId:'project-1',updates:[]})});assert.equal(content.textContent,'');assert.equal(nodes.get('chat-activity').hidden,true);
  sources[1].onerror();assert.equal(content.textContent,'Updates unavailable.');
  project.value='';project.listeners.change();assert.equal(nodes.get('chat-activity').hidden,true);dispose();
});
