import {executionPlan} from './work-plan.js';
import {dashboardModel} from './dashboard-model.js';
import {mountGoalTasks} from './goals-tasks.js';
const labels={planned:'Planned',ready:'Ready',working:'In progress',claimed:'Claimed',blocked:'Blocked',done:'Done'};
export function renderProjectWork(document,container,data,{showCompleted=false,onReference=()=>{},onFilter=()=>{},filterId='goals-show-completed',progressById,counts}={}){
  if(!Array.isArray(data.items)||data.items.length>50000)throw new Error('Invalid work');
  const plan=executionPlan(data.items,showCompleted);
  const children=new Map();const ids=new Set();
  for(const item of plan.items){
    if(typeof item.id!=='string'||ids.has(item.id)||typeof item.title!=='string'||!['goal','subgoal','task','issue'].includes(item.type)||!labels[item.status])throw new Error('Invalid work');
    ids.add(item.id);const key=item.parentId??null;const list=children.get(key)||[];list.push(item);children.set(key,list);
  }
  const root=document.createElement('ul');root.className='work-tree';
  const byId=new Map(plan.items.map(item=>[item.id,item]));
  function rowFor(item){
    const row=document.createElement('li'),title=document.createElement('button');title.type='button';title.textContent=item.title;title.className='work-title';title.dataset.status=item.status;title.dataset.kind=item.type;
    title.setAttribute('aria-label',`Reference ${item.type==='goal'||item.type==='subgoal'?'goal':'task'}: ${item.title}, ${labels[item.status]}`);title.addEventListener('click',()=>onReference({...item,projectId:item.projectId??data.projectId}));
    const meta=document.createElement('small');meta.textContent=item.projectName?`${item.projectName} · ${labels[item.status]}`:labels[item.status];if(progressById&&['goal','subgoal'].includes(item.type)){const count=progressById.get(item.id);meta.textContent+=` · ${count.completed} / ${count.total} tasks`;}row.append(title,meta);return row;
  }
  let path=[];let lists=[root];
  for(const item of plan.items){
    if(children.has(item.id))continue;
    const ancestors=[];let parent=item.parentId;
    while(parent){ancestors.unshift(byId.get(parent));parent=byId.get(parent).parentId;}
    let common=0;while(common<path.length&&common<ancestors.length&&path[common]===ancestors[common].id)common++;
    path=path.slice(0,common);lists=lists.slice(0,common+1);
    for(const ancestor of ancestors.slice(common)){
      const row=rowFor(ancestor),nested=document.createElement('ul');row.append(nested);lists.at(-1).append(row);path.push(ancestor.id);lists.push(nested);
    }
    lists.at(-1).append(rowFor(item));
  }
  const totals=counts||plan;
  const toolbar=document.createElement('div');toolbar.className='work-toolbar';
  const countLabel=document.createElement('span');countLabel.textContent=`${totals.active} in progress · ${totals.total-totals.completed} remaining`;
  const label=document.createElement('label');const filter=document.createElement('input');filter.id=filterId;filter.type='checkbox';filter.checked=showCompleted;filter.addEventListener('change',()=>onFilter(filter.checked));
  const caption=document.createElement('span');caption.textContent=`Show completed (${totals.completed})`;label.append(filter,caption);toolbar.append(countLabel,label);
  if(!plan.items.length){const empty=document.createElement('p');empty.className='work-empty';empty.textContent=plan.total?'All tasks completed.':'No goals or tasks yet.';container.replaceChildren(toolbar,empty);}else container.replaceChildren(toolbar,root);
}
export function mountProjectWork({document,fetch}){
  const delivery=mountGoalTasks({document,fetch});
  const project=document.getElementById('project');
  let snapshot;let pending=false;let refreshQueued=false;
  const draw=()=>{
    if(!snapshot)return;
    delivery.update(snapshot);
  };
  const message=(text,retry=false)=>{
    delivery.message(text,retry?()=>void load():null);

  };
  async function load(){
    if(pending){refreshQueued=true;return;}
    pending=true;
    const previous=snapshot;
    if(!previous){
      message('Loading progress…');
    }
    try{
      const response=await fetch('/api/v1/projects/work');const data=await response.json();
      if(!response.ok||!Array.isArray(data.projects))throw new Error();
      const items=data.projects.flatMap(owner=>{
        const key=id=>id===null?null:`${owner.id}:${id}`;
        return owner.items.map(item=>({...item,sourceId:item.id,id:key(item.id),parentId:key(item.parentId),
          dependsOn:item.dependsOn.map(key),projectId:owner.id,projectName:owner.name}));
      });
      dashboardModel(items);
      const next={projectId:'all-projects',items};
      if(previous&&JSON.stringify(previous)===JSON.stringify(next))return;
      snapshot=next;draw();
    }catch{
      snapshot=undefined;message('Progress could not be loaded.',true);
    }finally{
      pending=false;
      if(refreshQueued){refreshQueued=false;void load();}
    }
  }
  project.addEventListener('ned-work-refresh',load);
  document.addEventListener('ned-auth-restored',load);
  document.defaultView?.setInterval?.(()=>{
    const goals=document.getElementById('goals-panel');
    if(goals&&!goals.hidden&&!goals.closest('[hidden]')&&!document.hidden)void load();
  },5000);
  void load();
}
