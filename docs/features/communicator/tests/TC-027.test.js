import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {connectProjectPicker,enhanceProjectPicker} from '../../../../src/communicator/public/project-picker.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

function fixture(){
  const document={activeElement:null};
  const observers=[];
  class Observer{
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(){} disconnect(){this.disconnected=true;}
  }
  const node=()=>{
    const listeners=new Map();
    return {value:'',disabled:false,hidden:false,children:[],replacements:0,
      addEventListener(name,fn){listeners.set(name,[...(listeners.get(name)||[]),fn]);},
      removeEventListener(name,fn){listeners.set(name,(listeners.get(name)||[]).filter(listener=>listener!==fn));},
      dispatchEvent(event){for(const listener of listeners.get(event.type)||[])listener(event);},
      replaceChildren(...nodes){this.children=nodes;this.replacements++;},
      after(child){this.sibling=child;},remove(){this.removed=true;},
      focus(){document.activeElement=this;},
      updateComplete:Promise.resolve(true),
    };
  };
  document.createElement=node;
  const native=node();native.options=[{value:'',textContent:'Projects',disabled:false},{value:'a',textContent:'Alpha <script>literal</script> · /safe/path',disabled:false},{value:'b',textContent:'Beta',disabled:false}];
  const picker=node();
  return {document,native,picker,observers,MutationObserver:Observer,customElements:{whenDefined:()=>Promise.resolve()}};
}

test('TC-027: enhanced project choice updates the existing native controller once and rejects stale values',()=>{
  const f=fixture();let changes=0;
  f.native.addEventListener('change',()=>changes++);
  const disconnect=connectProjectPicker(f.native,f.picker,f);
  assert.equal(f.picker.children[1].textContent,'Alpha <script>literal</script> · /safe/path');
  assert.equal(f.picker.children[1].innerHTML,undefined,'project labels remain literal text');
  f.picker.value='a';f.picker.dispatchEvent(new Event('change'));
  assert.equal(f.native.value,'a');assert.equal(changes,1);
  f.picker.dispatchEvent(new Event('change'));assert.equal(changes,1,'unchanged choice does not reload');
  f.picker.value='missing';f.picker.dispatchEvent(new Event('change'));
  assert.equal(f.native.value,'a');assert.equal(f.picker.value,'a');assert.equal(changes,1);
  f.native.disabled=true;f.observers[0].callback();
  f.picker.value='b';f.picker.dispatchEvent(new Event('change'));
  assert.equal(f.native.value,'a');assert.equal(f.picker.disabled,true);assert.equal(changes,1);
  disconnect();assert.equal(f.observers[0].disconnected,true);
});

test('TC-027: inventory and loading updates mirror without rebuilding an unchanged open menu',()=>{
  const f=fixture();connectProjectPicker(f.native,f.picker,f);
  const options=f.picker.children;
  f.picker.open=true;f.native.value='b';f.observers[0].callback();
  assert.equal(f.picker.children,options);assert.equal(f.picker.open,true);assert.equal(f.picker.value,'b');
  f.native.disabled=true;f.observers[0].callback();assert.equal(f.picker.disabled,true);
  f.native.options=[{value:'',textContent:'Loading projects…',disabled:false}];f.native.value='';f.observers[0].callback();
  assert.equal(f.picker.children.length,1);assert.equal(f.picker.children[0].textContent,'Loading projects…');assert.equal(f.picker.value,'');
  f.native.disabled=false;f.native.options.push({value:'c',textContent:'Gamma',disabled:false});f.observers[0].callback();
  assert.equal(f.picker.disabled,false);assert.equal(f.picker.children[1].value,'c');
});

test('TC-027: native picker stays usable until kit readiness and survives initialization failure',async()=>{
  const f=fixture();let ready;const wait=new Promise(resolve=>{ready=resolve;});
  f.customElements.whenDefined=()=>wait;f.document.activeElement=f.native;
  const pending=enhanceProjectPicker(f.native,f);
  assert.equal(f.native.hidden,false);assert.equal(f.native.sibling,undefined);
  ready();const picker=await pending;
  assert.equal(f.native.hidden,true);assert.equal(picker.hidden,false);assert.equal(f.document.activeElement,picker);
  const failed=fixture();failed.document.createElement=()=>{throw new Error('kit initialization failed');};
  assert.equal(await enhanceProjectPicker(failed.native,failed),null);assert.equal(failed.native.hidden,false);
});

test('TC-027: locally shipped kit assets retain self-only CSP and deny arbitrary paths',async t=>{
  const app=createCommunicatorServer();await app.listen();t.after(()=>app.close());
  for(const [asset,type] of [['webawesome.js','text/javascript'],['webawesome-theme.css','text/css'],['wa-check.svg','image/svg+xml'],['wa-chevron.svg','image/svg+xml'],['webawesome-LICENSE.txt','text/plain']]){
    const response=await fetch(app.url+'/vendor/'+asset);
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),new RegExp('^'+type.replace('+','\\+')));
    const csp=response.headers.get('content-security-policy');
    assert.match(csp,/script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'/);
    assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval|data:|https:/);
    assert.ok((await response.text()).length>100);
  }
  assert.equal((await fetch(app.url+'/vendor/not-allowed.svg')).status,404);
});

test('TC-027: pinned source rebuild matches every committed kit asset',async()=>{
  const {stdout}=await promisify(execFile)(process.execPath,['scripts/build-communicator-ui.mjs','--check'],{cwd:new URL('../../../../',import.meta.url),timeout:30000});
  assert.match(stdout,/match pinned sources/);
});
