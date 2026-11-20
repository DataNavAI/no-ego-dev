import {mountTaskReferences} from './task-references.js';
import {validateMessagePage} from './history.js';
import {renderMessageContent,messageParts} from './message-content.js';
import {mountComposerMedia} from './composer-media.js';
import {consumeTurnStream} from './turn-stream.js';
import {recordChatDiagnostic,recordRequestDiagnostic} from './debug-pane.js';
import {classifyFailureBody,readFailureBody} from './request-diagnostic.js';
export function mergePage(current, page, direction, newerCount = page.length) {
  validateMessagePage(page);
  const changed=()=>Object.assign(new Error('History changed.'),{code:'history_changed'});
  const retained=new Set(current.map(row=>String(row.id)));
  if(direction==='older' && page.some(row=>retained.has(String(row.id))))throw changed();
  if(direction!=='older'){
    if(!Number.isInteger(newerCount)||newerCount<0||newerCount>page.length)throw changed();
    const overlap=page.length-newerCount;
    if(overlap>current.length || overlap && page.slice(0,overlap).some((row,index)=>String(row.id)!==String(current[current.length-overlap+index].id)))throw changed();
    if(page.slice(overlap).some(row=>retained.has(String(row.id))))throw changed();
  }
  return direction === 'older' ? [...page,...current].slice(0,200) : [...current,...page.slice(page.length-newerCount)].slice(-200);
}

