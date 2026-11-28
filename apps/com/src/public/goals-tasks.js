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
  let projectId='',generation=0,snapshot=null,showInactive=false;const opened=new Set(),requests=new WeakMap();
  const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
  const button=(text,action)=>{const element=node('button',text);element.type='button';element.addEventListener('click',action);return element;};
  const base=item=>`/api/v1/projects/${encodeURIComponent(item.projectId??projectId)}/tasks/${encodeURIComponent(item.sourceId??item.id)}`;
  async function request(url,current,owner){const response=await fetch(url);const data=await response.json();if(current!==generation)return null;if(!response.ok||data.projectId!==owner)throw new Error();return data;}
  async function taskDetails(item,container,offset=0,requestedFocus=null){
    const token=(requests.get(container)||0)+1;requests.set(container,token);
    const expanded=new Set([...container.querySelectorAll('[data-attempt]')].filter(element=>element.open).map(element=>element.dataset.attempt));
    const sessionGroups=new Map([...container.querySelectorAll('.task-session-group')].map(element=>[element.dataset.sessionKey,element]));
    const focusKey=container.contains(document.activeElement)?document.activeElement.dataset.deliveryFocus:requestedFocus;
    const restoreFocus=()=>{if(focusKey)[...container.querySelectorAll('[data-delivery-focus]')].find(element=>element.dataset.deliveryFocus===focusKey)?.focus();};
    const current=generation,root=base(item),owner=item.projectId??projectId;container.replaceChildren(node('p','Loading details…','delivery-muted'));
    try{
      const data=await request(`${root}?offset=${offset}`,current,owner);if(!data||requests.get(container)!==token)return;
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
            const response=await request(`${root}/attempts/${encodeURIComponent(attempt.id)}`,current,owner);if(!response||requests.get(container)!==token)return;
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
                  const result=await request(`${root}/attempts/${encodeURIComponent(attempt.id)}/sessions/${encodeURIComponent(session.sessionId)}/messages?offset=${from}`,current,owner);if(!result)return;
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
  function sessionDetails(item,card){
    if(item.status!=='working')return;
    if(!item.sessions?.length){card.append(node('p','No agent session recorded.','delivery-muted'));return;}
    const list=node('ul',undefined,'delivery-sessions');
    for(const session of item.sessions){
      const row=node('li'),link=node('a',session.sessionId);
      link.href='#chat';
      link.dataset.deliveryFocus=`session-link:${item.id}:${session.sessionId}`;
      const resource=`${base(item)}/attempts/${encodeURIComponent(session.attemptId)}/sessions/${encodeURIComponent(session.sessionId)}/messages`;
      link.addEventListener('click',event=>{
        if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('ned-open-agent-session',{detail:{
          resource,projectId:item.projectId??projectId,sessionId:session.sessionId,agent:item.assignee||session.role,
        }}));
      });
      row.append(link);
      const started=Date.parse(session.startedAt);
      if(Number.isFinite(started)){
        const clock=node('time',new Date(started).toLocaleString());
        clock.dateTime=new Date(started).toISOString();
        const elapsed=node('span');elapsed.dataset.sessionStarted=String(started);
        row.append(node('span','Started '),clock,elapsed);
      }else row.append(node('span','Start time not recorded','delivery-muted'));
      list.append(row);
    }
    card.append(list);
  }
  function updateElapsed(){
    for(const element of panel.querySelectorAll('[data-session-started]')){
      element.textContent=` · ${duration(Math.max(0,(Date.now()-Number(element.dataset.sessionStarted))/1000))} elapsed`;
    }
  }
  document.defaultView?.setInterval(()=>{if(!panel.hidden)updateElapsed();},15000);

  function draw(){
    const active=document.activeElement,focusKey=active?.dataset?.deliveryFocus;
    const retained=new Map([...panel.querySelectorAll('.delivery-details')].map(element=>[element.dataset.taskId,element]));
    const heading=node('h2','Goals');heading.id='goals-pane-heading';heading.tabIndex=-1;
    panel.replaceChildren(heading);
    if(!snapshot?.items.length){panel.append(node('p','No goals or tasks yet.','delivery-muted'));return;}
    const filter=node('input');filter.type='checkbox';filter.checked=showInactive;filter.dataset.deliveryFocus='inactive-filter';
    const label=node('label',undefined,'delivery-filter');label.append(filter,node('span','Show inactive tasks'));
    filter.addEventListener('change',()=>{showInactive=filter.checked;draw();});
    panel.append(label);
    const visible=snapshot.items.filter(item=>!['task','issue'].includes(item.type)||showInactive||item.status==='working');
    const groups=goalGroups(visible).filter(group=>showInactive||group.tasks.length),activeGoals=groups.filter(group=>group.tasks.some(item=>item.status==='working'));
    if(activeGoals.length)panel.append(node('p',activeGoals.length===1?'Current work':`${activeGoals.length} active workstreams`,'delivery-muted'));
    if(!activeGoals.length)panel.append(node('p','No task working now.','delivery-muted'));
    const tasks=new Map(visible.filter(item=>['task','issue'].includes(item.type)).map(item=>[item.id,item]));
    const blockers=new Map();
    for(const item of tasks.values()){
      if(item.status!=='blocked')continue;
      const blocker=item.dependsOn?.map(id=>tasks.get(id)).find(parent=>parent&&parent.status!=='done'&&parent.id!==item.id&&parent.projectId===item.projectId);
      if(!blocker)continue;
      let cursor=blocker.id;
      while(cursor&&cursor!==item.id)cursor=blockers.get(cursor);
      if(!cursor)blockers.set(item.id,blocker.id);
    }
    const cards=new Map(),nested=new Map();
    function place(item,card,root){
      cards.set(item.id,card);
      if(!blockers.has(item.id)){root.append(card);return;}
      const parent=blockers.get(item.id);
      if(!nested.has(parent))nested.set(parent,node('div',undefined,'delivery-blocked'));
      nested.get(parent).append(card);
    }
    for(const group of groups){
      const section=node('section',undefined,'delivery-goal');
      section.append(node('h3',group.goal?.title||'Tasks without a goal'));
      if(group.goal?.projectName) section.append(node('p',group.goal.projectName,'delivery-muted'));
      const finish=group.goal?.delivery?.estimatedFinish;
      section.append(node('p',finish?`Est. finish ${new Date(finish).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}`:'Finish not estimated','delivery-muted'));
      const complete=group.tasks.filter(item=>item.status==='done'),remaining=group.tasks.filter(item=>item.status!=='done');
      const completed=node('details',undefined,'delivery-completed');completed.append(node('summary',`${complete.length} completed`));
      for(const item of [...remaining.filter(item=>item.status==='working'),...remaining.filter(item=>item.status!=='working'),...complete]){
        const card=node('article',undefined,'delivery-task');card.dataset.status=item.status;
        const title=node('h4'),reference=button(item.title,()=>document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:item.projectId??projectId,itemId:item.sourceId??item.id,title:item.title,projectName:item.projectName}})));reference.className='delivery-task-title';reference.setAttribute('aria-label',`Reference task: ${item.title}`);title.setAttribute('aria-label',item.title);title.append(reference);const status=node('span',states[item.status]||item.status,'delivery-status');
        card.append(title,status);
        if(!group.goal&&item.projectName) card.append(node('p',item.projectName,'delivery-muted'));
        const delivery=item.delivery||{};
        card.append(node('p',`${delivery.trackedSeconds==null?'Time not recorded':`${duration(delivery.trackedSeconds)} tracked`} · ${delivery.remainingSeconds==null?'Not estimated':`~${duration(delivery.remainingSeconds)} left`}`,'delivery-muted'));
        for(const output of delivery.outputs||[]){
          const preview=node('a',output.title,'delivery-output');preview.href=`${base(item)}/outputs/${encodeURIComponent(output.id)}`;preview.target='_blank';preview.rel='noopener noreferrer';
          preview.setAttribute('aria-label',`${output.title} (opens in a new tab)`);
          const resource=`${base(item)}/outputs/${encodeURIComponent(output.id)}`;preview.addEventListener('click',event=>void openOutput(event,resource));
          if(output.kind==='image'){const image=node('img');image.alt='';image.loading='lazy';preview.prepend(image);hydrateOutput(image,resource);}card.append(preview);
        }
        sessionDetails(item,card);
        const previous=retained.get(item.id),signature=JSON.stringify([delivery.revision,delivery.updatedAt,delivery.executionRevision]);
        if(previous){if(previous.dataset.signature!==signature){previous.dataset.signature=signature;if(previous.open)void taskDetails(item,previous.lastElementChild,0,focusKey);else previous.lastElementChild.replaceChildren();}card.append(previous);place(item,card,item.status==='done'?completed:section);continue;}
        const detail=node('details',undefined,'delivery-details');detail.dataset.taskId=item.id;detail.dataset.signature=signature;const summary=node('summary','Details');summary.dataset.deliveryFocus=item.id;detail.append(summary);const body=node('div');detail.append(body);
        detail.addEventListener('toggle',()=>{if(detail.open){opened.add(item.id);if(!body.childElementCount)void taskDetails(item,body);}else opened.delete(item.id);});
        if(opened.has(item.id))detail.open=true;
        card.append(detail);place(item,card,item.status==='done'?completed:section);
      }
      if(complete.length)section.append(completed);
      if(!group.tasks.length)section.append(node('p','No tasks yet.','delivery-muted'));
      if(!group.tasks.length||group.tasks.some(item=>!blockers.has(item.id)))panel.append(section);
    }
    for(const [id,children] of nested)cards.get(id)?.append(children);
    updateElapsed();
    if(focusKey)[...panel.querySelectorAll('[data-delivery-focus]')].find(element=>element.dataset.deliveryFocus===focusKey)?.focus();
  }
  return {
    update(data){const changed=projectId!==data.projectId;projectId=data.projectId;snapshot=data;if(changed){generation++;opened.clear();panel.replaceChildren();}draw();},
    message(text,retry){generation++;snapshot=null;opened.clear();panel.replaceChildren(node('p',text,'delivery-muted'));if(retry)panel.append(button('Retry',retry));},
  };
}
