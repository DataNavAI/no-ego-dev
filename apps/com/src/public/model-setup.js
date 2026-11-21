export function mountModelSetup({document,request=globalThis.fetch,changed=()=>{}}={}){
  const card=document.getElementById('model-setup'),toggle=document.getElementById('model-setup-toggle');
  if(!card||!toggle)return {ready:()=>true,refresh:async()=>{}};
  const element=id=>document.getElementById(id),status=element('model-setup-status'),form=element('model-setup-form'),provider=element('model-provider'),model=element('model-name'),key=element('model-key'),hub=element('model-hub-link'),check=element('model-check');
  let state,ready=false,busy=false,opened=false,nonce,closed=false,version=0;
  function render(){
    card.hidden=ready&&!opened;
    form.hidden=Boolean(state?.hosted)||!state;
    element('model-connect').hidden=form.hidden;
    hub.hidden=!state?.settingsUrl;
    hub.removeAttribute('href');
    if(state?.settingsUrl)hub.href=state.settingsUrl;
    for(const input of [provider,model,key,element('model-connect')])input.disabled=busy;
    element('model-connect').disabled=busy||!nonce;
    check.disabled=busy;
    toggle.setAttribute('aria-expanded',String(!card.hidden));
    changed();
  }
  async function read(){
    const response=await request('/api/v1/model-setup',{headers:{'X-NED-Models':'1'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Model settings are unavailable. Check configuration and try again.');
    const data=await response.json();
    if(typeof data.configured!=='boolean'||!['local','profile','hub'].includes(data.source))throw new Error('Model settings are unavailable. Check configuration and try again.');
    if(data.settingsUrl){const url=new URL(data.settingsUrl);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('Invalid settings');}
    return data;
  }
  async function refresh(forceOpen=false){
    if(forceOpen)opened=true;
    const current=++version;busy=true;render();
    try{
      const data=await read();if(closed||current!==version)return;
      state=data;nonce=data.nonce;ready=data.configured;key.value='';
      status.textContent=ready?'Model provider is configured.':'Model provider is required before chatting.';
    }catch{if(!closed&&current===version){ready=false;status.textContent='Model settings are unavailable. Check configuration and try again.';}}
    finally{if(!closed&&current===version){busy=false;render();}}
  }
  async function write(body){
    if(busy||closed)return;
    const current=++version;busy=true;key.value='';render();
    try{
      const response=await request('/api/v1/model-setup',{method:'POST',headers:{'Content-Type':'application/json','X-NED-Models':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('Rejected');
      const data=await read();if(closed||current!==version)return;
      state=data;nonce=data.nonce;ready=data.configured;opened=!ready;
      status.textContent=ready?'Model provider is configured.':'Model provider is required before chatting.';
    }catch{if(!closed&&current===version){ready=false;nonce=null;status.textContent='Provider connection could not be saved. Check the credentials and try again.';}}
    finally{if(!closed&&current===version){busy=false;render();}}
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(!nonce||busy)return;const body={nonce,provider:provider.value,model:model.value,apiKey:key.value,replace:state?.source!=='local'};nonce=null;void write(body);});
  provider.addEventListener('change',()=>{model.value=provider.value==='openai'?'gpt-4.1':'openai/gpt-4.1';});
  check.addEventListener('click',()=>{if(busy)return;if(state?.source==='hub')void write({action:'inherit'});else void refresh();});
  toggle.addEventListener('click',()=>{opened=!opened;render();if(opened)void refresh();});
  queueMicrotask(async()=>{
    try{
      const response=await request('/api/v1/capabilities',{signal:AbortSignal.timeout(15000)}),data=await response.json();
      if(data.capabilities?.modelSetup===false){ready=true;card.hidden=true;toggle.hidden=true;changed();return;}
    }catch{/* The model status request remains authoritative when discovery fails. */}
    await refresh();
  });
  return {ready:()=>ready,refresh,close(){closed=true;version++;key.value='';}};
}
