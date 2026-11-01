export function mountActivity({document,EventSource}){
  const panel=document.getElementById('chat-activity');
  const content=document.getElementById('chat-activity-content');
  const project=document.getElementById('project');
  const dismiss=document.getElementById('chat-activity-dismiss');
  if(!panel||!content||!project||!EventSource)return;
  let stream;let generation=0;let signature='';
  const labels={planned:'Planned',ready:'Ready',working:'In progress',blocked:'Blocked',done:'Done'};
  function select(){
    const current=++generation;stream?.close();stream=undefined;
    const id=project.value;signature='';content.replaceChildren();panel.hidden=true;
    if(!id)return;
    stream=new EventSource('/api/activity/events?project='+encodeURIComponent(id));
    stream.onmessage=event=>{
      if(current!==generation)return;
      try{
        const data=JSON.parse(event.data);
        if(data.projectId!==id||data.error||!Array.isArray(data.updates)||data.updates.length>2)throw new Error();
        const updates=data.updates.map(update=>{
          if(!['goal','task'].includes(update.kind)||typeof update.title!=='string'||update.title.length>1000||!labels[update.status]||!Number.isFinite(Date.parse(update.time)))throw new Error();
          return {kind:update.kind,title:update.title,status:update.status,time:update.time};
        });
        const next=JSON.stringify(updates);if(next===signature)return;
        signature=next;
        const rows=updates.map(update=>{
          const row=document.createElement('p');row.className='activity-row';row.dataset.status=update.status;
          const status=document.createElement('span');status.className='activity-status';status.textContent=`${update.kind==='goal'?'Goal':'Task'} · ${labels[update.status]}`;
          const title=document.createElement('span');title.className='activity-title';title.textContent=update.title;
          const time=document.createElement('time');time.className='sr-only';time.dateTime=update.time;time.textContent=new Date(update.time).toLocaleString();
          row.append(status,title,time);
          return row;
        });
        content.replaceChildren(...rows);panel.hidden=!rows.length;
      }catch{unavailable();}
    };
    stream.onerror=()=>{if(current===generation)unavailable();};
  }
  function unavailable(){if(signature==='unavailable')return;signature='unavailable';content.textContent='Updates unavailable.';panel.hidden=false;}
  const hide=()=>{panel.hidden=true;};
  dismiss?.addEventListener('click',hide);
  project.addEventListener('change',select);
  select();
  return ()=>{generation++;stream?.close();project.removeEventListener('change',select);dismiss?.removeEventListener('click',hide);};
}
