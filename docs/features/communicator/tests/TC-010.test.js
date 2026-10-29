import test from 'node:test';
import assert from 'node:assert/strict';
import {chatHarness} from './chat-harness.js';

const page=(start,count=50)=>Array.from({length:count},(_,index)=>({id:start+index,role:'assistant',content:`Message ${start+index}`}));
const turnId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
test('TC-010: send restores composer focus after settlement without stealing intentionally moved focus',async()=>{
  for(const moved of [false,true]){
    const {elements,document,respond}=await selected();const draft=elements.get('chat-message');
    draft.value='Focus after send';elements.get('chat-send').focus();
    elements.get('chat-form').dispatch('submit');
    if(moved)elements.get('transcript').focus();
    await respond({turn:{id:turnId,status:'pending'}},202);
    await respond({turn:{id:turnId,status:'completed'},message:{content:'Done'},session_id:'nedcom-main'});
    await respond({data:page(952)});
    assert.equal(document.activeElement,moved?elements.get('transcript'):draft);
    assert.equal(draft.disabled,false);
  }
});
test('TC-010: startup ensures the canonical session before history and Reload recovers',async()=>{
  const existing=await chatHarness();
  assert.equal(existing.requests[0]?.url,'/api/chat/sessions/fixed');
  assert.deepEqual(JSON.parse(existing.requests[0].options.body),{});
  await existing.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  assert.equal(existing.requests[0]?.url,'/api/chat/sessions/nedcom-main/messages?offset=0');
  assert.equal(existing.elements.get('chat-message').disabled,true);
  await existing.respond({data:page(1,1)});
  assert.equal(existing.elements.get('chat-message').disabled,false);
  const failed=await chatHarness();await failed.respond({},503);
  assert.equal(failed.elements.get('chat-message').disabled,true);
  failed.elements.get('chat-retry').dispatch('click');
  await failed.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  await failed.respond({data:[]});assert.equal(failed.elements.get('chat-message').disabled,false);
  const historyFailure=await chatHarness();
  await historyFailure.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  await historyFailure.respond({},503);
  assert.equal(historyFailure.elements.get('chat-message').disabled,true);
  assert.equal(historyFailure.elements.get('chat-send').disabled,true);
  historyFailure.elements.get('chat-message').value='Do not send without history';
  historyFailure.elements.get('chat-form').dispatch('submit');
  assert.equal(historyFailure.requests.length,0);
  historyFailure.elements.get('chat-retry').dispatch('click');
  await historyFailure.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  assert.equal(historyFailure.requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=0');
  await historyFailure.respond({data:[]});
  assert.equal(historyFailure.elements.get('chat-message').disabled,false);
});

test('TC-010: Enter sends once while newline, composition, held keys and empty drafts never send',async()=>{
  const {elements,requests,respond}=await selected();const draft=elements.get('chat-message');draft.value='Keyboard message';
  for(const details of [{key:'Enter',shiftKey:true},{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'Enter',repeat:true},{key:'a'}]){
    const event=draft.dispatch('keydown',details);assert.equal(Boolean(event.defaultPrevented),false);assert.equal(requests.length,0);
  }
  draft.value='   ';draft.dispatch('keydown',{key:'Enter'});assert.equal(requests.length,0);
  draft.value='Keyboard message';assert.equal(draft.dispatch('keydown',{key:'Enter'}).defaultPrevented,true);
  assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].options.body).input,'Keyboard message');
  draft.dispatch('keydown',{key:'Enter'});assert.equal(requests.length,1);
  await respond({},503);assert.equal(elements.get('chat-send').disabled,true);
  draft.dispatch('keydown',{key:'Enter'});assert.equal(requests.length,0);assert.equal(draft.value,'Keyboard message');
});
async function selected(options){const harness=await chatHarness(options);await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await harness.respond({data:page(950)});return harness;}

test('TC-010: controller sends once, preserves failed draft and reconciles before another send',async()=>{
  const harness=await selected();const {elements,requests,respond}=harness;
  elements.get('chat-message').value='Retain this message';
  elements.get('chat-form').dispatch('submit');elements.get('chat-form').dispatch('submit');
  assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].options.body).input,'Retain this message');
  assert.equal(elements.get('chat-send').disabled,true);
  await respond({turn:{id:turnId,status:'pending'}},202);
  await respond({turn:{id:turnId,status:'completed'},message:{content:'Delivered'},session_id:'nedcom-main'});
  assert.equal(requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=0');
  await respond({},503);
  assert.equal(elements.get('chat-message').value,'Retain this message');assert.equal(elements.get('chat-send').disabled,true);
  elements.get('chat-form').dispatch('submit');assert.equal(requests.length,0);
  elements.get('chat-retry').dispatch('click');
  await respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await respond({data:page(952)});
  assert.equal(elements.get('chat-send').disabled,false);assert.equal(requests.length,0);
});

