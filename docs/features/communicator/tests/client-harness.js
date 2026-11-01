import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as state from '../../../../src/communicator/public/state.js';
import {mountMobileNavigation} from '../../../../src/communicator/public/mobile-navigation.js';

// Run the shipped client with its real state model; defer only the HTTP boundary.
export async function clientHarness({EventSource}={}) {
  const classes = () => { const values=new Set();return {toggle(name,on){if(on)values.add(name);else values.delete(name);},contains:name=>values.has(name)}; };
  const documentListeners=new Map();
  const document = { body: {classList:classes()}, activeElement: null, addEventListener(type,callback){documentListeners.set(type,callback);}, dispatch(type,event={}){documentListeners.get(type)?.(event);} };
  document.activeElement = document.body;
  const elements = new Map();
  function element(id) {
    const listeners = new Map();
    let disabled = false, hidden = false;
    const blur = () => { if (document.activeElement === node) document.activeElement = document.body; };
    const node = {
      id, dataset: {}, value: '', textContent: '', classList: classes(), isConnected:true, parentElement:null, inert:false,
      set disabled(value) { disabled = value; if (value) blur(); }, get disabled() { return disabled; },
      set hidden(value) { hidden = value; if (value) blur(); }, get hidden() { return hidden; },
      focus() { if (!disabled && !hidden) document.activeElement = node; },
      dispatchEvent(event){node.dispatch(event.type,event);},
      options:[],
      setAttribute(name,value) { node[name]=value; }, removeAttribute(name) {delete node[name];}, replaceChildren(...nodes) {node.options=nodes;}, add(option) {node.options.push(option);}, getClientRects(){return [{}];},
      addEventListener(type, callback) { listeners.set(type, callback); },
      dispatch(type,event={}) { listeners.get(type)?.(event); }, contains(target){for(let node=target;node;node=node.parentElement)if(node===this)return true;return false;},
    };
    elements.set(id, node); return node;
  }
  for (const id of ['project','retry','heading','announcement','message','identity','open-app','new-tab-note','navigation-hint','card','app-shell','sidebar-toggle','mobile-sidebar-toggle','sidebar','content','chat','drawer-scrim','project-detail-toggle','aux-toggle','detail-close','preview','preview-heading','preview-message','preview-identity','preview-open','preview-note','preview-retry','preview-toggle','left-pane','left-toggle']) element(id);
  elements.get('content').hidden=true;elements.get('drawer-scrim').hidden=true;
  for(const id of ['sidebar-toggle','project-detail-toggle'])elements.get(id).parentElement=elements.get('sidebar');
  elements.get('chat').parentElement=elements.get('left-pane');elements.get('content').parentElement=elements.get('left-pane');
  const sections = ['Tasks','Artifacts'].map(name => { const node = element(name); node.dataset.section = name;node.id=name==='Tasks'?'goals-tab':'artifacts-tab';node.textContent=name==='Tasks'?'Goals':'Artifacts';return node; });
  document.getElementById = id => elements.get(id);
  document.querySelector = () => null;
  document.querySelectorAll = () => sections;
  const mediaListeners=new Set();const viewport={matches:false,addEventListener(type,callback){if(type==='change')mediaListeners.add(callback);}};
  const setMobile=matches=>{viewport.matches=matches;for(const callback of mediaListeners)callback({matches});};
  const requests = [];
  const fetch = url => new Promise(resolve => requests.push({ url, resolve }));
  const source = await readFile(new URL('../../../../src/communicator/public/app.js', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import[^\n]+\n/gm, ''), { ...state,mountMobileNavigation, document, fetch, Option: class {constructor(label,value){this.textContent=label;this.value=value;}},EventSource,Event:class{constructor(type){this.type=type;}}, encodeURIComponent,matchMedia:()=>viewport,getComputedStyle:()=>({display:'block',visibility:'visible'}) });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  async function respond(data, status = 200) {
    const request = requests.shift();
    if (!request) throw new Error('Expected pending request');
    request.resolve({ ok: status === 200, json: async () => data }); await flush();
  }
  await respond({ capabilities: { projects: true } });
  await respond({ projects: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }] });
  const project = elements.get('project'); project.value = 'a'; project.dispatch('change');
  await respond({ preview: { status: 'unconfigured' } });
  return { elements, document, requests, respond, setMobile };
}
