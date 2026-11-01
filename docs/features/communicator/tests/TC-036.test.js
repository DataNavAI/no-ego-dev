import test from 'node:test';
import assert from 'node:assert/strict';
import {mountActivity} from '../../../../src/communicator/public/activity-ui.js';
import {mountMobileNavigation} from '../../../../src/communicator/public/mobile-navigation.js';
import {clientHarness} from './client-harness.js';

test('TC-036: mobile current location is exclusive while desktop remembers the selected left tab',async()=>{
  const {elements,setMobile}=await clientHarness();setMobile(true);
  for(const id of ['mobile-sidebar-toggle','Tasks','Artifacts']){
    const tab=elements.get(id);tab.dispatch('click');
    assert.equal(tab['aria-current'],'page');assert.equal(tab['aria-selected'],'true');
    elements.get('preview-toggle').dispatch('click');
    assert.equal(elements.get('preview-toggle')['aria-current'],'page');assert.equal(tab['aria-selected'],'false');assert.equal(tab['aria-current'],undefined);
    setMobile(false);assert.equal(tab['aria-selected'],'true');assert.equal(elements.get('preview-toggle')['aria-current'],undefined);
    setMobile(true);assert.equal(tab['aria-selected'],'false');
    elements.get('left-toggle').dispatch('click');assert.equal(tab['aria-current'],'page');assert.equal(elements.get('preview-toggle')['aria-current'],undefined);
  }
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

test('TC-036: drawer moves existing navigation, closes on selection/Escape and restores desktop nodes',()=>{
  const ids=['navigation-drawer','navigation-open','navigation-close','navigation-items','project-control','preview-toggle'];
  const nodes=new Map(ids.map(id=>[id,node()]));const tabs=node(),toolbar=node(),left=node(),switcher=node();
  toolbar.append(nodes.get('project-control'));left.append(tabs);switcher.append(nodes.get('preview-toggle'));
  const document={getElementById:id=>nodes.get(id),querySelector:()=>tabs,activeElement:null};for(const target of [...nodes.values(),tabs])target.focus=()=>{document.activeElement=target;};
  const drawer=nodes.get('navigation-drawer');drawer.showModal=()=>{drawer.open=true;};drawer.close=()=>{drawer.open=false;};
  const viewport=new EventTarget();viewport.matches=true;let selected=0;
  mountMobileNavigation({document,viewport,onSelect:()=>selected++});assert.equal(nodes.get('project-control').parentElement,nodes.get('navigation-items'));
  const click=id=>nodes.get(id).dispatchEvent(new Event('click'));click('navigation-open');assert.equal(drawer.open,true);assert.equal(document.activeElement,nodes.get('navigation-close'));
  const escape=new Event('cancel',{cancelable:true});drawer.dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);assert.equal(document.activeElement,nodes.get('navigation-open'));
  click('navigation-open');const nav=node();nav.closest=()=>nav;tabs.append(nav);const select=new Event('click');Object.defineProperty(select,'target',{value:nav});drawer.dispatchEvent(select);assert.equal(drawer.open,false);assert.equal(selected,1);
  click('navigation-open');viewport.matches=false;viewport.dispatchEvent(new Event('change'));assert.equal(drawer.open,false);assert.equal(tabs.parentElement,left);assert.equal(nodes.get('project-control').parentElement,toolbar);assert.equal(nodes.get('preview-toggle').parentElement,switcher);
});
