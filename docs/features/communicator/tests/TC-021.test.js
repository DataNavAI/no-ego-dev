import test from 'node:test';
import assert from 'node:assert/strict';
import {paneBounds,paneWidth,mountPaneResize} from '../../../../src/communicator/public/pane-resize.js';

function fixture(saved=null,{broken=false,width=1280}={}){
  const divider=new EventTarget();
  const view=new EventTarget();
  const values=new Map();
  const classes=new Set();
  let captured=null;
  let stored=saved;
  const shell={clientWidth:width,style:{setProperty:(key,value)=>values.set(key,value)},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  divider.setAttribute=(key,value)=>values.set(key,value);
  divider.focus=()=>{view.document.activeElement=divider;};
  divider.setPointerCapture=id=>{captured=id;};
  divider.hasPointerCapture=id=>captured===id;
  divider.releasePointerCapture=()=>{captured=null;};
  const mobileToggle={focus:()=>{view.document.activeElement=mobileToggle;}};
  view.document={activeElement:null,getElementById:()=>mobileToggle};
  const storage=()=>{if(broken)throw Error('storage disabled');return {getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};};
  const dispose=mountPaneResize({shell,divider,view,storage});
  const fire=(name,properties={})=>{
    const event=new Event(name,{cancelable:true});Object.assign(event,properties);divider.dispatchEvent(event);return event;
  };
  const viewport=value=>{shell.clientWidth=value;view.dispatchEvent(new Event('resize'));};
  return {divider,view,values,classes,fire,viewport,dispose,stored:()=>stored,captured:()=>captured};
}

test('TC-021: sizing preserves defaults and clamps invalid or extreme preferences',()=>{
  assert.deepEqual(paneBounds(768),{min:320,max:440});
  assert.equal(paneWidth(undefined,1280),360);
  assert.equal(paneWidth(undefined,800),320);
  assert.equal(paneWidth(2000,1280),952);
  assert.equal(paneWidth(10,1280),320);
  assert.equal(paneWidth(NaN,1280),360);
});

test('TC-021: keyboard controls expose accurate bounds and persist without submitting',()=>{
  const subject=fixture();
  try{
    assert.equal(subject.values.get('aria-valuenow'),'360');
    assert.equal(subject.fire('ArrowRight').defaultPrevented,false);
    assert.equal(subject.fire('keydown',{key:'ArrowRight'}).defaultPrevented,true);
    assert.equal(subject.stored(),'376');
    subject.fire('keydown',{key:'ArrowRight',shiftKey:true});
    assert.equal(subject.stored(),'440');
    subject.fire('keydown',{key:'Home'});assert.equal(subject.stored(),'320');
    subject.fire('keydown',{key:'End'});assert.equal(subject.stored(),'952');
    subject.fire('keydown',{key:'ArrowLeft',ctrlKey:true});assert.equal(subject.stored(),'952');
    subject.fire('keydown',{key:'ArrowLeft'});assert.equal(subject.stored(),'936');
    subject.viewport(800);assert.equal(subject.values.get('aria-valuenow'),'472');
    assert.equal(subject.stored(),'936');
    subject.viewport(1280);assert.equal(subject.values.get('aria-valuenow'),'936');
    const reloaded=fixture(subject.stored());
    assert.equal(reloaded.values.get('aria-valuenow'),'936');reloaded.dispose();
  }finally{subject.dispose();}
});

test('TC-021: pointer identity, clamping, release and mobile interruption preserve the draft workspace',()=>{
  const subject=fixture();
  try{
    subject.fire('pointerdown',{button:2,pointerId:1,clientX:360});assert.equal(subject.captured(),null);
    subject.fire('pointerdown',{button:0,isPrimary:false,pointerId:1,clientX:360});assert.equal(subject.captured(),null);
    subject.fire('pointerdown',{button:0,pointerId:2,clientX:360});
    assert.equal(subject.captured(),2);assert.equal(subject.view.document.activeElement,subject.divider);
    subject.fire('pointermove',{pointerId:3,clientX:900});assert.equal(subject.values.get('aria-valuenow'),'360');
    subject.fire('pointermove',{pointerId:2,clientX:600});assert.equal(subject.values.get('aria-valuenow'),'600');
    subject.fire('pointerup',{pointerId:3});assert.equal(subject.captured(),2);
    subject.fire('pointermove',{pointerId:2,clientX:9999});assert.equal(subject.values.get('aria-valuenow'),'952');
    subject.fire('pointerup',{pointerId:2});assert.equal(subject.captured(),null);assert.equal(subject.stored(),'952');
    subject.fire('pointerdown',{button:0,pointerId:4,clientX:952});
    subject.fire('pointermove',{pointerId:4,clientX:0});assert.equal(subject.values.get('aria-valuenow'),'320');
    subject.fire('pointercancel',{pointerId:4});assert.equal(subject.captured(),null);
    subject.fire('pointerdown',{button:0,pointerId:5,clientX:320});subject.viewport(390);
    assert.equal(subject.captured(),null);assert.equal(subject.divider.hidden,true);assert.equal(subject.divider.tabIndex,-1);
    assert.notEqual(subject.view.document.activeElement,subject.divider);assert.equal(subject.classes.size,0);
    subject.fire('keydown',{key:'End'});assert.equal(subject.stored(),'320');
    subject.viewport(1280);assert.equal(subject.divider.hidden,false);assert.equal(subject.divider.tabIndex,0);
    subject.dispose();subject.fire('keydown',{key:'End'});assert.equal(subject.stored(),'320');
  }finally{subject.dispose();}
});

test('TC-021: malformed and inaccessible local storage cannot break resizing',()=>{
  for(const saved of ['null','Infinity','{}','-9','', '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999']){
    const subject=fixture(saved);assert.equal(subject.values.get('aria-valuenow'),'360');subject.dispose();
  }
  const subject=fixture(null,{broken:true});
  subject.fire('keydown',{key:'ArrowRight'});assert.equal(subject.values.get('aria-valuenow'),'376');subject.dispose();
});