export function mountChat(libraries) {
  const element = id => document.getElementById(id);
  const transcript = element('transcript');
  const status = element('chat-status');
  const activityLabels={working:'Working…',thinking:'Thinking…',searching:'Searching the web…',reading:'Reading files…',running:'Running a command…',writing:'Writing response…'};
  function showActivity(activity){
    if(!activeTurn)return;
    status.dataset.activity='true';
    const label=activeTurn.stopRequested?'Stopping response…':activityLabels[activity];
    if(label&&status.textContent!==label)status.textContent=label;
  }
  const draft = element('chat-message');
  let busy = false;
  let uncertain = false;
  let sessionId = '';
  let rows = [];
  let offset = 0;
  let older = false;
  let refreshNeeded = false;
  let historyHead = null;
  let historyReady = false;
  let loadingOlder=false,olderFailed=false,olderNotice='',activeTurn=null,pendingUser=null,lastStopped=false;
  let liveArticle,liveContent,liveText='';
  function fitDraft() {
    if(draft.clientWidth===0)return;
    draft.style.height='0px';
    draft.style.height=`${Math.max(34,draft.scrollHeight)}px`;
  }
  draft.addEventListener('input',fitDraft);
  if(typeof ResizeObserver!=='undefined'){
    let width=0;
    new ResizeObserver(entries=>{
      const nextWidth=entries[0]?.contentRect.width;
      if(nextWidth!==undefined&&nextWidth!==width){width=nextWidth;if(nextWidth>0)fitDraft();}
    }).observe(draft);
  }
  if(typeof globalThis.addEventListener==='function')globalThis.addEventListener('resize',fitDraft);
  const media=mountComposerMedia({document,draft,getSession:()=>sessionId,changed:()=>{fitDraft();render();},request:fetch});
  const references=mountTaskReferences({document,draft,changed:()=>{fitDraft();render();}});
  const controls = ['older','newer','latest','chat-send','chat-retry'];
  const atBottom = () => transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop < 64;
  const bottom = smooth => transcript.scrollTo({top:transcript.scrollHeight,behavior:smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant'});
  function render() {
    for (const id of controls) if(element(id))element(id).disabled = busy;
    const sending=Boolean(activeTurn);
    element('chat-send').disabled = sending ? activeTurn.stopRequested : busy || loadingOlder || uncertain || !sessionId || !historyReady || media.pending();
    element('chat-send').dataset.state=sending?(activeTurn.stopRequested?'stopping':'stop'):'send';
    element('chat-send').setAttribute('aria-label',sending?(activeTurn.stopRequested?'Stopping response':'Stop response'):'Send message');
    media.render(busy||uncertain||!sessionId||!historyReady);
    references.render(busy||uncertain||!sessionId||!historyReady);
    element('older').hidden = true;
    element('newer').hidden = true;
    element('latest').hidden = !sessionId || (!refreshNeeded && offset === 0);
    draft.disabled = !sessionId || !historyReady || busy&&!sending;
  }
  function draw() {
    liveArticle=undefined;liveContent=undefined;liveText='';
    transcript.replaceChildren(...rows.filter(row=>messageParts(row).length).map(row => {
      const article = document.createElement('article');
      article.className = `chat-message ${row.role === 'user' ? 'user-message' : 'assistant-message'}`;
      article.dataset.messageId=String(row.id);
      const author = document.createElement('strong'); author.textContent = row.role === 'user' ? 'You' : row.role === 'assistant' ? 'Hermes' : 'Tool';
      const content = renderMessageContent(row,document,libraries);
      article.append(author,content);return article;
    }));
  }
  function showPending(input){
    const following=atBottom(),top=transcript.scrollTop;
    const children=Array.from(transcript.children);
    const viewport=transcript.getBoundingClientRect().top;
    const anchor=children.find(child=>{const rect=child.getBoundingClientRect();return (rect.bottom ?? rect.top+100)>viewport;});
    const anchorTop=anchor?.getBoundingClientRect().top;
    pendingUser=document.createElement('article');pendingUser.className='chat-message user-message';pendingUser.dataset.state='pending';
    const author=document.createElement('strong');author.textContent='You';
    const text=input||[media.ready()?'Attachment':'',references.ready()?'Task reference':''].filter(Boolean).join(' · ');
    pendingUser.append(author,renderMessageContent({role:'user',content:text},document,libraries));
    if(children.length>=200)children.splice(anchor===children.at(-1)?0:199,1);
    transcript.replaceChildren(...children,pendingUser);
    if(following)bottom(false);else transcript.scrollTop=top+(anchorTop===undefined?0:anchor.getBoundingClientRect().top-anchorTop);
  }
  function showStream(text){
    if(!text)return;
    const following=atBottom();let top=transcript.scrollTop;
    if(!liveArticle){
      liveArticle=document.createElement('article');liveArticle.className='chat-message assistant-message';
      liveArticle.dataset.state='streaming';
      const author=document.createElement('strong');author.textContent='Hermes';
      liveContent=document.createElement('p');liveContent.className='message-content';
      liveContent.setAttribute?.('aria-label','Assistant message');
      liveArticle.append(author,liveContent);
      const children=Array.from(transcript.children);
      const viewport=transcript.getBoundingClientRect().top;
      const anchor=children.find(child=>{const rect=child.getBoundingClientRect();return (rect.bottom ?? rect.top+100)>viewport;});
      const anchorTop=anchor?.getBoundingClientRect().top;
      if(children.length>=200){const remove=children.findLastIndex(child=>child!==anchor&&child!==pendingUser);children.splice(remove,1);}
      transcript.replaceChildren(...children,liveArticle);
      if(!following&&anchorTop!==undefined)top+=anchor.getBoundingClientRect().top-anchorTop;
    }
    liveContent.textContent=text;
    if(following)bottom(false);else transcript.scrollTop=top;
  }
  async function api(path, body) {
    const phase=path==='/fixed'?'fixed_session':path.includes('/messages?')?'history':'turn_stream';
    const repeatable=phase==='fixed_session'||phase==='history'&&!body;
    for(let attempt=0;;attempt++){
    const started=Date.now();let response,failureKind;
    try{
    response = await fetch('/api/chat/sessions'+path,{...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(20000)});
    if (!response.ok) {
      const body=await readFailureBody(response);failureKind=classifyFailureBody(body);
      let failure;try{failure=JSON.parse(body);}catch{failure=null;}
      if(response.status===400&&['invalid_attachment','invalid_reference'].includes(failure?.error?.code))throw Object.assign(new Error(failure.error.message),{code:failure.error.code});
      throw new Error('Unavailable');
    }
    const result=await response.json();recordRequestDiagnostic(phase,{status:response.status,durationMs:Date.now()-started});return result;
    }catch(error){
      recordRequestDiagnostic(phase,{status:response?.status,durationMs:Date.now()-started,error,failure:failureKind});
      const transient=!['AbortError','TimeoutError'].includes(error.name)&&([502,503,504].includes(response?.status)||!response&&error.name==='TypeError');
      if(!repeatable||!transient||attempt>=2)throw error;
      await new Promise(resolve=>setTimeout(resolve,attempt===0?250:750));
    }
    }
  }
  async function requestStop(turn){
    turn.stopRequested=true;render();status.textContent='Stopping response…';
    if(!turn.id)return;
    try{await api(`/${encodeURIComponent(sessionId)}/turns/${turn.id}/stop`,{});}
    catch{if(activeTurn!==turn)return;turn.stopRequested=false;render();status.textContent='Could not stop the response. Try Stop again.';}
  }
  async function sendTurn(input) {
    const path=`/${encodeURIComponent(sessionId)}`;
    const attachmentIds=media.ids();const taskReferences=references.values();
    const accepted=await api(`${path}/chat`,{input,...(taskReferences.length?{references:taskReferences}:{}),...(attachmentIds.length?{attachments:attachmentIds}:{})});
    if(!/^[a-f0-9-]{36}$/.test(accepted.turn?.id)||accepted.turn.status!=='pending')throw new Error('Unavailable');
    activeTurn.id=accepted.turn.id;pendingUser.dataset.state='sent';
    if(activeTurn.stopRequested)void requestStop(activeTurn);
    liveText='';liveArticle=undefined;liveContent=undefined;
    recordChatDiagnostic('streaming');
    const response=await fetch(`/api/chat/sessions${path}/turns/${accepted.turn.id}/events`,{headers:{Accept:'text/event-stream'},signal:AbortSignal.timeout(610000)});
    const result=await consumeTurnStream(response,accepted.turn.id,sessionId,text=>{liveText=text;showStream(liveText);showActivity('writing');},showActivity);
    lastStopped=result.turn.status==='stopped';
    recordChatDiagnostic('completed');
        if(liveArticle){const following=atBottom();const top=transcript.scrollTop;liveArticle.dataset.state='completed';liveArticle.hidden=!messageParts(result.message).length;liveArticle.replaceChildren(liveArticle.firstElementChild,renderMessageContent(result.message,document,libraries));if(following)bottom(false);else transcript.scrollTop=top;}
        return result;
  }
  async function action(work, mutation = false) {
    if (busy) return;
    busy = true;if(mutation)status.dataset.activity='true';status.textContent = mutation ? 'Working…' : 'Loading chat…';render();
    recordChatDiagnostic(mutation?'sending':'loading');
    element('chat-retry').hidden=true;
    try {await work();if(!mutation)recordChatDiagnostic('ready');status.textContent = refreshNeeded || olderNotice || (mutation&&lastStopped?'Response stopped.':sessionId ? '' : 'Start a new chat.');}
    catch(error) {recordChatDiagnostic('failed');status.textContent = ['invalid_attachment','invalid_reference'].includes(error.code)?error.message:mutation ? 'Delivery could not be confirmed. Reload the session before sending again.' : error.code==='history_changed' ? refreshNeeded : 'Chat is unavailable. Check the Hermes gateway, then retry.';element('chat-retry').hidden=false;if(mutation&&!['invalid_attachment','invalid_reference'].includes(error.code)){uncertain=true;if(liveArticle)liveArticle.dataset.state='incomplete';}}
    finally {delete status.dataset.activity;busy=false;render();}
  }
  async function history(direction = 'latest') {
    const next = direction === 'older' ? offset+rows.length : direction === 'newer' ? Math.max(0,offset-50) : 0;
    const data = await api(`/${encodeURIComponent(sessionId)}/messages?offset=${next}`);
    let updated;
    try {
      validateMessagePage(data.data);
      updated=direction==='latest' ? data.data : mergePage(rows,data.data,direction,direction==='newer' ? Math.min(data.data.length,offset-next) : data.data.length);
      if(direction!=='latest'){
        const latest=await api(`/${encodeURIComponent(sessionId)}/messages?offset=0`);
        validateMessagePage(latest.data);
        if(String(latest.data.at(-1)?.id ?? '')!==historyHead)throw Object.assign(new Error('History changed.'),{code:'history_changed'});
      }
    }catch(error){refreshNeeded='History changed. Jump to latest to reload.';throw error;}
    const anchorId=transcript.firstElementChild?.dataset.messageId;
    const anchor = transcript.firstElementChild?.getBoundingClientRect().top;const top = transcript.scrollTop;
    if (direction === 'latest') {rows=updated;offset=0;older=data.data.length===50;refreshNeeded=false;olderFailed=false;olderNotice='';historyHead=String(data.data.at(-1)?.id ?? '');}
    else if (direction === 'older') {rows=updated;offset=next+data.data.length-rows.length;older=data.data.length===50;}
    else {rows=updated;offset=next;older=true;}
    draw();
    historyReady=true;
    render();
    if (direction === 'older' && anchor !== undefined) transcript.scrollTop=top+(Array.from(transcript.children).find(child=>child.dataset.messageId===anchorId)?.getBoundingClientRect().top ?? anchor)-anchor;
    else transcript.scrollTop=top;
  }
  function historyFailure(error){olderFailed=true;olderNotice=error.code==='history_changed'?refreshNeeded:'Earlier messages could not be loaded.';status.textContent=olderNotice;element('chat-retry').hidden=false;}
  async function fillUnderfilled(limit=20){
    for(let pages=0;pages<limit&&older&&!refreshNeeded&&!olderFailed&&transcript.scrollHeight<=transcript.clientHeight;pages++){
      try{await history('older');}catch(error){historyFailure(error);break;}
    }
  }
  async function loadOlder(){
    if(loadingOlder||busy||!historyReady||!older||refreshNeeded||olderFailed)return;
    loadingOlder=true;
    try{await history('older');await fillUnderfilled(19);status.textContent=olderNotice;}
    catch(error){historyFailure(error);}
    finally{loadingOlder=false;render();}
  }
  async function initialize() {
    recordChatDiagnostic('connecting');
    historyReady=false;
    const data=await api('/fixed',{});
    if(data.session?.id!=='nedcom-main'||data.session.title!=='NED Chat'||data.session.source!=='api_server')throw new Error('Unavailable');
    sessionId=data.session.id;
    await history();
    await fillUnderfilled();
    uncertain=false;
    recordChatDiagnostic('ready');
    bottom(false);
  }
  element('older').addEventListener('click',()=>void loadOlder());
  element('newer').addEventListener('click',()=>void action(()=>history('newer')));
  element('latest').addEventListener('click',()=>void action(async()=>{await history();await fillUnderfilled();bottom(true);}));
  element('chat-retry').addEventListener('click',()=>{if(olderFailed&&!refreshNeeded){olderFailed=false;olderNotice='';element('chat-retry').hidden=true;void loadOlder();}else void action(initialize);});
  transcript.addEventListener('scroll',()=>{if(transcript.scrollTop<=80)void loadOlder();});
  transcript.addEventListener('wheel',event=>{if(event.deltaY<0&&transcript.scrollTop<=80)void loadOlder();},{passive:true});
  transcript.addEventListener('keydown',event=>{if(['PageUp','Home','ArrowUp'].includes(event.key)&&transcript.scrollTop<=80)void loadOlder();});
  element('chat-send').addEventListener('click',event=>{if(activeTurn){event.preventDefault();void requestStop(activeTurn);}});
  draft.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.keyCode===229||event.repeat)return;
    event.preventDefault();
    if(!busy&&!uncertain&&!media.pending()&&sessionId&&historyReady&&(draft.value.trim()||media.ready()||references.ready()))element('chat-form').requestSubmit();
  });
  element('chat-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy||loadingOlder||uncertain||media.pending()||!sessionId||!historyReady||!draft.value.trim()&&!media.ready()&&!references.ready())return;
    const input=draft.value;
    lastStopped=false;activeTurn={id:null,stopRequested:false};showPending(input);draft.value='';fitDraft();
    void action(async()=>{
      try{
      const data=await sendTurn(input);
      const following=atBottom();
      if(data.session_id!==sessionId)throw new Error('Unavailable');
      media.clear();references.clear();
      if(following){await history();await fillUnderfilled();bottom(true);}else refreshNeeded='New reply available. Jump to latest.';
      }catch(error){
        if(!draft.value)draft.value=input;
        if(pendingUser){if(['invalid_attachment','invalid_reference'].includes(error.code))transcript.replaceChildren(...Array.from(transcript.children).filter(row=>row!==pendingUser));else pendingUser.dataset.state='incomplete';}
        fitDraft();throw error;
      }
      finally{activeTurn=null;}
      fitDraft();
    },true).then(()=>{
      const active=document.activeElement;
      if(!draft.disabled&&(!active||active===document.body||active===draft||active===element('chat-send')))draft.focus({preventScroll:true});
    });
  });
  fitDraft();render();void action(initialize);
}
