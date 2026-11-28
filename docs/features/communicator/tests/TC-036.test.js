import test from 'node:test';
import assert from 'node:assert/strict';
import {mountActivity} from '../../../../apps/com/src/public/activity-ui.js';
import {clientHarness} from './client-harness.js';

test('TC-036: mobile shows Chat first and switches to the preserved workspace tab',async()=>{
  const {elements,setMobile,document}=await clientHarness();setMobile(true);
  assert.equal(elements.get('chat').inert,false);
  assert.equal(elements.get('preview').inert,true);
  elements.get('preview-toggle').dispatch('click');
  assert.equal(elements.get('chat').inert,true);
  assert.equal(elements.get('preview').hidden,false);
  elements.get('goals-pane-tab').dispatch('keydown',{key:'End',preventDefault(){}});
  assert.equal(document.activeElement,elements.get('debug-pane'));
  elements.get('left-toggle').dispatch('click');
  assert.equal(document.activeElement,elements.get('chat'));
  elements.get('preview-toggle').dispatch('click');
  assert.equal(elements.get('debug-tab')['aria-selected'],'true');
  setMobile(false);
  assert.equal(elements.get('left-pane').hidden,false);
  assert.equal(elements.get('preview').hidden,false);
});
function node(){
  const target=new EventTarget();target.children=[];target.dataset={};target.attributes={};
  target.setAttribute=(name,value)=>{target.attributes[name]=value;};target.removeAttribute=name=>delete target.attributes[name];
  target.append=(...nodes)=>{for(const child of nodes){child.parentElement?.children.splice(child.parentElement.children.indexOf(child),1);child.parentElement=target;target.children.push(child);}};
  target.insertBefore=(child,next)=>{target.append(child);target.children.pop();const index=target.children.indexOf(next);target.children.splice(index<0?target.children.length:index,0,child);};
  target.replaceChildren=(...nodes)=>{target.children=nodes;target.mutations=(target.mutations||0)+1;target.textContent='';};
  target.contains=child=>target.children.includes(child);return target;
}
test('TC-036: repeated notices remain dismissed, changed updates reappear and stale project events cannot leak',()=>{
  const nodes=new Map(['chat-activity','chat-activity-content','project','chat-activity-dismiss'].map(id=>[id,node()]));
  const document={getElementById:id=>nodes.get(id),createElement:node};const streams=[];
  class EventSource{constructor(){streams.push(this);}close(){this.closed=true;}}
  const project=nodes.get('project'),panel=nodes.get('chat-activity'),content=nodes.get('chat-activity-content');project.value='alpha';
  const dispose=mountActivity({document,EventSource});
  const update={kind:'task',title:'<script>literal</script>',status:'blocked',time:'2026-10-30T12:00:00Z'};
  const send=(stream,id,updates)=>stream.onmessage({data:JSON.stringify({projectId:id,updates})});
  send(streams[0],'alpha',[update]);assert.equal(panel.hidden,false);assert.equal(content.children[0].children[1].textContent,update.title);
  nodes.get('chat-activity-dismiss').dispatchEvent(new Event('click'));const mutations=content.mutations;
  send(streams[0],'alpha',[update]);assert.equal(panel.hidden,true);assert.equal(content.mutations,mutations);
  send(streams[0],'alpha',[{...update,status:'done'}]);assert.equal(panel.hidden,false);
  project.value='beta';project.dispatchEvent(new Event('change'));assert.equal(panel.hidden,true);assert.equal(content.children.length,0);assert.equal(streams[0].closed,true);
  send(streams[0],'alpha',[update]);assert.equal(panel.hidden,true);
  send(streams[1],'beta',[]);assert.equal(panel.hidden,true);
  streams[1].onerror();assert.equal(panel.hidden,false);assert.equal(content.textContent,'Updates unavailable.');
  nodes.get('chat-activity-dismiss').dispatchEvent(new Event('click'));streams[1].onerror();assert.equal(panel.hidden,true);
  dispose();assert.equal(streams[1].closed,true);
});
