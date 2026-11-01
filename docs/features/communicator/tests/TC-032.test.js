import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDebugPane,recordChatDiagnostic} from '../../../../src/communicator/public/debug-pane.js';
import {mountPaneResize} from '../../../../src/communicator/public/pane-resize.js';
import {chatHarness} from './chat-harness.js';
import * as debugDiagnostics from '../../../../src/communicator/public/debug-pane.js';

function fixture(width=1280,request=async()=>({ok:true,json:async()=>({status:'ok',service:'nedcom'})})){
  const document=new EventTarget(),view=new EventTarget(),nodes=new Map();
  const make=()=>{
    const node=new EventTarget();node.children=[];node.attributes={};node.hidden=false;
    node.setAttribute=(name,value)=>{node.attributes[name]=value;};
    node.append=(...children)=>node.children.push(...children);
    node.replaceChildren=(...children)=>{node.children=children;};
    node.focus=()=>{document.activeElement=node;};
    node.contains=target=>node===target||node.children.includes(target);
    return node;
  };
  for(const id of ['app-shell','debug-pane','debug-toggle','debug-close','debug-clear','debug-health','debug-chat','debug-events','debug-empty'])nodes.set(id,make());
  document.getElementById=id=>nodes.get(id);document.createElement=make;
  view.innerWidth=width;
  const pane=nodes.get('debug-pane');pane.append(nodes.get('debug-close'));pane.open=false;
  pane.show=()=>{pane.open=true;pane.modal=false;};pane.showModal=()=>{pane.open=true;pane.modal=true;};pane.close=()=>{pane.open=false;};
  nodes.get('app-shell').dataset={};
  let requests=0;
  const dispose=mountDebugPane({document,view,request:(...args)=>{requests++;assert.equal(args[0],'/api/health');return request(...args);}});
  const click=id=>nodes.get(id).dispatchEvent(new Event('click'));
  click('debug-clear');
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  return {nodes,document,view,pane,dispose,click,tick,requests:()=>requests,resize:width=>{view.innerWidth=width;view.dispatchEvent(new Event('resize'));}};
}

test('TC-032: toggle, breakpoint, Escape and disposal preserve disclosure and focus semantics',async()=>{
  const subject=fixture();const {nodes,pane}=subject;
  try{
    assert.equal(pane.hidden,true);assert.equal(pane.inert,true);assert.equal(nodes.get('debug-toggle').attributes['aria-expanded'],'false');
    subject.click('debug-toggle');await subject.tick();
    assert.equal(pane.open,true);assert.equal(pane.modal,false);assert.equal(pane.inert,false);
    assert.equal(nodes.get('app-shell').dataset.debugOpen,'true');assert.equal(nodes.get('debug-health').textContent,'Available');
    assert.equal(subject.document.activeElement,nodes.get('debug-close'));assert.equal(subject.requests(),1);
    subject.resize(390);assert.equal(pane.modal,true);assert.equal(nodes.get('app-shell').dataset.debugOpen,'false');
    subject.resize(1280);assert.equal(pane.modal,false);
    const escape=new Event('keydown',{cancelable:true});escape.key='Escape';subject.document.dispatchEvent(escape);
    assert.equal(escape.defaultPrevented,true);assert.equal(pane.open,false);assert.equal(pane.inert,true);
    assert.equal(subject.document.activeElement,nodes.get('debug-toggle'));
    subject.click('debug-toggle');subject.click('debug-close');assert.equal(pane.hidden,true);
    await subject.tick();assert.equal(subject.requests(),2);
  }finally{subject.dispose();}
  subject.click('debug-toggle');assert.equal(pane.open,false);
});

