export function executionPlan(items,showCompleted=false){
  const byId=new Map(items.map(item=>[item.id,item]));
  if(byId.size!==items.length)throw new Error('Invalid work');
  const edges=new Map(),degree=new Map(items.map(item=>[item.id,0]));
  for(const item of items){
    for(const id of new Set([item.parentId,...(item.dependsOn||[])].filter(Boolean))){
      if(!byId.has(id))throw new Error('Invalid work');
      const list=edges.get(id)||[];list.push(item.id);edges.set(id,list);degree.set(item.id,degree.get(item.id)+1);
    }
  }
  const compare=(a,b)=>(a.status==='working'?0:1)-(b.status==='working'?0:1)||(a.priority??2)-(b.priority??2)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||a.id.localeCompare(b.id);
  const ready=items.filter(item=>degree.get(item.id)===0).sort(compare);const ordered=[];
  while(ready.length){const item=ready.shift();ordered.push(item);for(const id of edges.get(item.id)||[]){degree.set(id,degree.get(id)-1);if(!degree.get(id)){ready.push(byId.get(id));ready.sort(compare);}}}
  if(ordered.length!==items.length)throw new Error('Invalid work');
  const visible=new Set();
  for(const item of items)if(showCompleted||item.status!=='done'){let current=item;while(current&&!visible.has(current.id)){visible.add(current.id);current=byId.get(current.parentId);}}
  return {items:ordered.filter(item=>visible.has(item.id)),
    total:items.filter(item=>['task','issue'].includes(item.type)).length,
    completed:items.filter(item=>['task','issue'].includes(item.type)&&item.status==='done').length,
    active:items.filter(item=>['task','issue'].includes(item.type)&&item.status==='working').length};
}
