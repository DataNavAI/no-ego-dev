import {executionPlan} from './work-plan.js';
const labels={planned:'Planned',ready:'Ready',working:'In progress',blocked:'Blocked',done:'Done'};
export function renderProjectWork(document,container,data,{showCompleted=false,onReference=()=>{},onFilter=()=>{}}={}){
  if(!Array.isArray(data.items)||data.items.length>5000)throw new Error('Invalid work');
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
    title.setAttribute('aria-label',`Reference ${item.type==='goal'||item.type==='subgoal'?'goal':'task'}: ${item.title}, ${labels[item.status]}`);title.addEventListener('click',()=>onReference({...item,projectId:data.projectId}));
    const meta=document.createElement('small');meta.textContent=labels[item.status];row.append(title,meta);return row;
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
  const toolbar=document.createElement('div');toolbar.className='work-toolbar';
  const counts=document.createElement('span');counts.textContent=`${plan.active} in progress · ${plan.total-plan.completed} remaining`;
  const label=document.createElement('label');const filter=document.createElement('input');filter.id='goals-show-completed';filter.type='checkbox';filter.checked=showCompleted;filter.addEventListener('change',()=>onFilter(filter.checked));
  const caption=document.createElement('span');caption.textContent=`Show completed (${plan.completed})`;label.append(filter,caption);toolbar.append(counts,label);
  if(!plan.items.length){const empty=document.createElement('p');empty.className='work-empty';empty.textContent=plan.total?'All tasks completed.':'No goals or tasks yet.';container.replaceChildren(toolbar,empty);}else container.replaceChildren(toolbar,root);
}
export function mountProjectWork({document,fetch}){
  const project=document.getElementById('project'),container=document.getElementById('project-work');
  let generation=0;let showCompleted=false;let snapshot;
  const draw=()=>{if(snapshot)renderProjectWork(document,container,snapshot,{showCompleted,onFilter:value=>{showCompleted=value;draw();document.getElementById('goals-show-completed')?.focus();},onReference:item=>{document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:item.projectId,itemId:item.id,title:item.title,projectName:project.selectedOptions?.[0]?.textContent||'Project'}}));}});};
  async function load(){
    const current=++generation,id=project.value;container.replaceChildren();
    if(!id)return;container.textContent='Loading goals…';
    try{
      const response=await fetch('/api/projects/'+encodeURIComponent(id)+'/work');const data=await response.json();
      if(current!==generation)return;
      if(!response.ok||data.projectId!==id)throw new Error();
      snapshot=data;draw();
    }catch{if(current===generation)container.textContent='Goals could not be loaded.';}
  }
  project.addEventListener('change',load);project.addEventListener('ned-work-refresh',load);void load();
}
