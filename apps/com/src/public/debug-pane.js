import {requestDiagnostic} from './request-diagnostic.js';
const labels=Object.freeze({connecting:'Connecting to Hermes',ready:'Connected to Hermes',loading:'Loading history',sending:'Sending message',streaming:'Receiving HTTP stream',completed:'Reply complete',failed:'Chat unavailable'});
const listeners=new Set();
let current='Not connected';
let events=[];
export function recordRequestDiagnostic(phase,details){
  const safe=requestDiagnostic(phase,details);if(!safe)return;
  const label=[safe.phase,safe.status?`HTTP ${safe.status}`:'No HTTP response',safe.type,safe.code,safe.failure,`${safe.durationMs} ms`].filter(Boolean).join(' · ');
  events=[...events,{label,time:new Date().toISOString()}].slice(-40);
  for(const listener of listeners)listener();
}

export function recordChatDiagnostic(type){
  if(!Object.hasOwn(labels,type))return;
  current=labels[type];
  if(events.at(-1)?.label!==current)events=[...events,{label:current,time:new Date().toISOString()}].slice(-40);
  for(const listener of listeners)listener();
}

export function mountDebugPane({document,view=window,request=fetch}){
  const element=id=>document.getElementById(id);
  const shell=element('app-shell'),pane=element('debug-pane'),toggle=element('debug-toggle');
  const close=element('debug-close'),clear=element('debug-clear'),health=element('debug-health');
  let opened=false,modal=false,generation=0;
  const renderEvents=()=>{
    element('debug-chat').textContent=current;
    const list=element('debug-events');
    list.replaceChildren(...events.map(event=>{
      const row=document.createElement('li'),time=document.createElement('time'),label=document.createElement('span');
      time.dateTime=event.time;time.textContent=event.time.slice(11,19);label.textContent=event.label;
      row.append(time,label);return row;
    }));
    element('debug-empty').hidden=events.length>0;
  };
  const layout=()=>{
    const narrow=view.innerWidth<1100;
    const focused=pane.contains(document.activeElement)?document.activeElement:null;
    if(opened&&(!pane.open||modal!==narrow)){
      if(pane.open)pane.close();
      pane.hidden=false;pane.inert=false;
      if(narrow)pane.showModal();else pane.show();
      focused?.focus();
    }
    modal=narrow;
    shell.dataset.debugOpen=String(opened&&!narrow);
    toggle.setAttribute('aria-expanded',String(opened));
    if(!opened){if(pane.open)pane.close();pane.hidden=true;pane.inert=true;}
  };
  const notifyLayout=()=>view.dispatchEvent(new Event('resize'));
  const shut=()=>{opened=false;generation++;layout();notifyLayout();toggle.focus();};
  const open=()=>{
    opened=true;layout();notifyLayout();close.focus();renderEvents();
    const token=++generation;health.textContent='Checking…';
    void Promise.resolve().then(()=>request('/api/health',{signal:AbortSignal.timeout(5000)})).then(async response=>{
      const data=response.ok?await response.json():null;
      if(token===generation)health.textContent=data?.status==='ok'&&data?.service==='nedcom'?'Available':'Unavailable';
    }).catch(()=>{if(token===generation)health.textContent='Unavailable';});
  };
  const click=()=>opened?shut():open();
  const cancel=event=>{event.preventDefault();shut();};
  const key=event=>{if(opened&&event.key==='Escape'){event.preventDefault();shut();}};
  const wipe=()=>{events=[];renderEvents();};
  toggle.addEventListener('click',click);close.addEventListener('click',shut);clear.addEventListener('click',wipe);
  pane.addEventListener('cancel',cancel);document.addEventListener('keydown',key);view.addEventListener('resize',layout);
  listeners.add(renderEvents);layout();renderEvents();
  return ()=>{generation++;opened=false;layout();notifyLayout();listeners.delete(renderEvents);toggle.removeEventListener('click',click);close.removeEventListener('click',shut);clear.removeEventListener('click',wipe);pane.removeEventListener('cancel',cancel);document.removeEventListener('keydown',key);view.removeEventListener('resize',layout);};
}
