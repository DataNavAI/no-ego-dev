export function secretRequestRow(row){
  if(row?.role!=='tool'||(row.tool_name??row.name)!=='ned')return null;
  try{
    let value=row.content;if(typeof value==='string'){if(value.length>2048)return null;value=JSON.parse(value);}
    const keys=['success','action','request_id','key','expires_at'];
    if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key))||value.success!==true||value.action!=='request_secret'||typeof value.request_id!=='string'||!/^[a-f0-9]{64}$/.test(value.request_id)||typeof value.key!=='string'||!/^[A-Z][A-Z0-9_]{0,127}$/.test(value.key)||typeof value.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expires_at)||!Number.isFinite(Date.parse(value.expires_at)))return null;
    return Object.fromEntries(keys.map(key=>[key,value[key]]));
  }catch{return null;}
}
export function renderSecretRequest(request,document){
  const card=document.createElement('section');card.className='secret-share-card secret-request-card';card.setAttribute('aria-label','Requested secret');
  const title=document.createElement('strong');title.textContent='Secret requested';
  const key=document.createElement('p');key.textContent=request.key;
  const description=document.createElement('p');description.textContent='Enter this secret privately. It will not be sent as a chat message.';
  const enter=document.createElement('button');enter.type='button';enter.textContent='Enter secret';
  const form=document.createElement('form');form.hidden=true;form.autocomplete='off';
  const label=document.createElement('label');label.textContent='Value';
  const input=document.createElement('input');input.type='password';input.autocomplete='new-password';input.required=true;input.setAttribute('aria-label','Value');label.append(input);
  const save=document.createElement('button');save.type='submit';save.textContent='Save secret';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
  const status=document.createElement('p');status.setAttribute('role','status');
  form.append(label,save,cancel);card.append(title,key,description,enter,form,status);
  let generation=0,timer,busy=false,disposed=false;
  const hidden=()=>document.hidden||document.getElementById('chat')?.hidden||document.getElementById('left-pane')?.hidden;
  const clear=()=>{generation++;clearTimeout(timer);input.value='';form.hidden=true;enter.hidden=false;};
  const unavailable=()=>{clear();status.textContent='Request is unavailable. Ask NED to request it again.';};
  const completed=()=>{clear();enter.hidden=true;status.textContent='Secret saved.';};
  const changed=()=>{if(hidden())clear();};document.addEventListener('visibilitychange',changed);
  const observer=new MutationObserver(()=>{
    if(!card.isConnected){disposed=true;clear();observer.disconnect();document.removeEventListener('visibilitychange',changed);}
    else if(hidden())clear();
  });
  for(const node of [document.getElementById('chat'),document.getElementById('left-pane')])if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
  const transcript=document.getElementById('transcript');if(transcript)observer.observe(transcript,{childList:true,subtree:true});
  const call=async(action,value)=>{
    const response=await fetch(`/api/secrets/requests/${request.request_id}/${action}`,{method:'POST',headers:{'X-NED-Secrets':'1',...(action==='submit'?{'Content-Type':'application/json'}:{})},...(action==='submit'?{body:JSON.stringify({value})}:{}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Unavailable');const result=await response.json();
    if(result.key!==request.key||typeof result.saved!=='boolean')throw new Error('Unavailable');return result;
  };
  enter.addEventListener('click',async()=>{
    if(busy||disposed||hidden())return;
    if(Date.parse(request.expires_at)<=Date.now()){unavailable();return;}
    clear();const epoch=generation;busy=true;enter.disabled=true;status.textContent='';
    try{
      const result=await call('status');if(disposed||epoch!==generation||hidden()||!card.isConnected)return;
      if(result.saved){completed();return;}
      enter.hidden=true;form.hidden=false;input.focus();timer=setTimeout(clear,30000);
    }catch{if(!disposed&&epoch===generation)unavailable();}
    finally{busy=false;enter.disabled=false;}
  });
  cancel.addEventListener('click',()=>{if(!busy){clear();enter.focus();}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||disposed||hidden())return;
    const value=input.value;clear();const epoch=generation;busy=true;enter.disabled=true;save.disabled=true;cancel.disabled=true;status.textContent='';
    try{
      const result=await call('submit',value);if(!result.saved)throw new Error('Unavailable');
      if(!disposed&&epoch===generation&&!hidden()&&card.isConnected)completed();
    }catch{if(!disposed&&epoch===generation)status.textContent='Could not save secret. Retry.';}
    finally{busy=false;enter.disabled=false;save.disabled=false;cancel.disabled=false;}
  });
  return card;
}
