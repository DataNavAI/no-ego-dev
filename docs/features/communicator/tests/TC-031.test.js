import {clientHarness} from './client-harness.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures.js';
import {readWorkspace,readProjectWork} from '../../../../src/communicator/work.js';
import {followTaskProject} from '../../../../src/communicator/public/state.js';
import {renderProjectWork} from '../../../../src/communicator/public/project-work.js';
function add(f,project,id,type,parent=null){
 const db=f.writer.connection;
 db.prepare('INSERT INTO ned_work_items(project_id,id,type,title,description,priority,state,parent_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,2,?,?,?,?,?)').run(project,id,type,`<script>${id}</script>`,'PRIVATE','open',parent,'fixture','2026-10-29','2026-10-29');
 db.prepare('INSERT INTO ned_task_events(id,project_id,item_id,type,actor,value,created_at) VALUES(?,?,?,?,?,?,?)').run(project+id,project,id,'created','PRIVATE','{}','2026-10-29');
}
test('TC-031: workspace follows latest task event while work stays project-scoped and read-only',async t=>{
 const f=await fixture(t);add(f,'project-0','g','goal');add(f,'project-0','sg','subgoal','g');add(f,'project-0','t','task','sg');add(f,'project-1','b','task');
 assert.equal(readWorkspace(f.databasePath).latestTask.projectId,'project-1');
 const data=readProjectWork(f.databasePath,'project-0');assert.equal(data.projectId,'project-0');assert.equal(data.items.find(x=>x.id==='t').parentId,'sg');
 assert.ok(!data.items.some(x=>x.id==='b'));assert.doesNotMatch(JSON.stringify(data),/PRIVATE|description|actor/);
 assert.equal((await f.get('/api/projects/project-0/work')).status,200);
 assert.equal((await f.get('/api/projects/missing/work')).status,404);
 assert.throws(()=>readProjectWork(f.home+'/missing.sqlite','project-0'),error=>error.status===503);
 const stream=await fetch(f.app.url+'/api/workspace/events');const reader=stream.body.getReader();
 try{const chunk=new TextDecoder().decode((await reader.read()).value);assert.match(chunk,/latestTask/);assert.match(chunk,/project-1/);}finally{await reader.cancel();}
 const before=f.writer.connection.prepare('SELECT COUNT(*) AS n FROM ned_task_events').get().n;
 readProjectWork(f.databasePath,'project-0');assert.equal(f.writer.connection.prepare('SELECT COUNT(*) AS n FROM ned_task_events').get().n,before);
});
test('TC-031: manual selection survives heartbeat/reconnect until a newer task event',()=>{
 const projects=[{id:'a'},{id:'b'}];const snapshot={projects,latestTask:{projectId:'b',sequence:10}};
 assert.deepEqual(followTaskProject(null,0,snapshot),{projectId:'b',sequence:10});
 assert.deepEqual(followTaskProject('a',10,snapshot),{projectId:'a',sequence:10});
 assert.equal(followTaskProject('a',10,{...snapshot,revision:11}).projectId,'a');
 assert.equal(followTaskProject('a',10,{...snapshot,latestTask:{projectId:'b',sequence:12}}).projectId,'b');
 assert.equal(followTaskProject('a',10,{projects:[],latestTask:null}).projectId,null);
});
test('TC-031: rendered hierarchy keeps nested literal titles and rejects orphaned/cyclic work',()=>{
 const create=tag=>({tag,dataset:{},children:[],textContent:'',setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}});
 const document={createElement:create},container=create('div');
 const items=[{id:'g',parentId:null,type:'goal',title:'<img src=x>',status:'working'},{id:'t',parentId:'g',type:'task',title:'Task',status:'ready'}];
 renderProjectWork(document,container,{items});
 const texts=[];const pending=[container];while(pending.length){const node=pending.pop();texts.push(node.textContent);pending.push(...node.children);}
 assert.ok(texts.includes('<img src=x>'));assert.ok(texts.includes('Task'));
 assert.throws(()=>renderProjectWork(document,container,{items:[{...items[1],parentId:'missing'}]}));
 assert.throws(()=>renderProjectWork(document,container,{items:[{...items[0],parentId:'t'},items[1]]}));
});

test('TC-031: shipped controller populates new project options before following its task',async()=>{
 const streams=[];class EventSource{constructor(){streams.push(this);}}
 const harness=await clientHarness({EventSource});const project=harness.elements.get('project');let selected=project.value;
 Object.defineProperty(project,'value',{get:()=>selected,set:value=>{selected=project.options.some(option=>option.value===value)?value:'';}});
 const snapshot={projects:[{id:'a',name:'Alpha'},{id:'b',name:'Beta'},{id:'new',name:'New project',displayPath:'/private/project/path'}],latestTask:{projectId:'new',sequence:100},revision:100};
 streams[0].onmessage({data:JSON.stringify(snapshot)});
 assert.equal(project.value,'new');assert.equal(project.options.find(option=>option.value==='new').textContent,'New project');assert.equal(harness.requests.at(-1).url,'/api/projects/new');
 await harness.respond({preview:{status:'unconfigured'}});
 project.value='a';project.dispatch('change');await harness.respond({preview:{status:'unconfigured'}});
 streams[0].onmessage({data:JSON.stringify(snapshot)});assert.equal(project.value,'a');assert.equal(harness.requests.length,0);
});