test('TC-032: only bounded allowlisted lifecycle labels survive, never payload fields',()=>{
  const subject=fixture();
  try{
    recordChatDiagnostic('Bearer SECRET');recordChatDiagnostic({type:'ready',content:'PRIVATE'});
    for(let index=0;index<60;index++)recordChatDiagnostic(index%2?'streaming':'sending',{text:'PRIVATE',token:'SECRET'});
    const rows=subject.nodes.get('debug-events').children;
    assert.equal(rows.length,40);
    assert.deepEqual(new Set(rows.map(row=>row.children[1].textContent)),new Set(['Sending message','Receiving HTTP stream']));
    assert.match(rows[0].children[0].dateTime,/^\d{4}-\d{2}-\d{2}T/);
    assert.equal(subject.nodes.get('debug-chat').textContent,'Receiving HTTP stream');
    subject.click('debug-clear');assert.equal(subject.nodes.get('debug-events').children.length,0);
    assert.equal(subject.nodes.get('debug-empty').hidden,false);assert.equal(subject.nodes.get('debug-chat').textContent,'Receiving HTTP stream');
  }finally{subject.dispose();}
});
test('TC-032: request failures identify the phase and HTTP outcome without private metadata',()=>{
  const subject=fixture();
  try{
    debugDiagnostics.recordRequestDiagnostic?.('history',{status:503,durationMs:27.9,error:new TypeError('PRIVATE transcript'),body:'PRIVATE',url:'https://secret.invalid/'});
    assert.equal(subject.nodes.get('debug-events').children.at(-1)?.children[1].textContent,'history · HTTP 503 · TypeError · 27 ms');
    debugDiagnostics.recordRequestDiagnostic?.('SECRET',{status:200});
    assert.equal(subject.nodes.get('debug-events').children.length,1);
  }finally{subject.dispose();}
});

test('TC-032: failed health is explicit and stale probes cannot overwrite a reopened pane',async()=>{
  let resolveOld;
  let count=0;
  const subject=fixture(320,()=>++count===1?new Promise(resolve=>{resolveOld=resolve;}):Promise.reject(Error('SECRET')));
  try{
    subject.click('debug-toggle');await subject.tick();assert.equal(subject.pane.modal,true);
    subject.click('debug-close');subject.click('debug-toggle');await subject.tick();
    assert.equal(subject.nodes.get('debug-health').textContent,'Unavailable');
    resolveOld({ok:true,json:async()=>({status:'ok',service:'nedcom',token:'SECRET'})});await subject.tick();
    assert.equal(subject.nodes.get('debug-health').textContent,'Unavailable');assert.equal(subject.requests(),2);
    const cancel=new Event('cancel',{cancelable:true});subject.pane.dispatchEvent(cancel);
    assert.equal(cancel.defaultPrevented,true);assert.equal(subject.pane.hidden,true);
  }finally{subject.dispose();}
});

test('TC-032: desktop debug reservation clamps a resized chat and restores its preferred width',()=>{
  const view=new EventTarget(),divider=new EventTarget(),values={};
  const shell={clientWidth:1280,dataset:{debugOpen:'false'},style:{setProperty:(key,value)=>{values[key]=value;}},classList:{remove:()=>{}}};
  divider.setAttribute=(key,value)=>{values[key]=value;};
  const dispose=mountPaneResize({shell,divider,view,storage:()=>({getItem:()=> '900',setItem:()=>{}})});
  try{
    assert.equal(values['aria-valuenow'],'900');shell.dataset.debugOpen='true';view.dispatchEvent(new Event('resize'));
    assert.equal(values['aria-valuenow'],'652');assert.equal(values['aria-valuemax'],'652');
    shell.dataset.debugOpen='false';view.dispatchEvent(new Event('resize'));assert.equal(values['aria-valuenow'],'900');
  }finally{dispose();}
});

test('TC-032: actual history navigation settles diagnostics without hiding failures or changing reply completion',async()=>{
  const debug=fixture();
  try{
    const chat=await chatHarness();
    await chat.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
    await chat.respond({data:[]});
    chat.elements.get('latest').dispatch('click');
    assert.equal(debug.nodes.get('debug-chat').textContent,'Loading history');
    await chat.respond({data:[]});
    assert.equal(debug.nodes.get('debug-chat').textContent,'Connected to Hermes');
    chat.elements.get('latest').dispatch('click');await chat.respond({},503);await chat.tick();await chat.respond({},503);await chat.tick();await chat.respond({},503);
    assert.equal(debug.nodes.get('debug-chat').textContent,'Chat unavailable');
    chat.elements.get('latest').dispatch('click');await chat.respond({data:[]});
    const draft=chat.elements.get('chat-message');draft.value='Synthetic';
    chat.elements.get('chat-form').dispatch('submit');
    assert.equal(debug.nodes.get('debug-chat').textContent,'Sending message');
    const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await chat.respond({turn:{id,status:'pending'}},202);
    assert.equal(debug.nodes.get('debug-chat').textContent,'Receiving HTTP stream');
    await chat.respond({turn:{id,status:'completed'},message:{content:'Done'},session_id:'nedcom-main'});
    await chat.respond({data:[]});
    assert.equal(debug.nodes.get('debug-chat').textContent,'Reply complete');
  }finally{debug.dispose();}
});
