export function mountModelSetup({document,request=globalThis.fetch,changed=()=>{}}={}){
  const card=document.getElementById('model-setup'),toggle=document.getElementById('model-setup-toggle');
  if(!card||!toggle)return {ready:()=>true,refresh:async()=>{}};
  const element=id=>document.getElementById(id),status=element('model-setup-status'),form=element('model-setup-form'),provider=element('model-provider'),model=element('model-name'),key=element('model-key'),check=element('model-check');
  let state,ready=false,busy=false,opened=false,nonce,closed=false,version=0,login,pollTimer;
  let authenticated=!document.getElementById('app-shell')?.hidden;
  const closeButton=element('model-setup-close');
  function dismiss(){if(!ready)return;opened=false;render();toggle.focus();}
  card.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  closeButton.addEventListener('click',dismiss);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!card.open)return;
    const controls=[...card.querySelectorAll('a[href],button,input,select,textarea')].filter(e=>!e.disabled&&e.getClientRects().length);
    const first=controls[0],last=controls.at(-1),active=document.activeElement;
    if(!first){event.preventDefault();element('model-setup-title').focus();}
    else if(event.shiftKey&&(active===first||!controls.includes(active))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(active===last||!controls.includes(active))){event.preventDefault();first.focus();}
  });
  document.addEventListener('ned-auth-lost',()=>{authenticated=false;version++;ready=false;state=null;nonce=null;login=null;clearTimeout(pollTimer);key.value='';render();});
  document.addEventListener('ned-auth-entered',()=>{const recheck=!authenticated;authenticated=true;render();if(recheck)void discover();});
  const pending=()=>login&&['starting','waiting','authorizing'].includes(login.state);
  const providers=['openai','openrouter','gemini','anthropic','openai-codex'];
  const choices=()=>Array.isArray(state?.models?.[provider.value])?state.models[provider.value].filter(id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(id)).slice(0,100):[];
  function populate(selected){
    model.replaceChildren();const ids=choices();
    for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=id;model.append(option);}
    if(selected&&!ids.includes(selected)){const option=document.createElement('option');option.value=selected;option.textContent=selected+' (current configuration)';option.disabled=true;model.prepend(option);}
    if(!model.options.length){const option=document.createElement('option');option.value='';option.textContent='Models unavailable';model.append(option);}
    model.value=selected??ids[0]??'';
  }
  function render(){
    const visible=!closed&&authenticated&&(!ready||opened);
    card.classList.toggle('model-onboarding',!ready);
    closeButton.hidden=!ready;
    card.hidden=!visible;
    if(visible&&!card.open){card.showModal();element('model-setup-title').focus();}
    else if(!visible&&card.open){card.close();if(authenticated&&ready)element('chat-message').focus();}
    form.hidden=!state;
    element('model-connect').hidden=form.hidden;
    const listed=choices().includes(model.value);
    element('model-catalog-status').textContent=choices().length?'Models supported by this NED installation. Access depends on your provider account.':'Model list is unavailable. Check connection to try again.';
    const device=provider.value==='openai-codex';
    key.closest('.model-key-field').hidden=device;key.required=!device;
    provider.querySelector('[value="openai-codex"]').disabled=!state?.deviceLogin;
    for(const input of [provider,model,key,element('model-connect')])input.disabled=busy||Boolean(pending());
    element('model-connect').disabled=busy||Boolean(pending())||!nonce||!listed;
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
    return data;
  }
  async function refresh(forceOpen=false){
    if(forceOpen)opened=true;
    const current=++version;busy=true;render();
    try{
      const data=await read();if(closed||current!==version)return;
      const first=!state,previousProvider=provider.value,previousModel=model.value;state=data;nonce=data.nonce;ready=data.configured;key.value='';if(data.configured&&providers.includes(data.provider))provider.value=data.provider;else if(first||provider.value==='openai-codex'&&!data.deviceLogin)provider.value=data.deviceLogin?'openai-codex':'openai';populate(typeof data.model==='string'&&data.configured?data.model:previousProvider===provider.value&&choices().includes(previousModel)?previousModel:undefined);if(data.login){login=data.login;schedulePoll();}
      status.textContent=ready?'Model provider is configured.':'Model provider is required before chatting.';
    }catch{if(!closed&&current===version){ready=false;status.textContent='Model settings are unavailable. Check configuration and try again.';}}
    finally{if(!closed&&current===version){busy=false;render();}}
  }
  async function write(body){
    if(busy||closed)return;
    const current=++version;busy=true;key.value='';render();
    try{
      const response=await request('/api/v1/model-setup',{method:'POST',headers:{'Content-Type':'application/json','X-NED-Models':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      if(closed||current!==version)return;
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
    const current=version;
    try{const response=await request('/api/v1/model-setup?login='+encodeURIComponent(login.id),{headers:{'X-NED-Models':'1'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();if(closed||current!==version)return;login=data.login;if(pending()){status.textContent=login.state==='authorizing'?'Saving provider connection…':'Waiting for provider sign-in…';render();schedulePoll();}else{const complete=login.state==='complete';login=null;opened=!complete;await refresh();if(!complete)status.textContent='Provider sign-in did not complete. Check connection and try again.';}}
    catch{if(!closed&&current===version){status.textContent='Sign-in status is unavailable. Check connection before trying again.';login=null;render();}}
  }
  element('model-disconnect').addEventListener('click',()=>{if(busy||pending()||!nonce)return;if(!globalThis.confirm('Disconnect this instance provider? Other instances and Hub account settings stay unchanged.'))return;void write({action:'disconnect',nonce,confirm:true});});
  element('model-login-cancel').addEventListener('click',async()=>{
    if(busy||!pending())return;const current=version;busy=true;render();
    try{const response=await request('/api/v1/model-setup',{method:'POST',headers:{'Content-Type':'application/json','X-NED-Models':'1'},body:JSON.stringify({action:'cancel-login',id:login.id}),signal:AbortSignal.timeout(15000)});if(closed||current!==version)return;if(!response.ok)throw Error();login=null;clearTimeout(pollTimer);await refresh(true);status.textContent='Provider sign-in cancelled.';}catch{status.textContent='Check connection before retrying sign-in.';}finally{busy=false;render();}
  });
  form.addEventListener('submit',event=>{event.preventDefault();if(!nonce||busy||!choices().includes(model.value))return;const body={nonce,provider:provider.value,model:model.value,replace:state?.source!=='local',...(provider.value==='openai-codex'?{action:'login'}:{apiKey:key.value})};nonce=null;void write(body);});
  provider.addEventListener('change',()=>{key.value='';populate();render();});
  model.addEventListener('change',render);
  check.addEventListener('click',()=>{if(busy)return;if(state?.source==='hub')void write({action:'inherit'});else void refresh();});
  toggle.addEventListener('click',()=>{opened=!opened;render();if(opened)void refresh();});
  async function discover(){
    const current=++version;busy=true;render();
    try{
      const response=await request('/api/v1/capabilities',{signal:AbortSignal.timeout(15000)}),data=await response.json();
      if(closed||current!==version)return;
      if(data.capabilities?.modelSetup===false){busy=false;ready=true;opened=false;toggle.hidden=true;render();return;}
    }catch{/* The model status request remains authoritative when discovery fails. */}
    if(!closed&&current===version)await refresh();
  }
  queueMicrotask(()=>{if(authenticated)void discover();});
  return {ready:()=>ready,refresh,close(){closed=true;version++;clearTimeout(pollTimer);key.value='';element('model-device-code').textContent='';render();}};
}
