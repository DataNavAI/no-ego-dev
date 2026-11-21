import {hydrateOutput,openOutput} from './api-client.js';
const states={working:'Working',ready:'Ready',blocked:'Blocked',done:'Done',planned:'Planned'};
export const duration=seconds=>seconds===null||seconds===undefined?'Not recorded':seconds<60?'<1m':seconds<3600?`${Math.floor(seconds/60)}m`:`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`;
export function goalGroups(items){
  const byId=new Map(items.map(item=>[item.id,item]));const groups=new Map();
  for(const item of items){
    if(!['task','issue'].includes(item.type))continue;
    let parent=byId.get(item.parentId),goal=null;const seen=new Set([item.id]);
    while(parent){if(seen.has(parent.id))throw new Error('Invalid hierarchy');seen.add(parent.id);if(parent.type==='goal')goal=parent;parent=byId.get(parent.parentId);}
    const key=goal?.id||'';if(!groups.has(key))groups.set(key,{goal,tasks:[]});groups.get(key).tasks.push(item);
  }
  for(const item of items)if(item.type==='goal'&&!groups.has(item.id)&&item.status!=='done')groups.set(item.id,{goal:item,tasks:[]});
  const rank=group=>group.tasks.some(item=>item.status==='working')?0:group.tasks.some(item=>item.status!=='done')?1:2;
  return [...groups.values()].sort((a,b)=>rank(a)-rank(b));
}

