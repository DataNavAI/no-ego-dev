export function mountMobileNavigation({document,viewport,onSelect}){
  const drawer=document.getElementById('navigation-drawer');
  const open=document.getElementById('navigation-open');
  const close=document.getElementById('navigation-close');
  const items=document.getElementById('navigation-items');
  const project=document.getElementById('project-control');
  const tabs=document.querySelector('.left-tabs');
  const preview=document.getElementById('preview-toggle');
  if(!drawer||!open||!items||!project||!tabs||!preview)return;
  const homes=[project,tabs,preview].map(node=>({node,parent:node.parentElement,next:node.nextSibling}));
  function dismiss(restore=true){
    if(!drawer.open)return;
    drawer.close();open.setAttribute('aria-expanded','false');
    if(restore)open.focus();
  }
  function sync(){
    dismiss(false);
    if(viewport.matches){
      items.append(project,tabs,preview);
      tabs.setAttribute('aria-orientation','vertical');
    }else{
      for(const home of homes)home.parent.insertBefore(home.node,home.next);
      tabs.removeAttribute('aria-orientation');
    }
  }
  open.addEventListener('click',()=>{drawer.showModal();open.setAttribute('aria-expanded','true');close.focus();});
  close.addEventListener('click',()=>dismiss());
  drawer.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  drawer.addEventListener('click',event=>{
    if(event.target===drawer){dismiss();return;}
    const button=event.target.closest?.('button');
    if(button&&(tabs.contains(button)||button===preview)){dismiss(false);onSelect();}
  });
  viewport.addEventListener('change',sync);sync();
  return {dismiss};
}
