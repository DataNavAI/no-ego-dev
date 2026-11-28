import {apiFetch} from './api-client.js';
export function mountPreview({document,fetch=apiFetch,setTimer=setTimeout,clearTimer=clearTimeout,location=globalThis.location,panelId='preview-panel',recordKey='preview',label='Preview',frameName='ned-working-app',endpoint=()=>'/api/v1/preview',projectControl=null}){
  const panel=document.getElementById(panelId);if(!panel)return;
  const legacy=panel.querySelector('.preview-state')??panel.querySelector('.dashboard-empty');
  const section=document.createElement('section');section.className='managed-preview';section.hidden=true;
  section.innerHTML='<div class="managed-preview-meta sr-only"><div><strong class="managed-preview-name"></strong><span class="managed-preview-project"></span><span class="managed-preview-status" role="status" aria-live="polite"></span></div></div><div class="managed-preview-actions"><button type="button" class="managed-preview-reload" title="Reload"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M16 7a6 6 0 1 0 0 6M16 3v4h-4"/></svg><span class="sr-only">Reload</span></button><button type="button" class="managed-preview-open" title="Open in new tab"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M11 3h6v6M17 3l-8 8M8 4H4v12h12v-4"/></svg><span class="sr-only">Open in new tab</span></button></div><p class="managed-preview-message" role="status"></p><iframe title="'+(recordKey==='dashboard'?'Product dashboard':'Working app')+'" name="'+frameName+'" sandbox="allow-scripts allow-forms allow-same-origin allow-downloads allow-modals allow-popups"></iframe>';
  panel.append(section);
  let frame=section.querySelector('iframe');const name=section.querySelector('.managed-preview-name'),project=section.querySelector('.managed-preview-project'),status=section.querySelector('.managed-preview-status'),message=section.querySelector('.managed-preview-message'),reload=section.querySelector('.managed-preview-reload'),open=section.querySelector('.managed-preview-open');
  const actions=section.querySelector('.managed-preview-actions'),actionHost=document.getElementById('project-frame-actions');
  actions.dataset.panel=panelId;if(actionHost)actionHost.append(actions);
  const syncActions=()=>{actions.hidden=section.hidden||panel.hidden;};
  document.addEventListener('ned-context-layout',syncActions);syncActions();
  let timer,stopped=false,epoch=0,selected=null,expires=0,pending=false,polling=false,prepared=null,expectedOrigin=null,receiptTimer;
  function clearFrame(){
    // POST navigation does not set src; removing a missing attribute leaves the
    // previous app running. Detach its browsing context instead.
    if(expectedOrigin!==null){const replacement=frame.cloneNode(false);replacement.removeAttribute('src');replacement.hidden=true;frame.replaceWith(replacement);frame=replacement;}
    expectedOrigin=null;frame.hidden=true;
  }
  function reset(){epoch++;selected=null;expires=0;prepared=null;clearTimer(receiptTimer);clearFrame();}
  function availableOrigin(value){
    try{const url=new URL(value);if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)return false;
      const current=new URL(location.href);
      if(['127.0.0.1','localhost'].includes(current.hostname))return url.protocol==='http:'&&/^pv-[a-f0-9]{32}\.localhost$/.test(url.hostname);
      return url.protocol===current.protocol&&url.port===current.port&&url.hostname.startsWith('preview--')&&/^preview--[a-f0-9]{32}$/.test(url.hostname.split('.')[0])&&url.hostname.split('.').slice(1).join('.')===current.hostname.split('.').slice(1).join('.');
    }catch{return false;}
  }
  async function issue(mode,generation){
    const response=await fetch(endpoint()+'/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode})});const result=await response.json();
    if(!response.ok||generation!==epoch||stopped||!selected||result.id!==selected.id||result.revision!==selected.revision||result.bootstrapPath!=='/__ned/preview/bootstrap'||!availableOrigin(result.origin)||typeof result.grant!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(result.grant))throw new Error('Preview unavailable');
    return result;
  }
  function submit(result,target){
    const form=document.createElement('form');form.method='POST';form.action=result.origin+result.bootstrapPath;form.target=target;if(target==='_blank')form.rel='noopener';form.hidden=true;
    const input=document.createElement('input');input.type='hidden';input.name='grant';input.value=result.grant;form.append(input);document.body.append(form);
    form.submit();input.value='';form.remove();result.grant='';
  }
  async function access(mode,generation,target){
    const result=await issue(mode,generation);if(mode==='frame'){clearFrame();expectedOrigin=result.origin;}submit(result,target);
    if(mode==='frame'){frame.hidden=false;expires=Date.now()+840000;message.textContent='';status.textContent='Connecting '+label.toLowerCase()+'…';clearTimer(receiptTimer);receiptTimer=setTimer(()=>{if(generation===epoch){frame.hidden=true;expires=Date.now()+30000;status.textContent=label+' unavailable';message.textContent='Try again or open the app in a new tab.';}},4000);
      try{const ticket=await issue('tab',generation);if(generation===epoch)prepared={ticket,until:Date.now()+20000};}catch{/* next poll renews the explicit user action */}
    }
  }
  async function connect(mode='frame',target=frame.name){
    if(pending)return false;pending=true;const generation=epoch;
    try{await access(mode,generation,target);return true;}catch{if(generation===epoch&&!stopped){status.textContent=label+' unavailable';message.textContent='Try again or open the app in a new tab.';expires=0;}return false;}
    finally{pending=false;}
  }
  async function poll(){
    if(stopped||polling)return;polling=true;const generation=epoch;
    try{
      const path=endpoint();if(recordKey==='dashboard'){const heading=panel.querySelector('#dashboard-heading'),body=panel.querySelector('#dashboard-empty-message');if(heading)heading.textContent=path?'No dashboard registered':'Choose a project';if(body)body.textContent=path?'Ask NED to register a dashboard server for this project.':'Select a project to view its dashboard.';}if(!path){if(selected)reset();section.hidden=true;panel.classList.remove('managed-active');if(legacy)legacy.hidden=false;return;}
      const response=await fetch(path);if(!response.ok)throw new Error();const payload=await response.json(),data={...payload,preview:payload[recordKey]};if(stopped||generation!==epoch)return;
      if(!data.preview){if(selected)reset();section.hidden=true;panel.classList.remove('managed-active');if(legacy)legacy.hidden=false;return;}
      section.hidden=false;panel.classList.add('managed-active');if(legacy)legacy.hidden=true;
      const transport=response.headers?.get?.('x-ned-preview-generation')??data.delivery?.generation??'';
      const changed=selected?.id!==data.preview.id||selected?.revision!==data.revision||selected?.transport!==transport;
      if(changed){reset();selected={id:data.preview.id,revision:data.revision,transport};}
      name.textContent=data.preview.name;project.textContent=data.preview.project?.name??'';
      const remote=!['127.0.0.1','localhost'].includes(new URL(location.href).hostname);
      const supported=data.delivery?.mode==='private-relay'&&(!remote||data.delivery?.remoteAvailable===true);
      const ready=data.preview.status==='available'&&supported;open.disabled=!ready;reload.disabled=pending;
      if(!ready){expires=0;clearFrame();status.textContent=data.preview.status==='stopped'?'App is not running':label+' unavailable';message.textContent=data.preview.status==='stopped'?'NED needs to restart the app.':!supported?`Private ${label.toLowerCase()} is not supported by this connection.`:'Try again or open the app in a new tab.';}
      else if(changed||Date.now()>=expires){status.textContent='Connecting '+label.toLowerCase()+'…';await connect();}
      else if(!prepared||Date.now()>=prepared.until){try{prepared={ticket:await issue('tab',epoch),until:Date.now()+20000};}catch{prepared=null;}}
      open.disabled=!ready||!prepared;
    }catch{if(selected||recordKey==='dashboard'){reset();section.hidden=false;panel.classList.add('managed-active');if(legacy)legacy.hidden=true;status.textContent=label+' unavailable';message.textContent='Try again or open the app in a new tab.';}}
    finally{syncActions();polling=false;if(!stopped)timer=setTimer(()=>{void poll();},2000);}
  }
  reload.addEventListener('click',()=>{if(pending)return;expires=0;void poll();});
  // Submit synchronously-created target on user gesture, never expose a bearer URL.
  open.addEventListener('click',()=>{if(!selected||!prepared||Date.now()>=prepared.until)return;const ticket=prepared.ticket;prepared=null;open.disabled=true;submit(ticket,'_blank');});
  const receive=event=>{if(!stopped&&selected&&event.source===frame.contentWindow&&event.origin===expectedOrigin&&event.data?.type==='ned-preview-ready'&&event.data.id===selected.id&&event.data.revision===selected.revision){clearTimer(receiptTimer);frame.hidden=false;status.textContent=label+' ready';message.textContent='';}};
  const lost=()=>{reset();section.hidden=true;syncActions();},restored=()=>{reset();clearTimer(timer);void poll();};
  globalThis.addEventListener?.('message',receive);
  const changed=()=>{reset();section.hidden=true;syncActions();panel.classList.remove('managed-active');if(legacy)legacy.hidden=false;clearTimer(timer);void poll();};
  projectControl?.addEventListener('change',changed);
  document.addEventListener('ned-auth-lost',lost);
  document.addEventListener('ned-auth-restored',restored);
  void poll();return {close(){stopped=true;actions.remove();document.removeEventListener('ned-context-layout',syncActions);projectControl?.removeEventListener('change',changed);reset();clearTimer(timer);globalThis.removeEventListener?.('message',receive);document.removeEventListener('ned-auth-lost',lost);document.removeEventListener('ned-auth-restored',restored);panel.classList.remove('managed-active');if(legacy)legacy.hidden=false;section.remove();}};
}

export function mountProductDashboard(options){
  const project=options.document.getElementById('project');
  return mountPreview({...options,panelId:'dashboard',recordKey:'dashboard',label:'Dashboard',frameName:'ned-product-dashboard',projectControl:project,endpoint:()=>project?.value?'/api/v1/dashboards/'+encodeURIComponent(project.value):null});
}
