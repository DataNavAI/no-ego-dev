import {validateMessagePage} from './history.js';
import {renderMessageContent} from './message-content.js';
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
  const controls = ['older','newer','latest','chat-send','chat-retry'];
  const atBottom = () => transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop < 64;
  const bottom = smooth => transcript.scrollTo({top:transcript.scrollHeight,behavior:smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant'});
  function render() {
    for (const id of controls) if(element(id))element(id).disabled = busy;
    element('chat-send').disabled = busy || uncertain || !sessionId || !historyReady;
    element('older').hidden = !older || Boolean(refreshNeeded);
    element('newer').hidden = offset === 0 || Boolean(refreshNeeded);
    element('latest').hidden = !sessionId || (!rows.length && !refreshNeeded && offset === 0);
    draft.disabled = !sessionId || busy || !historyReady;
  }
  function draw() {
    transcript.replaceChildren(...rows.map(row => {
      const article = document.createElement('article');
      article.className = `chat-message ${row.role === 'user' ? 'user-message' : 'assistant-message'}`;
      const author = document.createElement('strong'); author.textContent = row.role === 'user' ? 'You' : row.role === 'assistant' ? 'Hermes' : 'Tool';
      const content = renderMessageContent(row,document,libraries);
      article.append(author,content);return article;
    }));
  }
  async function api(path, body) {
    const response = await fetch('/api/chat/sessions'+path,{...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }
  async function sendTurn(input) {
    const path=`/${encodeURIComponent(sessionId)}`;
    const accepted=await api(`${path}/chat`,{input});
    if(!/^[a-f0-9-]{36}$/.test(accepted.turn?.id)||accepted.turn.status!=='pending')throw new Error('Unavailable');
    const deadline=Date.now()+600000;
    while(Date.now()<deadline){
      const result=await api(`${path}/turns/${accepted.turn.id}`);
      if(result.turn?.id!==accepted.turn.id)throw new Error('Unavailable');
      if(result.turn.status==='completed')return result;
      if(result.turn.status!=='pending')throw new Error('Unavailable');
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    throw new Error('Unavailable');
  }
  async function action(work, mutation = false) {
    if (busy) return;
    busy = true;status.textContent = mutation ? 'Hermes is responding…' : 'Loading chat…';render();
    element('chat-retry').hidden=true;
    try {await work();status.textContent = refreshNeeded || (sessionId ? '' : 'Start a new chat.');}
    catch(error) {status.textContent = mutation ? 'Delivery could not be confirmed. Reload the session before sending again.' : error.code==='history_changed' ? refreshNeeded : 'Chat is unavailable. Check the Hermes gateway, then retry.';element('chat-retry').hidden=false;if(mutation)uncertain=true;}
    finally {busy=false;render();}
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
    }catch(error){refreshNeeded='History changed. Select Latest to reload.';throw error;}
    const anchor = transcript.firstElementChild?.getBoundingClientRect().top;const top = transcript.scrollTop;
    if (direction === 'latest') {rows=updated;offset=0;older=data.data.length===50;refreshNeeded=false;historyHead=String(data.data.at(-1)?.id ?? '');}
    else if (direction === 'older') {rows=updated;offset=next+data.data.length-rows.length;older=data.data.length===50;}
    else {rows=updated;offset=next;older=true;}
    draw();
    historyReady=true;
    if (direction === 'older' && anchor !== undefined) transcript.scrollTop=top+(transcript.children[data.data.length]?.getBoundingClientRect().top ?? anchor)-anchor;
    else transcript.scrollTop=top;
  }
  async function initialize() {
    historyReady=false;
    const data=await api('/fixed',{});
    if(data.session?.id!=='nedcom-main'||data.session.title!=='NED Chat'||data.session.source!=='api_server')throw new Error('Unavailable');
    sessionId=data.session.id;
    await history();
    uncertain=false;
    bottom(false);
  }
  element('older').addEventListener('click',()=>void action(()=>history('older')));
  element('newer').addEventListener('click',()=>void action(()=>history('newer')));
  element('latest').addEventListener('click',()=>void action(async()=>{await history();bottom(true);}));
  element('chat-retry').addEventListener('click',()=>void action(initialize));
  draft.addEventListener('keydown',event=>{
    if(event.key!=='Enter'||event.shiftKey||event.isComposing||event.keyCode===229||event.repeat)return;
    event.preventDefault();
    if(!busy&&!uncertain&&sessionId&&historyReady&&draft.value.trim())element('chat-form').requestSubmit();
  });
  element('chat-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy||uncertain||!sessionId||!historyReady||!draft.value.trim())return;
    const input=draft.value;
    void action(async()=>{
      const data=await sendTurn(input);
      const following=atBottom();
      if(data.session_id!==sessionId)throw new Error('Unavailable');
      if(following){await history();bottom(true);}else refreshNeeded='New reply available. Select Latest.';
      draft.value='';
    },true).then(()=>{
      const active=document.activeElement;
      if(!draft.disabled&&(!active||active===document.body||active===draft||active===element('chat-send')))draft.focus({preventScroll:true});
    });
  });
  render();void action(initialize);
}
