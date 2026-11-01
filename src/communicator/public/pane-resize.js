const preferenceKey='ned.com.leftPaneWidth';

export function paneBounds(viewport){
  return {min:320,max:Math.max(320,Math.floor(viewport)-328)};
}

export function paneWidth(preference,viewport){
  const {min,max}=paneBounds(viewport);
  const fallback=viewport>1100?360:320;
  return Math.min(max,Math.max(min,Number.isFinite(preference)?preference:fallback));
}

export function mountPaneResize({shell,divider,view=window,storage=()=>view.localStorage}){
  let preferred;
  let current;
  let drag=null;
  try{
    const saved=storage().getItem(preferenceKey);
    if(saved!==null&&/^\d+(\.\d+)?$/.test(saved))preferred=Number(saved);
  }catch{preferred=undefined;}
  const viewport=()=>shell.clientWidth-(shell.dataset?.debugOpen==='true'?300:0);
  const persist=()=>{try{storage().setItem(preferenceKey,String(preferred));}catch{void 0;}};
  const end=event=>{
    if(!drag||(event?.pointerId!==undefined&&event.pointerId!==drag.id))return;
    const id=drag.id;drag=null;shell.classList.remove('pane-resizing');
    if(divider.hasPointerCapture(id))divider.releasePointerCapture(id);
    if(preferred!==undefined)persist();
  };
  const render=()=>{
    const mobile=viewport()<768;
    divider.hidden=mobile;divider.tabIndex=mobile?-1:0;
    if(mobile){end();if(view.document?.activeElement===divider)view.document.getElementById('left-toggle')?.focus();return;}
    current=paneWidth(preferred,viewport());
    shell.style.setProperty('--left-pane-width',`${current}px`);
    const bounds=paneBounds(viewport());
    divider.setAttribute('aria-valuemin',String(bounds.min));
    divider.setAttribute('aria-valuemax',String(bounds.max));
    divider.setAttribute('aria-valuenow',String(current));
  };
  const resize=width=>{preferred=paneWidth(width,viewport());render();};
  const down=event=>{
    if(event.button!==0||event.isPrimary===false||viewport()<768||drag)return;
    event.preventDefault();divider.focus();
    drag={id:event.pointerId,x:event.clientX,width:current};
    divider.setPointerCapture(event.pointerId);shell.classList.add('pane-resizing');
  };
  const move=event=>{
    if(drag&&event.pointerId===drag.id)resize(drag.width+event.clientX-drag.x);
  };
  const key=event=>{
    if(viewport()<768||event.altKey||event.ctrlKey||event.metaKey)return;
    const step=event.shiftKey?64:16;
    const {min,max}=paneBounds(viewport());
    const values={ArrowLeft:current-step,ArrowRight:current+step,Home:min,End:max};
    if(!Object.hasOwn(values,event.key))return;
    event.preventDefault();resize(values[event.key]);persist();
  };
  divider.addEventListener('pointerdown',down);
  divider.addEventListener('pointermove',move);
  divider.addEventListener('pointerup',end);
  divider.addEventListener('pointercancel',end);
  divider.addEventListener('lostpointercapture',end);
  divider.addEventListener('keydown',key);
  view.addEventListener('resize',render);
  render();
  return ()=>{
    end();
    for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',end],['pointercancel',end],['lostpointercapture',end],['keydown',key]])divider.removeEventListener(name,handler);
    view.removeEventListener('resize',render);
  };
}
