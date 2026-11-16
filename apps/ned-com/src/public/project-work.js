import {executionPlan} from './work-plan.js';
import {dashboardModel} from './dashboard-model.js';
const labels={planned:'Planned',ready:'Ready',working:'In progress',blocked:'Blocked',done:'Done'};
export function renderProjectWork(document,container,data,{showCompleted=false,onReference=()=>{},onFilter=()=>{},filterId='goals-show-completed',progressById,counts}={}){
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
    const meta=document.createElement('small');meta.textContent=labels[item.status];if(progressById&&['goal','subgoal'].includes(item.type)){const count=progressById.get(item.id);meta.textContent+=` · ${count.completed} / ${count.total} tasks`;}row.append(title,meta);return row;
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
export function renderDashboard(document,container,data,options={}){
  const model=dashboardModel(data.items);
  const summary=document.createElement('header');summary.className='dashboard-summary';
  const identity=document.createElement('p');identity.className='eyebrow';identity.textContent=options.projectName||'';
  const heading=document.createElement('h2');heading.id='dashboard-heading';heading.tabIndex=-1;heading.textContent='Project progress';
  summary.append(identity,heading);
  if(model.total){
    const count=document.createElement('p');count.className='dashboard-count';count.textContent=`${model.completed} / ${model.total} tasks completed`;
    const meter=document.createElement('progress');meter.max=model.total;meter.value=model.completed;meter.setAttribute('aria-label',`${count.textContent}; progress by completed task count`);summary.append(count,meter);
  }
  const metrics=document.createElement('dl');metrics.className='dashboard-metrics';
  for(const [label,value] of [['In progress',model.active],['Remaining',model.total-model.completed],['Blocked',model.blocked],['Open goals',model.openGoals]]){
    const group=document.createElement('div'),term=document.createElement('dt'),number=document.createElement('dd');term.textContent=label;number.textContent=String(value);group.append(term,number);metrics.append(group);
  }
  summary.append(metrics);
  const work=document.createElement('div');work.className='dashboard-work';
  const items=model.items;
  renderProjectWork(document,work,{...data,items},{...options,filterId:'dashboard-show-completed',progressById:model.progressById,counts:model});
  container.replaceChildren(summary,work);
}
export function mountProjectWork({document,fetch}){
  const project=document.getElementById('project'),container=document.getElementById('project-work'),dashboard=document.getElementById('dashboard');
  let generation=0;let showCompleted=false;let dashboardCompleted=false;let snapshot;let selectedId;let pending;
  const onReference=item=>document.dispatchEvent(new CustomEvent('ned-reference-work',{detail:{projectId:item.projectId,itemId:item.id,title:item.title,projectName:project.selectedOptions?.[0]?.textContent||'Project'}}));
  const draw=()=>{
    if(!snapshot)return;
    renderProjectWork(document,container,snapshot,{showCompleted,onFilter:value=>{showCompleted=value;draw();document.getElementById('goals-show-completed')?.focus();},onReference});
    if(dashboard)renderDashboard(document,dashboard,snapshot,{projectName:project.selectedOptions?.[0]?.textContent,showCompleted:dashboardCompleted,onFilter:value=>{dashboardCompleted=value;draw();document.getElementById('dashboard-show-completed')?.focus();},onReference});
  };
  const message=(text,retry=false)=>{
    if(!dashboard)return;
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent=text;dashboard.replaceChildren(status);
    if(retry){const button=document.createElement('button');button.id='dashboard-retry';button.type='button';button.textContent='Retry';button.addEventListener('click',()=>void load());dashboard.append(button);}
  };
  async function load(){
    const id=project.value;
    if(pending?.id===id)return;
    const current=++generation;pending={id,generation:current};
    const active=document.activeElement;const ownedFocus=Boolean(dashboard?.contains(active));
    const goalsFocus=container.contains(active);
    const changed=id!==selectedId;
    if(changed){snapshot=undefined;showCompleted=false;dashboardCompleted=false;selectedId=id;}
    const scroll=dashboard?.scrollTop||0;
    const previous=snapshot;
    if(!previous)container.replaceChildren();
    if(!id){pending=undefined;message('Choose a project to view progress.');return;}
    if(!previous){
      container.textContent='Loading goals…';message('Loading progress…');
      if(ownedFocus)dashboard?.focus();
      if(goalsFocus)document.getElementById('heading')?.focus();
    }
    try{
      const response=await fetch('/api/projects/'+encodeURIComponent(id)+'/work');const data=await response.json();
      if(current!==generation)return;
      if(!response.ok||data.projectId!==id)throw new Error();
      dashboardModel(data.items);
      if(previous&&JSON.stringify(previous)===JSON.stringify(data))return;
      snapshot=data;draw();if(dashboard)dashboard.scrollTop=scroll;
      if(goalsFocus&&document.activeElement===document.body)document.getElementById('heading')?.focus();
      if(ownedFocus&&(document.activeElement===dashboard||document.activeElement===document.body))document.getElementById('dashboard-heading')?.focus();
    }catch{
      if(current===generation){snapshot=undefined;container.textContent='Goals could not be loaded.';message('Progress could not be loaded.',true);if(ownedFocus&&(document.activeElement===dashboard||document.activeElement===document.body))document.getElementById('dashboard-retry')?.focus();}
    }finally{if(pending?.generation===current)pending=undefined;}
  }
  project.addEventListener('change',load);project.addEventListener('ned-work-refresh',load);void load();
}
