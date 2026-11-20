export function mountTaskReferences({document,draft,changed}){
  const container=document.getElementById('chat-task-references');
  if(!container)return {ready:()=>false,values:()=>[],render(){},clear(){}};
  const status=document.getElementById('chat-reference-status');
  let references=[],locked=true;
  function render(disabled=locked){
    locked=disabled;
    container.replaceChildren(...references.map(ref=>{
      const pill=document.createElement('li');pill.className='task-reference';
      const label=document.createElement('span');label.textContent=ref.title;label.title=ref.projectName;
      const project=document.createElement('small');project.textContent=ref.projectName;
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.disabled=locked;remove.setAttribute('aria-label',`Remove reference: ${ref.title}`);
      remove.addEventListener('click',()=>{if(locked)return;references=references.filter(item=>item!==ref);render();changed();draft.focus({preventScroll:true});});
      pill.append(label,project,remove);return pill;
    }));
  }
  document.addEventListener('ned-reference-work',event=>{
    if(locked)return;
    const ref=event.detail;
    if(!ref||!['projectId','itemId','title','projectName'].every(key=>typeof ref[key]==='string'&&ref[key].length>0&&ref[key].length<=1000))return;
    if(!references.some(item=>item.projectId===ref.projectId&&item.itemId===ref.itemId)){
      if(references.length===8){status.textContent='Use up to 8 task references.';return;}
      references.push({...ref});
    }
    status.textContent='';render();changed();document.getElementById('mobile-sidebar-toggle').click();draft.focus({preventScroll:true});
  });
  return {ready:()=>references.length>0,values:()=>references.map(({projectId,itemId})=>({projectId,itemId})),render,clear(){references=[];status.textContent='';render();}};
}
