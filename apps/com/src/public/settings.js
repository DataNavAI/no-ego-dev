export function mountSettings({document,fetch:request=globalThis.fetch,setTimeout:later=globalThis.setTimeout,clearTimeout:cancel=globalThis.clearTimeout}={}){
  const panel=document.getElementById('settings');if(!panel)return;
  const form=document.getElementById('secret-form'),key=document.getElementById('secret-key'),value=document.getElementById('secret-value'),status=document.getElementById('secret-status'),list=document.getElementById('secret-list'),retry=document.getElementById('secret-retry');
  let generation=0,busy=false;const timers=new Set();
  const active=()=>!panel.hidden&&document.visibilityState!=='hidden';
  function hideValues(){for(const timer of timers)cancel(timer);timers.clear();for(const input of list.querySelectorAll('textarea')){input.value='';input.hidden=true;}for(const button of list.querySelectorAll('[data-reveal]')){button.textContent='Show';button.setAttribute('aria-expanded','false');}}
  function controls(){for(const control of panel.querySelectorAll('button,input'))control.disabled=busy;}
  async function api(path='',method='GET',body){
    const response=await request('/api/secrets'+path,{method,headers:{'X-NED-Secrets':'1',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.ok)throw new Error('Secrets unavailable');return response.json();
  }
  async function run(operation,apply,message='Secrets are unavailable. Retry.'){
    if(busy)return;busy=true;controls();const epoch=generation;
    try{const result=await operation();if(epoch===generation&&active())apply(result);}
    catch{if(epoch===generation&&active()){hideValues();status.textContent=message;retry.hidden=false;}}
    finally{busy=false;controls();if(epoch!==generation&&active())queueMicrotask(load);}
  }
  function button(text,handler){const node=document.createElement('button');node.type='button';node.textContent=text;node.addEventListener('click',handler);return node;}
  function rows(items){
    hideValues();list.replaceChildren();
    if(!items.length){const empty=document.createElement('p');empty.textContent='No secrets saved.';list.append(empty);return;}
    for(const item of items){
      const row=document.createElement('li'),name=document.createElement('strong'),actions=document.createElement('div'),revealed=document.createElement('textarea');
      name.textContent=item.key;actions.className='secret-actions';revealed.className='secret-revealed';revealed.readOnly=true;revealed.hidden=true;revealed.setAttribute('aria-label',`Value for ${item.key}`);revealed.autocomplete='off';
      const show=button('Show',()=>{
        if(!revealed.hidden){hideValues();return;}
        hideValues();void run(()=>api('/'+item.key+'/reveal','POST'),result=>{
          revealed.value=result.value;revealed.hidden=false;show.textContent='Hide';show.setAttribute('aria-expanded','true');
          const timer=later(()=>{hideValues();},30000);timers.add(timer);
        });
      });show.dataset.reveal='';show.setAttribute('aria-expanded','false');show.setAttribute('aria-label',`Show or hide ${item.key}`);
      const replace=button('Replace',()=>{hideValues();key.value=item.key;value.value='';value.focus();});replace.setAttribute('aria-label',`Replace ${item.key}`);
      const confirmation=document.createElement('div');confirmation.hidden=true;confirmation.className='secret-confirmation';
      const label=document.createElement('span');label.textContent=`Delete ${item.key}?`;
      const remove=button('Delete',()=>{hideValues();confirmation.hidden=false;confirm.focus();});remove.setAttribute('aria-label',`Delete ${item.key}`);
      const confirm=button('Delete secret',()=>{void run(async()=>{await api('/'+item.key,'DELETE');return api();},result=>{rows(result.secrets);status.textContent='Secret deleted.';key.focus();},'Could not delete secret. Retry.');});
      const dismiss=button('Cancel',()=>{confirmation.hidden=true;remove.focus();});confirmation.append(label,confirm,dismiss);
      actions.append(show,replace,remove);row.append(name,actions,revealed,confirmation);list.append(row);
    }
  }
  function load(){if(!active())return;status.textContent='Loading secrets…';retry.hidden=true;void run(()=>api(),result=>{rows(result.secrets);status.textContent='';});}
  form.addEventListener('submit',event=>{
    event.preventDefault();if(busy||!active())return;
    const name=key.value,secret=value.value;value.value='';hideValues();retry.hidden=true;
    void run(async()=>{await api('/'+encodeURIComponent(name),'PUT',{value:secret});return api();},result=>{rows(result.secrets);status.textContent='Secret saved.';},'Could not save secret. Retry.');
  });
  retry.addEventListener('click',load);
  const change=()=>{generation++;hideValues();value.value='';status.textContent='';if(active())load();};
  const observer=new MutationObserver(change);observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',change);
  globalThis.addEventListener?.('pagehide',()=>{generation++;hideValues();value.value='';});
  return {clear:change};
}
if(typeof document!=='undefined')mountSettings({document});
