// Send only activity/draft metadata. Never transmit the user's text or input.
export function mountIdleActivity({document,request,hasDraft,view=globalThis,clock=Date.now}){
  const clientId=globalThis.crypto.randomUUID();
  let stopped=false,busy=false,timer,lastInteraction=-Infinity,interaction=false,lastDraft=null;
  const pendingInput=()=>Boolean(hasDraft()||[...document.querySelectorAll('input[type="password"]')].some(input=>!input.disabled&&input.value.length>0&&input.getClientRects().length>0));
  const send=async()=>{
    if(stopped||busy)return;
    const draft=pendingInput(),meaningful=interaction&&clock()-lastInteraction>=30000;
    if(!meaningful&&draft===lastDraft)return;
    let delivered=false;busy=true;if(meaningful){interaction=false;lastInteraction=clock();}
    try{
      const response=await request('/api/v1/activity/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:meaningful?'interaction':'draft',clientId,hasDraft:draft}),signal:AbortSignal.timeout(5000)});
      if(response.ok){const result=await response.json();if(result.accepted===false)close();else{lastDraft=draft;delivered=true;}}
      else{await response.body?.cancel();if([401,404].includes(response.status))close();}
    }catch{/* Unknown delivery never grants update authority. */}
    finally{busy=false;if(!stopped&&delivered&&pendingInput()!==lastDraft)void send();else if(!stopped&&interaction)schedule();}
  };
  function schedule(){clearTimeout(timer);timer=view.setTimeout(()=>void send(),Math.max(0,30000-(clock()-lastInteraction)));}
  const activity=event=>{if(!event.isTrusted)return;interaction=true;if(clock()-lastInteraction>=30000)void send();else schedule();};
  const changed=()=>{void send();};
  const input=event=>{activity(event);changed();};
  const reset=()=>queueMicrotask(changed);
  const observer=typeof view.MutationObserver==='function'?new view.MutationObserver(changed):null;
  observer?.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','type','class','style']});
  const pagehide=()=>{
    if(!stopped)void request('/api/v1/activity/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'draft',clientId,hasDraft:false}),keepalive:true,signal:AbortSignal.timeout(5000)}).then(response=>response.body?.cancel()).catch(()=>{});
    close();
  };
  function close(){stopped=true;clearTimeout(timer);document.removeEventListener('pointerdown',activity,true);document.removeEventListener('keydown',activity,true);document.removeEventListener('input',input,true);document.removeEventListener('reset',reset,true);observer?.disconnect();view.removeEventListener('pagehide',pagehide);}
  document.addEventListener('pointerdown',activity,true);document.addEventListener('keydown',activity,true);document.addEventListener('input',input,true);document.addEventListener('reset',reset,true);view.addEventListener('pagehide',pagehide);
  return {changed,close};
}
