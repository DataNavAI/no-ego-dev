export function mountModelSetup({document,request=globalThis.fetch,changed=()=>{}}={}){
  const card=document.getElementById('model-setup'),toggle=document.getElementById('model-setup-toggle');
  if(!card||!toggle)return {ready:()=>true,refresh:async()=>{}};
  const element=id=>document.getElementById(id),status=element('model-setup-status'),form=element('model-setup-form'),provider=element('model-provider'),model=element('model-name'),key=element('model-key'),hub=element('model-hub-link'),check=element('model-check');
  let state,ready=false,busy=false,opened=false,nonce,closed=false,version=0,login,pollTimer;
  const pending=()=>login&&['starting','waiting','authorizing'].includes(login.state);
  const defaults={openai:'gpt-4.1',openrouter:'openai/gpt-4.1',gemini:'gemini-2.5-flash',anthropic:'claude-sonnet-4-5','openai-codex':'gpt-5-codex'};
  function render(){
    card.hidden=ready&&!opened;
    form.hidden=!state;
    element('model-connect').hidden=form.hidden;
    hub.hidden=!state?.settingsUrl;
    hub.removeAttribute('href');
    if(state?.settingsUrl)hub.href=state.settingsUrl;
    const device=provider.value==='openai-codex';
    key.closest('.model-key-field').hidden=device;key.required=!device;
    provider.querySelector('[value="openai-codex"]').disabled=!state?.deviceLogin;
    for(const input of [provider,model,key,element('model-connect')])input.disabled=busy||Boolean(pending());
    element('model-connect').disabled=busy||Boolean(pending())||!nonce;
    element('model-connect').textContent=device?'Sign in with OpenAI':'Connect provider';
    element('model-login-cancel').hidden=!pending();element('model-login-cancel').disabled=busy||login?.state==='authorizing';
    const panel=element('model-device');panel.hidden=!pending()||!login.verificationUri;
    const link=element('model-device-link');link.removeAttribute('href');element('model-device-code').textContent='';
    if(!panel.hidden){link.href=login.verificationUri;element('model-device-code').textContent=login.userCode;}
    check.disabled=busy||Boolean(pending());
    element('model-disconnect').hidden=!state?.canDisconnect;element('model-disconnect').disabled=busy||Boolean(pending());
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
      state=data;nonce=data.nonce;ready=data.configured;key.value='';if(Object.hasOwn(defaults,data.provider))provider.value=data.provider;if(typeof data.model==='string')model.value=data.model;if(data.login){login=data.login;schedulePoll();}
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
      if(response.status===202){const data=await response.json();login=data.login;schedulePoll();status.textContent='Waiting for provider sign-in…';return;}
      const data=await read();if(closed||current!==version)return;
      state=data;nonce=data.nonce;ready=data.configured;opened=!ready;
      status.textContent=ready?'Model provider is configured.':'Model provider is required before chatting.';
    }catch{if(!closed&&current===version){ready=false;nonce=null;status.textContent='Provider connection could not be saved. Check the credentials and try again.';}}
    finally{if(!closed&&current===version){busy=false;render();}}
  }
  function schedulePoll(){clearTimeout(pollTimer);if(!closed&&pending())pollTimer=setTimeout(()=>void poll(),1500);}
  async function poll(){
    if(closed||!pending())return;
    try{const response=await request('/api/v1/model-setup?login='+encodeURIComponent(login.id),{headers:{'X-NED-Models':'1'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();if(closed)return;login=data.login;if(pending()){status.textContent=login.state==='authorizing'?'Saving provider connection…':'Waiting for provider sign-in…';render();schedulePoll();}else{const complete=login.state==='complete';login=null;opened=!complete;await refresh();if(!complete)status.textContent='Provider sign-in did not complete. Check connection and try again.';}}
    catch{if(!closed){status.textContent='Sign-in status is unavailable. Check connection before trying again.';login=null;render();}}
  }
  element('model-disconnect').addEventListener('click',()=>{if(busy||pending()||!nonce)return;if(!globalThis.confirm('Disconnect this instance provider? Other instances and Hub account settings stay unchanged.'))return;void write({action:'disconnect',nonce,confirm:true});});
  element('model-login-cancel').addEventListener('click',async()=>{
    if(busy||!pending())return;busy=true;render();
    try{const response=await request('/api/v1/model-setup',{method:'POST',headers:{'Content-Type':'application/json','X-NED-Models':'1'},body:JSON.stringify({action:'cancel-login',id:login.id}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();login=null;clearTimeout(pollTimer);await refresh(true);status.textContent='Provider sign-in cancelled.';}catch{status.textContent='Check connection before retrying sign-in.';}finally{busy=false;render();}
  });
  form.addEventListener('submit',event=>{event.preventDefault();if(!nonce||busy)return;const body={nonce,provider:provider.value,model:model.value,replace:state?.source!=='local',...(provider.value==='openai-codex'?{action:'login'}:{apiKey:key.value})};nonce=null;void write(body);});
  provider.addEventListener('change',()=>{model.value=defaults[provider.value]??'';render();});
  check.addEventListener('click',()=>{if(busy)return;if(state?.source==='hub')void write({action:'inherit'});else void refresh();});
  toggle.addEventListener('click',()=>{opened=!opened;render();if(opened)void refresh();});
  queueMicrotask(async()=>{
    try{
      const response=await request('/api/v1/capabilities',{signal:AbortSignal.timeout(15000)}),data=await response.json();
      if(data.capabilities?.modelSetup===false){ready=true;card.hidden=true;toggle.hidden=true;changed();return;}
    }catch{/* The model status request remains authoritative when discovery fails. */}
    await refresh();
  });
  return {ready:()=>ready,refresh,close(){closed=true;version++;clearTimeout(pollTimer);key.value='';element('model-device-code').textContent='';}};
}
