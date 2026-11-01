import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {fixture} from './fixtures.js';
import {endStream} from './stream-fixtures.js';
import {executionPlan} from '../../../../src/communicator/public/work-plan.js';
import {resolveWorkReferences} from '../../../../src/communicator/work-references.js';
import {chatHarness} from './chat-harness.js';
const item=(id,status='ready',extra={})=>({id,title:id,type:'task',status,parentId:null,priority:2,createdAt:'2026-10-29',dependsOn:[],...extra});
test('TC-034: default plan hides completion, retains ancestors and orders prerequisites before dependents',()=>{
 const items=[item('later','ready',{priority:0,dependsOn:['first']}),item('completed','done'),item('active','working'),item('first'),item('goal','done',{type:'goal'}),item('nested','ready',{parentId:'goal'})];
 const plan=executionPlan(items);const ids=plan.items.map(x=>x.id);
 assert.ok(!ids.includes('completed'));assert.ok(ids.includes('goal'));assert.ok(ids.indexOf('first')<ids.indexOf('later'));assert.equal(ids[0],'active');
 assert.equal(plan.total,5);assert.equal(plan.completed,1);assert.equal(plan.active,1);
 assert.equal(executionPlan(items,true).items.length,6);
 assert.equal(executionPlan([item('done','done')]).items.length,0);
 assert.throws(()=>executionPlan([item('a','ready',{dependsOn:['b']}),item('b','ready',{dependsOn:['a']})]));
});
test('TC-034: authoritative references stay project-scoped and invalid data never reaches gateway',async t=>{
 const calls=[];const gateway=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));endStream(res,'s1','Confirmed');});
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
 const f=await fixture(t,{gateway:{env:{NED_HERMES_URL:`http://127.0.0.1:${gateway.address().port}`,NED_HERMES_API_KEY:'synthetic'}}});
 f.writer.connection.prepare("INSERT INTO ned_work_items(project_id,id,type,title,description,priority,state,created_by,created_at,updated_at) VALUES('project-1','task-sentinel','task','Other project task','PRIVATE DESCRIPTION',2,'open','fixture','2026-10-29','2026-10-29')").run();
 const ref={projectId:'project-0',itemId:'task-sentinel'};
 const resolved=resolveWorkReferences([ref],'Discuss',f.databasePath);assert.match(resolved,/Private task/);assert.doesNotMatch(resolved,/Other project task|Keep private/);assert.ok(resolved.includes(f.roots[0]));
 const other=resolveWorkReferences([{...ref,projectId:'project-1'}],'',f.databasePath);assert.match(other,/Other project task/);assert.doesNotMatch(other,/Private task/);
 const send=references=>fetch(f.app.url+'/api/chat/sessions/s1/chat',{method:'POST',headers:{Origin:f.app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'',references})});
 for(const bad of [[{...ref,itemId:'missing'}],[{...ref,title:'Spoof'}],[ref,ref],Array.from({length:9},()=>ref),{},null]){
  const response=await send(bad);assert.equal(response.status,400);assert.equal(calls.length,0);
 }
 const response=await send([ref]);assert.equal(response.status,202);const {turn}=await response.json();
 const events=await fetch(`${f.app.url}/api/chat/sessions/s1/turns/${turn.id}/events`);await events.text();
 assert.equal(calls.length,1);assert.match(JSON.stringify(calls[0]),/NED_WORK_REFERENCES/);assert.match(JSON.stringify(calls[0]),/task-sentinel/);
});
test('TC-034: reference pills deduplicate, preserve identity/draft on failure and clear after confirmed success',async()=>{
 const h=await chatHarness({references:true}),get=id=>h.elements.get(id);
 await h.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await h.respond({data:[]});
 get('chat-message').value='What remains?';
 const add=detail=>h.document.dispatchEvent({type:'ned-reference-work',detail});
 const ref={projectId:'a',itemId:'same',title:'Plan task',projectName:'Alpha'};
 add(ref);add(ref);assert.equal(get('chat-task-references').children.length,1);assert.equal(get('chat-message').value,'What remains?');
 add({...ref,projectId:'b',projectName:'Beta'});assert.equal(get('chat-task-references').children.length,2);
 get('chat-task-references').children[1].children[2].click();assert.equal(get('chat-task-references').children.length,1);
 get('chat-form').dispatch('submit');assert.deepEqual(JSON.parse(h.requests[0].options.body),{input:'What remains?',references:[{projectId:'a',itemId:'same'}]});
 await h.respond({error:{code:'invalid_reference',message:'Remove stale reference.'}},400);
 assert.equal(get('chat-task-references').children.length,1);assert.equal(get('chat-message').value,'What remains?');assert.equal(get('chat-send').disabled,false);
 const id='00000000-0000-0000-0000-000000000001';get('chat-form').dispatch('submit');
 add({...ref,itemId:'ignored'});assert.equal(get('chat-task-references').children.length,1);
 await h.respond({turn:{id,status:'pending'}});await h.respond({turn:{id,status:'completed'},session_id:'nedcom-main',message:{content:'Confirmed'}});await h.respond({data:[{id:1,role:'assistant',content:'Confirmed'}]});
 assert.equal(get('chat-task-references').children.length,0);assert.equal(get('chat-message').value,'');
 add(ref);get('chat-message').value='';get('chat-message').dispatch('keydown',{key:'Enter'});assert.equal(h.requests.length,1,'reference-only message is accepted by composer');
 await h.respond({error:{code:'invalid_reference',message:'Stale'}},400);
});
test('TC-034: rendered nested task order survives dependencies across goal branches',async()=>{
 const {renderProjectWork}=await import('../../../../src/communicator/public/project-work.js');
 const create=tag=>({tag,dataset:{},children:[],textContent:'',setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}});
 const document={createElement:create},container=create('div');
 const items=[item('goal-a','planned',{type:'goal'}),item('a1','ready',{parentId:'goal-a',priority:0}),item('a2','ready',{parentId:'goal-a',priority:0,dependsOn:['b1']}),item('goal-b','planned',{type:'goal'}),item('b1','ready',{parentId:'goal-b'})];
 renderProjectWork(document,container,{projectId:'a',items});
 const buttons=[];function walk(node){if(node.tag==='button'&&node.dataset.kind==='task')buttons.push(node.textContent);for(const child of node.children)walk(child);}walk(container);
 assert.deepEqual(buttons,['a1','b1','a2']);
});
test('TC-034: uncertain delivery retains references and locks replay/removal',async()=>{
 const h=await chatHarness({references:true}),get=id=>h.elements.get(id);
 await h.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await h.respond({data:[]});
 h.document.dispatchEvent({type:'ned-reference-work',detail:{projectId:'a',itemId:'task',title:'Task',projectName:'Alpha'}});
 get('chat-message').value='Keep draft';get('chat-form').dispatch('submit');
 const id='00000000-0000-0000-0000-000000000002';await h.respond({turn:{id,status:'pending'}});await h.respond({},503);
 assert.equal(get('chat-task-references').children.length,1);assert.equal(get('chat-message').value,'Keep draft');assert.equal(get('chat-send').disabled,true);
 get('chat-task-references').children[0].children[2].click();assert.equal(get('chat-task-references').children.length,1);get('chat-form').dispatch('submit');assert.equal(h.requests.length,0);
});
