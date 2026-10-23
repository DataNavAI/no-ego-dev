import {validateMessagePage} from './history.js';
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

export function mountChat() {
  const element = id => document.getElementById(id);
  const transcript = element('transcript');
  const sessions = element('sessions');
  const status = element('chat-status');
  const draft = element('chat-message');
  let busy = false;
  let uncertain = false;
  let sessionId = '';
  let rows = [];
  let offset = 0;
  let older = false;
  let sessionOffset = 0;
  let refreshNeeded = false;
  let historyHead = null;
  const controls = ['sessions','new-chat','more-sessions','older','newer','latest','chat-send','chat-retry'];
  const atBottom = () => transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop < 64;
  const bottom = smooth => transcript.scrollTo({top:transcript.scrollHeight,behavior:smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant'});
  function render() {
    for (const id of controls) element(id).disabled = busy;
    element('chat-send').disabled = busy || uncertain || !sessionId;
    element('older').hidden = !older || Boolean(refreshNeeded);
    element('newer').hidden = offset === 0 || Boolean(refreshNeeded);
    element('latest').hidden = !sessionId;
    draft.disabled = !sessionId || busy;
  }
  function draw() {
    transcript.replaceChildren(...rows.map(row => {
      const article = document.createElement('article');
      article.className = 'chat-message';
      const author = document.createElement('strong'); author.textContent = row.role === 'user' ? 'You' : row.role === 'assistant' ? 'Hermes' : 'Tool';
      const content = document.createElement('p'); content.textContent = row.content;
      article.append(author,content);return article;
    }));
  }
  function adoptSession(id) {
    sessionId=id;
    if (![...sessions.options].some(option=>option.value===id)) sessions.add(new Option('Untitled chat',id));
    sessions.value=id;
  }
  async function api(path, body) {
    const response = await fetch('/api/chat/sessions'+path,{...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(body && path.endsWith('/chat') ? 610000 : 20000)});
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }
  async function action(work, mutation = false) {
    if (busy) return;
    busy = true;status.textContent = mutation ? 'Hermes is responding…' : 'Loading chat…';render();
    try {await work();status.textContent = refreshNeeded || (sessionId ? '' : 'Start a new chat.');}
    catch(error) {status.textContent = mutation ? 'Delivery could not be confirmed. Reload the session before sending again.' : error.code==='history_changed' ? refreshNeeded : 'Chat is unavailable. Check the Hermes gateway, then retry.';if(mutation)uncertain=true;}
    finally {busy=false;render();}
  }
  async function list(reset = false) {
    const next = reset ? 0 : sessionOffset;
    const data = await api(`?offset=${next}`);
    if (reset) sessions.replaceChildren(new Option('Choose a session',''));
    for (const row of data.data) if (![...sessions.options].some(option => option.value === row.id)) sessions.add(new Option(row.title,row.id));
    sessionOffset = next + 50;
    element('more-sessions').hidden = !data.has_more;
    if(sessionId)adoptSession(sessionId);
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
    if (direction === 'older' && anchor !== undefined) transcript.scrollTop=top+(transcript.children[data.data.length]?.getBoundingClientRect().top ?? anchor)-anchor;
    else transcript.scrollTop=top;
  }
  sessions.addEventListener('change',() => {
    if(busy)return;
    sessionId=sessions.value;rows=[];offset=0;older=false;uncertain=false;refreshNeeded=false;draft.value='';draw();render();
    if(sessionId)void action(async()=>{await history();bottom(false);});
  });
  element('new-chat').addEventListener('click',()=>void action(async()=>{
    const data=await api('',{});adoptSession(data.session.id);rows=[];offset=0;older=false;uncertain=false;refreshNeeded=false;draft.value='';draw();await list(true);render();
  }).then(()=>{if(sessionId&&!uncertain)draft.focus();}));
  element('more-sessions').addEventListener('click',()=>void action(()=>list()));
  element('older').addEventListener('click',()=>void action(()=>history('older')));
  element('newer').addEventListener('click',()=>void action(()=>history('newer')));
  element('latest').addEventListener('click',()=>void action(async()=>{await history();bottom(true);}));
  element('chat-retry').addEventListener('click',()=>void action(async()=>{await list(true);if(sessionId)await history();uncertain=false;}));
  element('chat-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy||uncertain||!sessionId||!draft.value.trim())return;
    const input=draft.value;
    void action(async()=>{
      const data=await api(`/${encodeURIComponent(sessionId)}/chat`,{input});
      const following=atBottom();
      if(data.session_id && data.session_id!==sessionId)adoptSession(data.session_id);
      if(following){await history();bottom(true);}else refreshNeeded='New reply available. Select Latest.';
      draft.value='';
    },true);
  });
  const mobileView=element('mobile-view');
  mobileView.addEventListener('change',()=>{document.querySelector('.shell').dataset.view=mobileView.value;});
  render();void action(()=>list(true));
}