test('TC-010: controller preserves a reader during a reply until Latest reconciles',async()=>{
  const {elements,requests,respond}=await selected();
  const transcript=elements.get('transcript');const previous=transcript.textContent;
  elements.get('chat-message').value='Reply later';elements.get('chat-form').dispatch('submit');
  transcript.scrollTop=0;
  await respond({turn:{id:turnId,status:'pending'}},202);
  await respond({turn:{id:turnId,status:'completed'},message:{content:'Reply'},session_id:'nedcom-main'});
  assert.equal(transcript.textContent,previous);assert.equal(transcript.scrollTop,0);assert.equal(requests.length,0);
  assert.equal(elements.get('older').hidden,true);assert.match(elements.get('chat-status').textContent,/New reply/);
  elements.get('latest').dispatch('click');await respond({data:page(952)});
  assert.equal(transcript.scrollCalls.at(-1).behavior,'smooth');assert.equal(elements.get('older').hidden,false);
});

test('TC-010: controller pages partial history without duplicates and honors reduced motion',async()=>{
  const {elements,requests,respond}=await selected({reducedMotion:true});
  const transcript=elements.get('transcript');
  for(const [offset,rows] of [[50,page(900)],[100,page(850)],[150,page(800)],[200,page(775,25)]]){
    elements.get('older').dispatch('click');assert.equal(requests[0].url,`/api/chat/sessions/nedcom-main/messages?offset=${offset}`);await respond({data:rows});await respond({data:page(950)});assert.ok(transcript.children.length<=200);
  }
  assert.equal(elements.get('older').hidden,true);
  elements.get('newer').dispatch('click');assert.equal(requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=0');await respond({data:page(950)});await respond({data:page(950)});
  const contents=transcript.children.map(article=>article.children[1].textContent);
  assert.equal(new Set(contents).size,200);assert.equal(contents[0],'Message 800');assert.equal(contents.at(-1),'Message 999');
  elements.get('latest').dispatch('click');await respond({data:page(950)});
  assert.equal(transcript.scrollCalls.at(-1).behavior,'instant');
});

test('TC-010: controller treats hostile message content as text at the renderer boundary',async()=>{
  const {elements,respond}=await chatHarness();
  await respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});
  await respond({data:[{id:1,role:'assistant',content:'<img src=x onerror=alert(1)>'}]});
  assert.equal(elements.get('transcript').children[0].children[1].textContent,'<img src=x onerror=alert(1)>');
});

test('TC-010: shifted history is rejected without changing the reader and Latest reconciles',async()=>{
  const {elements,requests,respond}=await selected();const transcript=elements.get('transcript');
  transcript.scrollTop=120;const previous=transcript.textContent;
  elements.get('older').dispatch('click');await respond({data:page(925)});
  assert.equal(transcript.children.length,50);assert.equal(transcript.textContent,previous);assert.equal(transcript.scrollTop,120);
  assert.match(elements.get('chat-status').textContent,/History changed/);assert.equal(elements.get('older').hidden,true);assert.equal(elements.get('newer').hidden,true);assert.equal(requests.length,0);
  elements.get('latest').dispatch('click');await respond({data:page(975)});
  assert.equal(elements.get('older').hidden,false);assert.equal(transcript.children.length,50);
  elements.get('older').dispatch('click');await respond({data:page(925)});await respond({data:page(975)});
  assert.equal(transcript.children.length,100);assert.equal(new Set(transcript.children.map(article=>article.children[1].textContent)).size,100);
});

test('TC-010: a full-page external append is detected by the retained history head',async()=>{
  const {elements,respond,requests}=await selected();const transcript=elements.get('transcript');const previous=transcript.textContent;
  elements.get('older').dispatch('click');await respond({data:page(1000)});
  assert.equal(requests[0].url,'/api/chat/sessions/nedcom-main/messages?offset=0');
  await respond({data:page(1050)});
  assert.equal(transcript.textContent,previous);assert.equal(transcript.children.length,50);assert.match(elements.get('chat-status').textContent,/History changed/);
  assert.equal(elements.get('older').hidden,true);
});

test('TC-010: repeated or missing message IDs never replace a valid transcript',async()=>{
  const {elements,respond}=await selected();const transcript=elements.get('transcript');const previous=transcript.textContent;
  for(const data of [[{id:1,content:'a'},{id:1,content:'b'}],[{content:'missing identity'}]]){
    elements.get('latest').dispatch('click');await respond({data});
    assert.equal(transcript.textContent,previous);assert.match(elements.get('chat-status').textContent,/History changed/);
  }
});

test('TC-010: pending HTTP turn never replays and unknown terminal status preserves draft until Reload',async()=>{
  const {elements,requests,respond,tick}=await selected();
  elements.get('chat-message').value='Long-running request';elements.get('chat-form').dispatch('submit');
  const accepted=await respond({turn:{id:turnId,status:'pending'}},202);
  assert.equal(accepted.options.method,'POST');
  assert.equal(requests[0].url,`/api/chat/sessions/nedcom-main/turns/${turnId}`);
  await respond({turn:{id:turnId,status:'pending'}});
  assert.equal(requests.length,0);assert.equal(elements.get('chat-send').disabled,true);
  elements.get('chat-form').dispatch('submit');assert.equal(requests.length,0);
  await tick();
  await respond({error:{code:'not_found'}},404);
  assert.equal(elements.get('chat-message').value,'Long-running request');assert.match(elements.get('chat-status').textContent,/Delivery could not be confirmed/);
  elements.get('chat-form').dispatch('submit');assert.equal(requests.length,0);assert.equal(elements.get('chat-send').disabled,true);
});
