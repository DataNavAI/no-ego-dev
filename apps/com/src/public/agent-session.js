import {renderMessageContent,messageParts} from './message-content.js';

export function mountAgentSession({document,request,libraries}){
  const view=document.getElementById('agent-session');
  if(!view)return;
  const chat=document.getElementById('chat');
  const banner=document.getElementById('agent-session-identity');
  const exit=document.getElementById('agent-session-return');
  const status=document.getElementById('agent-session-status');
  const transcript=document.getElementById('agent-session-transcript');
  const main=[...chat.children].filter(child=>child!==view);
  let selected,controller,timer,signature;
  function cancel(){
    controller?.abort();
    clearTimeout(timer);
  }
  function close(focus=false){
    cancel();selected=undefined;
    view.hidden=true;
    chat.removeAttribute('data-agent-session');
    for(const child of main)child.inert=false;
    transcript.replaceChildren();
    document.dispatchEvent(new Event('ned-agent-session-changed'));
    if(focus)document.getElementById('chat-message').focus({preventScroll:true});
  }
  async function refresh(selection){
    if(selected!==selection)return;
    controller=new AbortController();
    try{
      const response=await request(selection.resource+'?offset=0',{
        signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]),
      });
      if(!response.ok)throw new Error('Session unavailable');
      const data=await response.json();
      if(selected!==selection)return;
      if(data.projectId!==selection.projectId||data.sessionId!==selection.sessionId||!Array.isArray(data.data))throw new Error('Unexpected session');
      const rows=data.data.filter(row=>['user','assistant'].includes(row.role)&&messageParts(row).length);
      const next=JSON.stringify(rows);
      if(signature!==next){
        const following=signature===undefined||transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop<=4;
        transcript.replaceChildren(...rows.map(row=>{
          const article=document.createElement('article');
          article.className=`chat-message ${row.role==='user'?'user-message':'assistant-message'}`;
          const author=document.createElement('strong');author.textContent=row.role==='user'?'You':selection.agent;
          article.append(author,renderMessageContent(row,document,libraries));
          return article;
        }));
        signature=next;
        if(following)transcript.scrollTo({top:transcript.scrollHeight,behavior:'instant'});
      }
      status.textContent=rows.length?'':'No messages recorded yet.';
    }catch{
      if(selected===selection){
        signature=undefined;
        transcript.replaceChildren();
        status.textContent='Agent session unavailable. Retrying…';
      }
    }finally{
      if(selected===selection)timer=setTimeout(()=>void refresh(selection),3500);
    }
  }
  document.addEventListener('ned-open-agent-session',event=>{
    const selection=event.detail;
    if(!/^\/api\/v1\/projects\/[A-Za-z0-9_-]+\/tasks\/[A-Za-z0-9_-]+\/attempts\/[A-Za-z0-9_-]+\/sessions\/[A-Za-z0-9_-]+\/messages$/.test(selection?.resource))return;
    cancel();selected=selection;signature=undefined;
    document.getElementById('left-toggle').click();
    banner.textContent=`${selection.agent} · ${selection.sessionId}`;
    status.textContent='Loading agent session…';
    transcript.replaceChildren();
    view.hidden=false;
    chat.setAttribute('data-agent-session','');
    for(const child of main)child.inert=true;
    document.dispatchEvent(new Event('ned-agent-session-changed'));
    exit.focus();
    void refresh(selection);
  });
  exit.addEventListener('click',()=>close(true));
  document.addEventListener('ned-auth-lost',()=>close());
  document.defaultView?.addEventListener('pagehide',()=>close());
}
