export function secretShare(value){
  try{
    if(typeof value==='string'){if(value.length>2048)return null;value=JSON.parse(value);}
    if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==4||!['success','action','share_id','expires_at'].every(key=>Object.hasOwn(value,key))||value.success!==true||value.action!=='secure_share_secret'||typeof value.share_id!=='string'||!/^[a-f0-9]{64}$/.test(value.share_id)||typeof value.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expires_at)||!Number.isFinite(Date.parse(value.expires_at)))return null;
    return {success:true,action:'secure_share_secret',share_id:value.share_id,expires_at:value.expires_at};
  }catch{return null;}
}
export function secretShareRow(row){return row?.role==='tool'&&(row.tool_name??row.name)==='ned'?secretShare(row.content):null;}
export function renderSecretCard(share,document){
  const card=document.createElement('section');card.className='secret-share-card';card.setAttribute('aria-label','Shared secret');
  const title=document.createElement('strong');title.textContent='Secret ready';
  const description=document.createElement('p');description.textContent='Reveal this secret privately. It is not included in the conversation.';
  const button=document.createElement('button');button.type='button';button.textContent='Reveal secret';button.setAttribute('aria-expanded','false');
  const value=document.createElement('textarea');value.className='secret-share-value';value.readOnly=true;value.hidden=true;value.setAttribute('aria-label','Shared secret value');value.autocomplete='off';
  const status=document.createElement('p');status.setAttribute('role','status');
  let generation=0,timer,busy=false,disposed=false;
  const hidden=()=>document.hidden||document.getElementById('chat')?.hidden||document.getElementById('left-pane')?.hidden;
  const clear=()=>{generation++;clearTimeout(timer);value.value='';value.hidden=true;button.textContent='Reveal secret';button.setAttribute('aria-expanded','false');};
  const observer=typeof MutationObserver==='function'?new MutationObserver(()=>{if(!card.isConnected){disposed=true;clear();observer.disconnect();document.removeEventListener('visibilitychange',changed);}else if(hidden())clear();}):null;
  const changed=()=>{if(hidden())clear();};document.addEventListener('visibilitychange',changed);
  if(observer){const chat=document.getElementById('chat'),left=document.getElementById('left-pane');for(const node of [chat,left])if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});const transcript=document.getElementById('transcript');if(transcript)observer.observe(transcript,{childList:true});}
  button.addEventListener('click',async()=>{
    if(busy||disposed||hidden())return;if(!value.hidden){clear();return;}
    if(Date.parse(share.expires_at)<=Date.now()){status.textContent='Secret is unavailable. Ask NED to share it again.';return;}
    clear();const epoch=generation;busy=true;button.disabled=true;status.textContent='';
    try{
      const response=await fetch(`/api/secrets/shares/${share.share_id}/reveal`,{method:'POST',headers:{'X-NED-Secrets':'1'},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Unavailable');const data=await response.json();
      if(typeof data.value!=='string'||data.value.length>65536)throw new Error('Unavailable');
      if(disposed||epoch!==generation||hidden()||!card.isConnected)return;
      value.value=data.value;value.hidden=false;button.textContent='Hide';button.setAttribute('aria-expanded','true');timer=setTimeout(clear,30000);
    }catch{if(epoch===generation&&!disposed){clear();status.textContent='Secret is unavailable. Ask NED to share it again.';}}
    finally{busy=false;button.disabled=false;}
  });
  card.append(title,description,button,value,status);return card;
}
