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

export function mountDebugPane({document,request=fetch}){
  const element=id=>document.getElementById(id);
  const pane=element('debug-pane');if(!pane)return ()=>{};
  const clear=element('debug-clear'),health=element('debug-health');
  let opened=false,generation=0,activityTimer;
  const agents=element('debug-agents'),agentEvents=element('debug-agent-events'),agentStatus=element('debug-agents-status');
  async function refreshActivity(token){
    if(!agents)return;
    try{
      const response=await request('/api/v1/chat/activity',{signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new Error();
      const data=await response.json();
      if(token!==generation)return;
      const row=(text,time)=>{
        const item=document.createElement('li'),stamp=document.createElement('time');
        stamp.dateTime=time;stamp.textContent=new Date(time).toLocaleString();
        item.textContent=text+' ';item.append(stamp);return item;
      };
      agents.replaceChildren(...data.agents.map(agent=>row(
        agent.role==='chat'?`Chat reply · ${agent.state}`:`${agent.role} · ${agent.state} · ${agent.taskId} · ${agent.id.slice(-8)}`,agent.time)));
      agentEvents.replaceChildren(...data.events.map(event=>row(`${event.event} · ${event.id}`,event.time)));
      agentStatus.textContent=data.agents.length?'Chat and Core agents observed by NED.':'No active chat or Core agents observed.';
    }catch{
      if(token===generation){
        agents.replaceChildren();agentEvents.replaceChildren();
        agentStatus.textContent='Agent activity is unavailable.';
      }
    }finally{
      if(token===generation)activityTimer=setTimeout(()=>void refreshActivity(token),3000);
    }
  }
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
  const sync=()=>{
    const visible=!pane.hidden&&!element('preview')?.hidden&&!element('app-shell')?.hidden;
    if(visible===opened)return;
    opened=visible;generation++;clearTimeout(activityTimer);
    if(!visible)return;
    renderEvents();
    const token=++generation;health.textContent='Checking…';
    if(agentStatus)agentStatus.textContent='Checking agent activity…';
    void refreshActivity(token);
    void Promise.resolve().then(()=>request('/api/v1/health',{signal:AbortSignal.timeout(5000)})).then(async response=>{
      const data=response.ok?await response.json():null;
      if(token===generation)health.textContent=data?.status==='ok'&&data?.service==='ned-api'?'Available':'Unavailable';
    }).catch(()=>{if(token===generation)health.textContent='Unavailable';});
  };
  const wipe=()=>{events=[];renderEvents();};
  clear.addEventListener('click',wipe);
  const observer=globalThis.MutationObserver?new MutationObserver(sync):null;
  for(const node of [pane,element('preview'),element('app-shell')])if(node)observer?.observe(node,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('ned-context-layout',sync);
  listeners.add(renderEvents);sync();renderEvents();
  return ()=>{generation++;clearTimeout(activityTimer);observer?.disconnect();listeners.delete(renderEvents);clear.removeEventListener('click',wipe);document.removeEventListener('ned-context-layout',sync);};
}
