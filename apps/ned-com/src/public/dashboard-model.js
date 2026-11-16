import {executionPlan} from './work-plan.js';
const statuses=new Set(['planned','ready','working','blocked','done']);
export function dashboardModel(items){
  if(!Array.isArray(items)||items.length>5000)throw new Error('Invalid work');
  for(const item of items)if(typeof item.id!=='string'||!item.id||typeof item.title!=='string'||!['goal','subgoal','task','issue'].includes(item.type)||!statuses.has(item.status))throw new Error('Invalid work');
  const plan=executionPlan(items,true),children=new Map(),progressById=new Map();
  for(const item of items){const list=children.get(item.parentId)||[];list.push(item);children.set(item.parentId,list);}
  // Reverse topological order: child totals are available before their parent.
  for(const item of [...plan.items].reverse()){
    const descendants=children.get(item.id)||[];
    const executable=!descendants.length&&['task','issue'].includes(item.type);
    const progress={total:executable?1:0,completed:executable&&item.status==='done'?1:0,active:executable&&item.status==='working'?1:0,blocked:executable&&item.status==='blocked'?1:0};
    for(const child of descendants){const count=progressById.get(child.id);for(const key of Object.keys(progress))progress[key]+=count[key];}
    progressById.set(item.id,progress);
  }
  const summary={total:0,completed:0,active:0,blocked:0,openGoals:0};
  for(const item of items){
    const count=progressById.get(item.id);
    if(!item.parentId)for(const key of ['total','completed','active','blocked'])summary[key]+=count[key];
    if(item.type==='goal'&&(item.status==='blocked'||(count.total?count.completed<count.total:item.status!=='done')))summary.openGoals++;
  }
  const normalized=items.map(item=>{
    const count=progressById.get(item.id);
    if(!['goal','subgoal'].includes(item.type)||!count.total||item.status==='blocked')return item;
    return {...item,status:count.completed===count.total?'done':count.active?'working':count.blocked?'blocked':'planned'};
  });
  return {...summary,progressById,items:normalized};
}