export function mountGoalTasks({document,fetch}){
  const panel=document.getElementById('goals-panel');if(!panel)return {update(){},message(){}};
  let projectId='',generation=0,snapshot=null;const opened=new Set(),requests=new WeakMap();
  const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
  const button=(text,action)=>{const element=node('button',text);element.type='button';element.addEventListener('click',action);return element;};
  const base=taskId=>`/api/v1/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`;
  async function request(url,current){const response=await fetch(url);const data=await response.json();if(current!==generation)return null;if(!response.ok||data.projectId!==projectId)throw new Error();return data;}
  async function taskDetails(item,container,offset=0,requestedFocus=null){
    const token=(requests.get(container)||0)+1;requests.set(container,token);
    const expanded=new Set([...container.querySelectorAll('[data-attempt]')].filter(element=>element.open).map(element=>element.dataset.attempt));
    const sessionGroups=new Map([...container.querySelectorAll('.task-session-group')].map(element=>[element.dataset.sessionKey,element]));
    const focusKey=container.contains(document.activeElement)?document.activeElement.dataset.deliveryFocus:requestedFocus;
    const restoreFocus=()=>{if(focusKey)[...container.querySelectorAll('[data-delivery-focus]')].find(element=>element.dataset.deliveryFocus===focusKey)?.focus();};
    const current=generation,root=base(item.id);container.replaceChildren(node('p','Loading details…','delivery-muted'));
    try{
      const data=await request(`${root}?offset=${offset}`,current);if(!data||requests.get(container)!==token)return;
      const impact=node('p',data.impact||data.description||'Impact not recorded.','task-impact');
      container.replaceChildren(impact);
      const outputs=node('div',undefined,'task-outputs');
      for(const output of data.outputs||[]){
        const preview=node('details');preview.append(node('summary',output.title));
        if(output.kind==='image'){const image=node('img');image.alt=output.title;image.loading='lazy';preview.append(image);hydrateOutput(image,`${root}/outputs/${encodeURIComponent(output.id)}`);}
        else if(output.kind==='document')preview.append(node('pre',output.text||''));
        outputs.append(preview);
      }
      if(!outputs.childElementCount)outputs.append(node('p','No output yet.','delivery-muted'));
      container.append(outputs,node('h4','Execution'));
      for(const attempt of data.attempts||[]){
        const detail=node('details');detail.dataset.attempt=attempt.id;const summary=node('summary',`Attempt ${attempt.number} · ${attempt.state.replaceAll('_',' ')}`);summary.dataset.deliveryFocus=`attempt:${attempt.id}`;detail.append(summary);
        const body=node('div');detail.append(body);let loaded=false;
        detail.addEventListener('toggle',async()=>{
          if(!detail.open||loaded)return;loaded=true;body.textContent='Loading attempt…';
          try{
            const response=await request(`${root}/attempts/${encodeURIComponent(attempt.id)}`,current);if(!response||requests.get(container)!==token)return;
            body.replaceChildren(node('pre',response.attempt.resultText||'No response recorded.'));
            if(response.attempt.resultTruncated)body.append(node('p','Response truncated.','delivery-muted'));
            if(!response.attempt.sessions.length)body.append(node('p','No session bound.','delivery-muted'));
            for(const session of response.attempt.sessions){
              const sessionKey=`${attempt.id}:${session.sessionId}`,retained=sessionGroups.get(sessionKey);
              if(retained){body.append(retained);continue;}
              const group=node('div',undefined,'task-session-group');group.dataset.sessionKey=sessionKey;
              const sessionView=node('div',undefined,'task-session');let logOffset=0;
              const read=async()=>{
                const from=logOffset;log.disabled=true;
                try{
                  const result=await request(`${root}/attempts/${encodeURIComponent(attempt.id)}/sessions/${encodeURIComponent(session.sessionId)}/messages?offset=${from}`,current);if(!result)return;
                  if(from===0)sessionView.replaceChildren();
                  const entries=result.data.map(row=>{const entry=node('details');entry.append(node('summary',`${row.role} · ${row.id}`),node('pre',typeof row.content==='string'?row.content:JSON.stringify(row.content,null,2)));return entry;});
                  sessionView.prepend(...entries);
                  if(!result.data.length&&from===0)sessionView.append(node('p','No session messages.','delivery-muted'));
                  logOffset+=result.data.length;log.textContent=result.data.length===50?'Older session messages':'Session log loaded';log.disabled=result.data.length<50;
                }catch{log.textContent='Retry session log';log.disabled=false;}
              };
              const log=button(`Session log · ${session.role} ${session.workerIndex}`,read);log.dataset.deliveryFocus=`session:${sessionKey}`;group.append(log,sessionView);body.append(group);
            }
            restoreFocus();
          }catch{loaded=false;body.replaceChildren(node('p','Attempt unavailable. Close and reopen to retry.','delivery-muted'));}
        });
        container.append(detail);
        if(expanded.has(attempt.id))detail.open=true;
      }
      if(!data.attempts?.length)container.append(node('p','No execution attempts recorded.','delivery-muted'));
      if(offset>0)container.append(button('Newer attempts',()=>void taskDetails(item,container,Math.max(0,offset-20))));
      if(data.nextOffset!==null)container.append(button('Older attempts',()=>void taskDetails(item,container,data.nextOffset)));
      restoreFocus();
    }catch{if(current===generation&&requests.get(container)===token)container.replaceChildren(node('p','Details could not be loaded.'),button('Retry',()=>void taskDetails(item,container,offset)));}
  }
  function draw(){
    const active=document.activeElement,focusKey=active?.dataset?.deliveryFocus;
    const retained=new Map([...panel.querySelectorAll('.delivery-details')].map(element=>[element.dataset.taskId,element]));
    const heading=node('h2','Goals & Tasks');heading.id='goals-pane-heading';heading.tabIndex=-1;
    panel.replaceChildren(heading);
    if(!snapshot?.items.length){panel.append(node('p','No goals or tasks yet.','delivery-muted'));return;}
    const groups=goalGroups(snapshot.items),activeGoals=groups.filter(group=>group.tasks.some(item=>item.status==='working'));
    if(activeGoals.length)panel.append(node('p',activeGoals.length===1?'Current work':`${activeGoals.length} active workstreams`,'delivery-muted'));
    if(!activeGoals.length)panel.append(node('p','No task working now.','delivery-muted'));
    for(const group of groups){
      const section=node('section',undefined,'delivery-goal');
      section.append(node('h3',group.goal?.title||'Tasks without a goal'));
      const finish=group.goal?.delivery?.estimatedFinish;
      section.append(node('p',finish?`Est. finish ${new Date(finish).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}`:'Finish not estimated','delivery-muted'));
      const complete=group.tasks.filter(item=>item.status==='done'),remaining=group.tasks.filter(item=>item.status!=='done');
      const completed=node('details',undefined,'delivery-completed');completed.append(node('summary',`${complete.length} completed`));
      for(const item of [...remaining.filter(item=>item.status==='working'),...remaining.filter(item=>item.status!=='working'),...complete]){
        const card=node('article',undefined,'delivery-task');card.dataset.status=item.status;
        const title=node('h4',item.title),status=node('span',states[item.status]||item.status,'delivery-status');
        card.append(title,status);
        const delivery=item.delivery||{};
        card.append(node('p',`${delivery.trackedSeconds==null?'Time not recorded':`${duration(delivery.trackedSeconds)} tracked`} · ${delivery.remainingSeconds==null?'Not estimated':`~${duration(delivery.remainingSeconds)} left`}`,'delivery-muted'));
        for(const output of delivery.outputs||[]){
          const preview=node('a',output.title,'delivery-output');preview.href=`${base(item.id)}/outputs/${encodeURIComponent(output.id)}`;preview.target='_blank';preview.rel='noopener noreferrer';
          preview.setAttribute('aria-label',`${output.title} (opens in a new tab)`);
          const resource=`${base(item.id)}/outputs/${encodeURIComponent(output.id)}`;preview.addEventListener('click',event=>void openOutput(event,resource));
          if(output.kind==='image'){const image=node('img');image.alt='';image.loading='lazy';preview.prepend(image);hydrateOutput(image,resource);}card.append(preview);
        }
        const previous=retained.get(item.id),signature=JSON.stringify([delivery.revision,delivery.updatedAt,delivery.executionRevision]);
        if(previous){if(previous.dataset.signature!==signature){previous.dataset.signature=signature;if(previous.open)void taskDetails(item,previous.lastElementChild,0,focusKey);else previous.lastElementChild.replaceChildren();}card.append(previous);(item.status==='done'?completed:section).append(card);continue;}
        const detail=node('details',undefined,'delivery-details');detail.dataset.taskId=item.id;detail.dataset.signature=signature;const summary=node('summary','Details');summary.dataset.deliveryFocus=item.id;detail.append(summary);const body=node('div');detail.append(body);
        detail.addEventListener('toggle',()=>{if(detail.open){opened.add(item.id);if(!body.childElementCount)void taskDetails(item,body);}else opened.delete(item.id);});
        if(opened.has(item.id))detail.open=true;
        card.append(detail);(item.status==='done'?completed:section).append(card);
      }
      if(complete.length)section.append(completed);
      if(!group.tasks.length)section.append(node('p','No tasks yet.','delivery-muted'));
      panel.append(section);
    }
    if(focusKey)[...panel.querySelectorAll('[data-delivery-focus]')].find(element=>element.dataset.deliveryFocus===focusKey)?.focus();
  }
  return {
    update(data){const changed=projectId!==data.projectId;projectId=data.projectId;snapshot=data;if(changed){generation++;opened.clear();panel.replaceChildren();}draw();},
    message(text,retry){generation++;snapshot=null;opened.clear();panel.replaceChildren(node('p',text,'delivery-muted'));if(retry)panel.append(button('Retry',retry));},
  };
}
