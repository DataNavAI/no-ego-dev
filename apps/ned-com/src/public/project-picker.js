// The native select remains the source of truth for the existing controller.
// This adapter only enhances its presentation after the local kit is ready.
export function connectProjectPicker(native, picker, {document:doc, MutationObserver:Observer}) {
  let signature='';
  let disposed=false;
  const sync=()=>{
    if(disposed)return;
    const options=Array.from(native.options,option=>({value:option.value,label:option.textContent,disabled:option.disabled}));
    const next=JSON.stringify(options);
    if(next!==signature){
      signature=next;
      const nodes=options.map(row=>{
        const option=doc.createElement('wa-option');
        option.value=row.value;option.textContent=row.label;option.disabled=row.disabled;
        return option;
      });
      picker.replaceChildren(...nodes);
    }
    picker.disabled=native.disabled;
    if(picker.value!==native.value)picker.value=native.value;
  };
  const change=()=>{
    // Reject stale or fabricated choices before they reach project navigation.
    const selected=Array.from(native.options).find(option=>option.value===picker.value&&!option.disabled);
    if(native.disabled||!selected){sync();return;}
    if(native.value!==picker.value){
      native.value=picker.value;
      native.dispatchEvent(new Event('change',{bubbles:true}));
    }
    sync();
  };
  const observer=new Observer(sync);
  observer.observe(native,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','label','value','selected']});
  native.addEventListener('change',sync);
  picker.addEventListener('change',change);
  sync();
  return ()=>{disposed=true;observer.disconnect();native.removeEventListener('change',sync);picker.removeEventListener('change',change);};
}

export async function enhanceProjectPicker(native,{document:doc,MutationObserver:Observer,customElements:registry}) {
  if(!native)return null;
  let picker,disconnect;
  try{
    await Promise.all(['wa-select','wa-option'].map(name=>registry.whenDefined(name)));
    picker=doc.createElement('wa-select');
    picker.id='project-picker';picker.label='Project';picker.size='s';picker.hidden=true;
    native.after(picker);
    disconnect=connectProjectPicker(native,picker,{document:doc,MutationObserver:Observer});
    await picker.updateComplete;
    // Preserve focus if someone reached the native fallback while loading.
    const focused=doc.activeElement===native;
    picker.hidden=false;native.hidden=true;
    if(focused)picker.focus();
    return picker;
  }catch{
    disconnect?.();picker?.remove();native.hidden=false;
    return null;
  }
}
