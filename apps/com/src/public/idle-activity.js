// Send only activity/draft metadata. Never transmit the user's text or input.
export function mountIdleActivity({document,request,hasDraft,view=globalThis,clock=Date.now}){
  const clientId=globalThis.crypto.randomUUID();
  let stopped=false,busy=false,timer,lastInteraction=-Infinity,interaction=false,lastDraft=null;
  const send=async()=>{
    if(stopped||busy)return;
    const draft=Boolean(hasDraft()),meaningful=interaction&&clock()-lastInteraction>=30000;
    if(!meaningful&&draft===lastDraft)return;
    let delivered=false;busy=true;if(meaningful){interaction=false;lastInteraction=clock();}
    try{
      const response=await request('/api/v1/activity/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:meaningful?'interaction':'draft',clientId,hasDraft:draft}),signal:AbortSignal.timeout(5000)});
      if(response.ok){const result=await response.json();if(result.accepted===false)close();else{lastDraft=draft;delivered=true;}}
      else{await response.body?.cancel();if([401,404].includes(response.status))close();}
    }catch{/* Unknown delivery never grants update authority. */}
    finally{busy=false;if(!stopped&&interaction)schedule();else if(!stopped&&delivered&&Boolean(hasDraft())!==lastDraft)void send();}
  };
  function schedule(){clearTimeout(timer);timer=view.setTimeout(()=>void send(),Math.max(0,30000-(clock()-lastInteraction)));}
  const activity=event=>{if(!event.isTrusted)return;interaction=true;if(clock()-lastInteraction>=30000)void send();else schedule();};
  const changed=()=>{void send();};
  const pagehide=()=>{
    if(!stopped)void request('/api/v1/activity/interaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'draft',clientId,hasDraft:false}),keepalive:true,signal:AbortSignal.timeout(5000)}).then(response=>response.body?.cancel()).catch(()=>{});
    close();
  };
  function close(){stopped=true;clearTimeout(timer);document.removeEventListener('pointerdown',activity,true);document.removeEventListener('keydown',activity,true);view.removeEventListener('pagehide',pagehide);}
  document.addEventListener('pointerdown',activity,true);document.addEventListener('keydown',activity,true);view.addEventListener('pagehide',pagehide);
  return {changed,close};
}
