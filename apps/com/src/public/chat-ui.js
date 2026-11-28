import {renderReaction} from './message-reaction.js';
import {apiFetch as fetch} from './api-client.js';
import {mountModelSetup} from './model-setup.js';
import {mountTaskReferences} from './task-references.js';
import {validateMessagePage} from './history.js';
import {renderMessageContent,messageParts} from './message-content.js';
import {mountComposerMedia} from './composer-media.js';
import {consumeTurnStream} from './turn-stream.js';
import {recordChatDiagnostic,recordRequestDiagnostic} from './debug-pane.js';
import {classifyFailureBody,readFailureBody} from './request-diagnostic.js';
const assistantName = 'NED';
const validSession=session=>session&&/^(?:nedcom-main|nedcom-main-[a-f0-9-]{36})$/.test(session.id)&&session.title===(session.id==='nedcom-main'?'NED Chat':`NED Chat · ${session.id.slice('nedcom-main-'.length)}`)&&session.source==='api_server';

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
  const resetChat = element('debug-reset-chat');
  const viewingAgent=()=>element('agent-session')?.hidden===false;
  const providerRequests = element('chat-provider-requests');
  const messageNodes = () => Array.from(transcript.children).filter(node=>node!==providerRequests);
  // Keep an existing action before a subsequent turn, so the reply remains the live tail.
  let providerAfter;
  function providerIndex(nodes){
    return providerAfter===undefined?nodes.length:nodes.findIndex(node=>node.dataset.messageId===providerAfter)+1;
  }
  function keepProviderBeforeReply(messages){
    if(providerRequests&&providerAfter===undefined)providerAfter=messages.at(-1)?.dataset.messageId??null;
  }
  function replaceMessages(nodes){
    if(providerRequests)nodes.splice(providerIndex(nodes),0,providerRequests);
    transcript.replaceChildren(...nodes);
  }
  const activityLabels={
    reconnecting:'Reconnecting to the reply…',working:'NED is preparing a reply…',thinking:'NED is thinking…',
    searching:'NED is searching the web…',reading:'NED is reading files…',
    running:'NED is running a command…',writing:'NED is writing a reply…',
  };
  function showActivity(activity){
    if(!activeTurn)return;
    if(activity)activeTurn.activity=activity;
    const label=activeTurn.stopRequested?'Stopping response…':activityLabels[activeTurn.activity];
    if(!label)return;
    const following=followingLatest();
    ensureLiveArticle();
    if(progress.textContent!==label)progress.textContent=label;
    if(following)bottom();
  }
  const empty = element('chat-empty');
  const draft = element('chat-message');
  let busy = false;
  let reconnectNeeded=false,authLost=false,reconnectQueued=false;
  let uncertain = false;
  let sessionId = '';
  let rows = [];
  let offset = 0;
  let older = false;
  let refreshNeeded = false;
  let historyHead = null;
  let historyRevision = 0;
  let historyReady = false;
  let loadingOlder=false,olderFailed=false,olderNotice='',activeTurn=null,pendingUser=null,lastStopped=false;
  let liveArticle,liveContent,progress;
  function fitDraft() {
    if(draft.clientWidth===0)return;
    draft.style.height='0px';
    draft.style.height=`${Math.max(34,draft.scrollHeight)}px`;
  }
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
  const modelSetup=mountModelSetup({document,request:fetch,changed:render});
  const controls = ['older','newer','chat-send','chat-retry'];
  const atBottom = () => transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop <= 4;
  let followLatest=true, observedTop=transcript.scrollTop;
  function followingLatest(){
    // A layout change can move the tail without moving the reader's scroll position.
    if(transcript.scrollTop!==observedTop){
      observedTop=transcript.scrollTop;
      followLatest=atBottom();
    }
    return followLatest;
  }
  function bottom(){
    followLatest=true;
    transcript.scrollTo({top:transcript.scrollHeight,behavior:'instant'});
    observedTop=transcript.scrollTop;
  }
  function renderLatest(){
    const latest=element('latest');
    const away=!followingLatest();
    latest.hidden=!historyReady||!sessionId||(!away&&!refreshNeeded&&offset===0);
    latest.disabled=busy&&!activeTurn;
  }
  if(typeof ResizeObserver!=='undefined'){
    new ResizeObserver(()=>{
      if(historyReady&&followingLatest())bottom();
    }).observe(transcript);
  }
  function renderSend(){
    libraries?.idleActivity?.changed({hasDraft:Boolean(draft.value.trim()||media.ready()||media.pending()||references.ready())});
    const send=element('chat-send'),sending=Boolean(activeTurn);
    const hasContent=draft.value.trim()||media.ready()||references.ready();
    send.disabled=sending ? activeTurn.stopRequested : busy||loadingOlder||uncertain||!modelSetup.ready()||!sessionId||!historyReady||media.pending()||!hasContent;
    send.dataset.state=sending?(activeTurn.stopRequested?'stopping':'stop'):'send';
    send.setAttribute('aria-label',sending?(activeTurn.stopRequested?'Stopping response':'Stop response'):'Send message');
  }
  draft.addEventListener('input',()=>{fitDraft();renderSend();});
  function render() {
    for (const id of controls) if(element(id))element(id).disabled = busy;
    const sending=Boolean(activeTurn);
    if(resetChat)resetChat.disabled=viewingAgent()||busy||loadingOlder||media.pending()||!historyReady||!sessionId;
    if(empty)empty.hidden=!sessionId||!historyReady||!modelSetup.ready()||busy||messageNodes().length>0||providerRequests?.hidden===false;
    renderSend();
    media.render(busy||uncertain||!sessionId||!historyReady);
    references.render(busy||uncertain||!sessionId||!historyReady);
    element('older').hidden = true;
    element('newer').hidden = true;
    renderLatest();
    draft.disabled = !sessionId || !historyReady || busy&&!sending;
  }
  function clearTransientReferences(){
    liveArticle=undefined;liveContent=undefined;progress=undefined;pendingUser=null;
  }
  function markIncomplete(){
    if(!liveArticle||liveArticle.dataset.state==='completed')return;
    liveArticle.dataset.state='incomplete';
    progress.hidden=true;
    liveArticle.hidden=liveContent.hidden;
  }
  function draw() {
    clearTransientReferences();
    const visible = [];
    const cards = [];
    for (const row of rows) {
      const parts = messageParts(row);
      if (!parts.length) continue;
      if (parts[0].kind === 'provider-auth') {cards.push(row); continue;}
      if (row.role === 'user') visible.push(...cards.splice(0));
      visible.push(row);
      if (row.role === 'assistant') visible.push(...cards.splice(0));
    }
    visible.push(...cards);
    replaceMessages(visible.map(row => {
      const article = document.createElement('article');
      article.className = `chat-message ${row.role === 'user' ? 'user-message' : 'assistant-message'}`;
      article.dataset.messageId=String(row.id);
      const author = document.createElement('strong'); author.textContent = row.role === 'user' ? 'You' : assistantName;
      const content = renderMessageContent(row,document,libraries);
      article.append(author,content);
      if(row.role==='assistant'&&row.reaction_target){
        const actions=content.querySelector('.message-actions');
        const reaction=renderReaction(row,document,fetch,sessionId);
        if(actions)actions.prepend(reaction);else article.append(reaction);
      }
      return article;
    }));
  }
  function showPending(input){
    const following=followingLatest(),top=transcript.scrollTop;
    const children=messageNodes();
    keepProviderBeforeReply(children);
    const viewport=transcript.getBoundingClientRect().top;
    const anchor=children.find(child=>{const rect=child.getBoundingClientRect();return (rect.bottom ?? rect.top+100)>viewport;});
    const anchorTop=anchor?.getBoundingClientRect().top;
    pendingUser=document.createElement('article');pendingUser.className='chat-message user-message';pendingUser.dataset.state='pending';
    const author=document.createElement('strong');author.textContent='You';
    const text=input||[media.ready()?'Attachment':'',references.ready()?'Task reference':''].filter(Boolean).join(' · ');
    pendingUser.append(author,renderMessageContent({role:'user',content:text},document,libraries));
    if(children.length>=200)children.splice(anchor===children.at(-1)?0:199,1);
    replaceMessages([...children,pendingUser]);
    if(following)bottom();else{transcript.scrollTop=top+(anchorTop===undefined?0:anchor.getBoundingClientRect().top-anchorTop);observedTop=transcript.scrollTop;}
  }
  function ensureLiveArticle(){
    if(liveArticle)return;
    const following=followingLatest(),top=transcript.scrollTop;
    liveArticle=document.createElement('article');liveArticle.className='chat-message assistant-message';
    liveArticle.dataset.state='waiting';
    const author=document.createElement('strong');author.textContent=assistantName;
    progress=document.createElement('p');progress.className='reply-progress';progress.setAttribute('role','status');
    liveContent=document.createElement('p');liveContent.className='message-content';liveContent.hidden=true;
    liveContent.setAttribute('aria-label','Assistant message');
    liveArticle.append(author,liveContent,progress);
    const children=messageNodes();
    const viewport=transcript.getBoundingClientRect().top;
    const anchor=children.find(child=>{const rect=child.getBoundingClientRect();return (rect.bottom ?? rect.top+100)>viewport;});
    const anchorTop=anchor?.getBoundingClientRect().top;
    if(children.length>=200){const remove=children.findLastIndex(child=>child!==anchor&&child!==pendingUser);children.splice(remove,1);}
    replaceMessages([...children,liveArticle]);
    if(!following&&anchorTop!==undefined){transcript.scrollTop=top+anchor.getBoundingClientRect().top-anchorTop;observedTop=transcript.scrollTop;}
  }
  function showStream(text){
    if(!text)return;
    const following=followingLatest();
    ensureLiveArticle();
    liveArticle.dataset.state='streaming';
    liveContent.hidden=false;
    liveContent.textContent=text;
    if(following)bottom();
  }
  async function api(path, body) {
    const phase=path==='/fixed'?'fixed_session':path.includes('/messages?')?'history':'turn_stream';
    const repeatable=phase==='fixed_session'||phase==='history'&&!body;
    for(let attempt=0;;attempt++){
    const started=Date.now();let response,failureKind;
    try{
    response = await fetch('/api/v1/chat/sessions'+path,{...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(20000)});
    if (!response.ok) {
      const body=await readFailureBody(response);failureKind=classifyFailureBody(body);
      let failure;try{failure=JSON.parse(body);}catch{failure=null;}
      if(response.status===409&&['chat_busy','chat_session_changed','chat_reset_pending'].includes(failure?.error?.code))throw Object.assign(new Error(failure.error.message),{code:failure.error.code});
      if(response.status===400&&['invalid_attachment','invalid_reference'].includes(failure?.error?.code))throw Object.assign(new Error(failure.error.message),{code:failure.error.code});
      throw new Error('Unavailable');
    }
    const result=await response.json();recordRequestDiagnostic(phase,{status:response.status,durationMs:Date.now()-started});return result;
    }catch(error){
      recordRequestDiagnostic(phase,{status:response?.status,durationMs:Date.now()-started,error,failure:failureKind});
      const transient=!['AbortError','TimeoutError'].includes(error.name)&&([502,503,504].includes(response?.status)||!response&&error.name==='TypeError');
      if(!repeatable||!transient||attempt>=2){
        if(repeatable&&(transient||error.name==='TimeoutError'))error.reconnectable=true;
        throw error;
      }
      await new Promise(resolve=>setTimeout(resolve,attempt===0?250:750));
    }
    }
  }
  async function requestStop(turn){
    turn.stopRequested=true;render();showActivity();
    if(!turn.id)return;
    try{await api(`/${encodeURIComponent(sessionId)}/turns/${turn.id}/stop`,{});}
    catch{if(activeTurn!==turn)return;turn.stopRequested=false;render();showActivity();status.textContent='Could not stop the response. Try Stop again.';}
  }
  async function sendTurn(input, fromComposer) {
    const path=`/${encodeURIComponent(sessionId)}`;
    const attachmentIds=fromComposer?media.ids():[];const taskReferences=fromComposer?references.values():[];
    const accepted=await api(`${path}/chat`,{input,...(taskReferences.length?{references:taskReferences}:{}),...(attachmentIds.length?{attachments:attachmentIds}:{})});
    if(!/^[a-f0-9-]{36}$/.test(accepted.turn?.id)||accepted.turn.status!=='pending')throw new Error('Unavailable');
    activeTurn.id=accepted.turn.id;pendingUser.dataset.state='sent';
    if(activeTurn.stopRequested)void requestStop(activeTurn);
    return followTurn(accepted.turn.id);
  }
  async function followTurn(id) {
    const path=`/${encodeURIComponent(sessionId)}`;
    recordChatDiagnostic('streaming');
    let result,displayedLength=0;
    for(let attempt=0;;attempt++){
      try{
        let response;
        try{response=await fetch(`/api/v1/chat/sessions${path}/turns/${id}/events`,{headers:{Accept:'text/event-stream'},signal:AbortSignal.timeout(610000)});}
        catch(error){
          if(error.name==='TypeError')error.code='stream_disconnected';
          throw error;
        }
        if([502,503,504].includes(response.status)){
          await response.body?.cancel();
          throw Object.assign(new Error('Reply connection interrupted.'),{code:'stream_disconnected'});
        }
        result=await consumeTurnStream(response,id,sessionId,text=>{
          // A fresh subscription starts at cursor zero. Keep the visible prefix while it catches up.
          if(text.length<=displayedLength)return;
          displayedLength=text.length;
          showStream(text);showActivity('writing');
        },showActivity);
        break;
      }catch(error){
        if(attempt||authLost||error.code!=='stream_disconnected')throw error;
        showActivity('reconnecting');
      }
    }
    lastStopped=result.turn.status==='stopped';
    recordChatDiagnostic('completed');
        if(liveArticle){const following=followingLatest();const top=transcript.scrollTop;liveArticle.dataset.state='completed';liveArticle.hidden=!messageParts(result.message).length;liveArticle.replaceChildren(liveArticle.firstElementChild,renderMessageContent(result.message,document,libraries));if(following)bottom();else{transcript.scrollTop=top;observedTop=transcript.scrollTop;}}
        return result;
  }
  async function action(work, mutation = false) {
    if (busy) return;
    busy = true;lastStopped=false;status.textContent = mutation ? '' : 'Loading chat…';render();
    recordChatDiagnostic(mutation?'sending':'loading');
    element('chat-retry').hidden=true;
    try {await work();if(!mutation)recordChatDiagnostic('ready');status.textContent = refreshNeeded || olderNotice || (lastStopped?'Response stopped.':sessionId ? '' : 'Start a new chat.');}
    catch(error) {if(error.reconnectable)reconnectNeeded=true;recordChatDiagnostic('failed');status.textContent = ['invalid_attachment','invalid_reference','chat_session_changed','chat_reset_pending'].includes(error.code)?error.message:mutation ? 'Delivery could not be confirmed. Reload the session before sending again.' : error.code==='history_changed' ? refreshNeeded : 'Chat is unavailable. Check the Hermes gateway, then retry.';element('chat-retry').hidden=false;if(mutation&&!['invalid_attachment','invalid_reference'].includes(error.code)){uncertain=true;markIncomplete();}}
    finally {
      busy=false;render();
      if(reconnectQueued)reconnectChat();
    }
  }
  async function history(direction = 'latest') {
    // Jump to latest can finish while an older page is checking its history head.
    const revision=++historyRevision;
    const next = direction === 'older' ? offset+rows.length : direction === 'newer' ? Math.max(0,offset-50) : 0;
    let data,updated;
    try {
      data=await api(`/${encodeURIComponent(sessionId)}/messages?offset=${next}`);
      if(revision!==historyRevision)return false;
    }catch(error){
      if(revision!==historyRevision)return false;
      throw error;
    }
    try {
      validateMessagePage(data.data);
      updated=direction==='latest' ? data.data : mergePage(rows,data.data,direction,direction==='newer' ? Math.min(data.data.length,offset-next) : data.data.length);
      if(direction!=='latest'){
        const latest=await api(`/${encodeURIComponent(sessionId)}/messages?offset=0`);
        if(revision!==historyRevision)return false;
        validateMessagePage(latest.data);
        if(String(latest.data.at(-1)?.id ?? '')!==historyHead)throw Object.assign(new Error('History changed.'),{code:'history_changed'});
      }
    }catch(error){if(revision!==historyRevision)return false;refreshNeeded='History changed. Jump to latest to reload.';throw error;}
    followingLatest();
    const firstMessage=messageNodes()[0];
    const anchorId=firstMessage?.dataset.messageId;
    const anchor = firstMessage?.getBoundingClientRect().top;const top = transcript.scrollTop;
    if (direction === 'latest') {rows=updated;offset=0;older=data.data.length===50;refreshNeeded=false;olderFailed=false;olderNotice='';historyHead=String(data.data.at(-1)?.id ?? '');}
    else if (direction === 'older') {rows=updated;offset=next+data.data.length-rows.length;older=data.data.length===50;}
    else {rows=updated;offset=next;older=true;}
    draw();
    historyReady=true;
    render();
    if (direction === 'older' && anchor !== undefined) transcript.scrollTop=top+(Array.from(transcript.children).find(child=>child.dataset.messageId===anchorId)?.getBoundingClientRect().top ?? anchor)-anchor;
    else transcript.scrollTop=top;
    observedTop=transcript.scrollTop;
    return true;
  }
  function historyFailure(error){olderFailed=true;olderNotice=error.code==='history_changed'?refreshNeeded:'Earlier messages could not be loaded.';status.textContent=olderNotice;element('chat-retry').hidden=false;}
  async function fillUnderfilled(limit=20){
    for(let pages=0;pages<limit&&older&&!refreshNeeded&&!olderFailed&&transcript.scrollHeight<=transcript.clientHeight;pages++){
      try{if(!await history('older'))break;}catch(error){historyFailure(error);break;}
    }
  }
  async function loadOlder(){
    if(loadingOlder||busy||!historyReady||!older||refreshNeeded||olderFailed)return;
    loadingOlder=true;
    try{if(await history('older')){await fillUnderfilled(19);if(!busy)status.textContent=olderNotice;}}
    catch(error){historyFailure(error);}
    finally{loadingOlder=false;render();if(reconnectQueued)reconnectChat();}
  }
  async function initialize() {
    recordChatDiagnostic('connecting');
    reconnectNeeded=false;historyReady=false;
    const data=await api('/fixed',{});
    if(!validSession(data.session))throw new Error('Unavailable');
    if(sessionId&&sessionId!==data.session.id)media.clear();
    sessionId=data.session.id;
    await history();
    await fillUnderfilled();
    bottom();
    if(data.active_turn){
      const turn=data.active_turn;
      if(!/^[a-f0-9-]{36}$/.test(turn.id)||turn.status!=='pending')throw new Error('Unavailable');
      uncertain=true;
      activeTurn={id:turn.id,stopRequested:false};
      keepProviderBeforeReply(messageNodes());
      status.textContent='';
      showActivity('working');
      render();
      try{
        await followTurn(turn.id);
        if(followingLatest()){
          await history();
          await fillUnderfilled();
          if(followingLatest())bottom();
        }else refreshNeeded='New reply available. Jump to latest.';
      }catch(error){
        markIncomplete();
        throw error;
      }finally{activeTurn=null;}
    }
    uncertain=false;
    recordChatDiagnostic('ready');
  }
  function reconnectChat(){
    if(!reconnectNeeded||authLost){reconnectQueued=false;return;}
    if(busy||loadingOlder){reconnectQueued=true;return;}
    reconnectQueued=false;
    void action(initialize);
  }
  document.addEventListener('ned-auth-lost',()=>{authLost=true;reconnectNeeded=false;reconnectQueued=false;});
  document.addEventListener('ned-auth-restored',()=>{
    authLost=false;reconnectNeeded=true;
    reconnectChat();
  });
  globalThis.addEventListener?.('offline',()=>{if(sessionId)reconnectNeeded=true;});
  globalThis.addEventListener?.('online',reconnectChat);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconnectChat();});
  document.addEventListener('ned-agent-session-changed',render);
  resetChat?.addEventListener('click',async()=>{
    if(viewingAgent()||busy||loadingOlder||media.pending()||!historyReady||!sessionId)return;
    if(!globalThis.confirm('Start a fresh chat? Your previous conversation will be kept. This clears your draft and anything attached to it.'))return;
    const notice=element('debug-reset-status');
    busy=true;render();
    notice.textContent='Starting a fresh chat…';
    let changed=false;
    try{
      const data=await api('/reset',{session_id:sessionId});
      if(!validSession(data.session)||data.session.id===sessionId)throw new Error();
      changed=true;
      sessionId=data.session.id;historyReady=false;rows=[];providerAfter=undefined;
      clearTransientReferences();replaceMessages([]);media.clear();references.clear();
      draft.value='';fitDraft();
      await initialize();
      status.textContent='';
      notice.textContent='Fresh chat ready.';
      document.defaultView?.dispatchEvent(new Event('ned-chat-settled'));
    }catch(error){
      notice.textContent=error.code?error.message:changed?'Chat was reset. Reload chat to continue.':'Could not confirm the reset. Reload chat to check the current session.';
      if(changed||error.code==='chat_session_changed'||!error.code)element('chat-retry').hidden=false;
    }finally{busy=false;render();if(reconnectQueued)reconnectChat();}
  });
  element('older').addEventListener('click',()=>void loadOlder());
  element('newer').addEventListener('click',()=>void action(()=>history('newer')));
  element('latest').addEventListener('click',()=>{
    if(document.activeElement===element('latest'))transcript.focus({preventScroll:true});
    if(activeTurn){
      bottom();renderLatest();return;
    }
    void action(async()=>{await history();await fillUnderfilled();bottom();});
  });
  document.addEventListener('ned-provider-chat-changed',()=>{
    if(!activeTurn){
      providerAfter=undefined;
      transcript.append(providerRequests);
    }
    if(historyReady&&followLatest)bottom();
    render();
  });
  element('chat-retry').addEventListener('click',()=>{if(olderFailed&&!refreshNeeded){olderFailed=false;olderNotice='';element('chat-retry').hidden=true;void loadOlder();}else void action(initialize);});
  transcript.addEventListener('scroll',()=>{renderLatest();if(!followingLatest()&&transcript.scrollTop<=80)void loadOlder();});
  transcript.addEventListener('wheel',event=>{if(event.deltaY<0&&transcript.scrollTop<=80)void loadOlder();},{passive:true});
  transcript.addEventListener('keydown',event=>{if(['PageUp','Home','ArrowUp'].includes(event.key)&&transcript.scrollTop<=80)void loadOlder();});
  element('chat-send').addEventListener('click',event=>{if(activeTurn){event.preventDefault();void requestStop(activeTurn);}});
  draft.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.keyCode===229||event.repeat)return;
    event.preventDefault();
    if(!busy&&!uncertain&&!media.pending()&&sessionId&&historyReady&&(draft.value.trim()||media.ready()||references.ready()))element('chat-form').requestSubmit();
  });
  function submitTurn(input, fromComposer) {
    if(busy||loadingOlder||uncertain||authLost||!modelSetup.ready()||!sessionId||!historyReady)return false;
    if(fromComposer&&(media.pending()||!input.trim()&&!media.ready()&&!references.ready()))return false;
    clearTransientReferences();
    activeTurn={id:null,stopRequested:false};showPending(input);showActivity('working');
    if(fromComposer)draft.value='';
    fitDraft();
    void action(async()=>{
      try{
      const data=await sendTurn(input,fromComposer);
      const following=followingLatest();
      if(data.session_id!==sessionId)throw new Error('Unavailable');
      if(fromComposer){media.clear();references.clear();}
      if(following){await history();await fillUnderfilled();if(followingLatest())bottom();}else refreshNeeded='New reply available. Jump to latest.';
      }catch(error){
        void modelSetup.refresh();
        if(fromComposer&&!draft.value)draft.value=input;
        if(pendingUser){if(['invalid_attachment','invalid_reference'].includes(error.code))replaceMessages(messageNodes().filter(row=>row!==pendingUser&&row!==liveArticle));else pendingUser.dataset.state='incomplete';}
        if(['invalid_attachment','invalid_reference'].includes(error.code))clearTransientReferences();
        fitDraft();throw error;
      }
      finally{activeTurn=null;}
      fitDraft();
    },true).then(()=>{
      document.defaultView?.dispatchEvent(new Event('ned-chat-settled'));
      const active=document.activeElement;
      if(!draft.disabled&&(!active||active===document.body||active===draft||active===element('chat-send')))draft.focus({preventScroll:true});
    });
    return true;
  }
  element('chat-form').addEventListener('submit',event=>{
    event.preventDefault();
    submitTurn(draft.value,true);
  });
  document.addEventListener('ned-restart-provider-sign-in',event=>{
    const providers={aws:'AWS',github:'GitHub',godaddy:'GoDaddy'};
    const provider=event.detail?.provider;
    if(Object.hasOwn(providers,provider)
      && submitTurn(`Start a new ${providers[provider]} sign-in.`,false))event.preventDefault();
  });
  fitDraft();render();void action(initialize);
}
