import test from 'node:test';
import assert from 'node:assert/strict';
import {chatHarness} from './chat-harness.js';

const page=(start,count=50)=>Array.from({length:count},(_,index)=>({id:start+index,role:'assistant',content:`Message ${start+index}`}));
async function selected(options){const harness=await chatHarness(options);await harness.respond({data:[{id:'session-a',title:'Chat A'},{id:'session-b',title:'Chat B'}],has_more:false});await harness.select('session-a',page(950));return harness;}

test('TC-010: controller sends once, preserves failed draft and reconciles before another send',async()=>{
  const harness=await selected();const {elements,requests,respond}=harness;
  elements.get('chat-message').value='Retain this message';
  elements.get('chat-form').dispatch('submit');elements.get('chat-form').dispatch('submit');
  assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].options.body).input,'Retain this message');
  assert.equal(elements.get('sessions').disabled,true);assert.equal(elements.get('chat-send').disabled,true);
  await respond({message:{content:'Delivered'},session_id:'session-a'});
  assert.equal(requests[0].url,'/api/chat/sessions/session-a/messages?offset=0');
  await respond({},503);
  assert.equal(elements.get('chat-message').value,'Retain this message');assert.equal(elements.get('chat-send').disabled,true);
  elements.get('chat-form').dispatch('submit');assert.equal(requests.length,0);
  elements.get('chat-retry').dispatch('click');
  await respond({data:[{id:'session-a',title:'Chat A'}],has_more:false});await respond({data:page(952)});
  assert.equal(elements.get('chat-send').disabled,false);assert.equal(requests.length,0);
});

test('TC-010: controller preserves a reader during a reply and clears old transcript on session switch',async()=>{
  const {elements,requests,respond}=await selected();
  const transcript=elements.get('transcript');const previous=transcript.textContent;
  elements.get('chat-message').value='Reply later';elements.get('chat-form').dispatch('submit');
  transcript.scrollTop=0;
  await respond({message:{content:'Reply'},session_id:'session-a'});
  assert.equal(transcript.textContent,previous);assert.equal(transcript.scrollTop,0);assert.equal(requests.length,0);
  assert.equal(elements.get('older').hidden,true);assert.match(elements.get('chat-status').textContent,/New reply/);
  elements.get('latest').dispatch('click');await respond({data:page(952)});
  assert.equal(transcript.scrollCalls.at(-1).behavior,'smooth');assert.equal(elements.get('older').hidden,false);
  elements.get('sessions').value='session-b';elements.get('sessions').dispatch('change');
  assert.equal(transcript.children.length,0);assert.equal(requests[0].url,'/api/chat/sessions/session-b/messages?offset=0');
  await respond({data:page(10,1)});assert.equal(transcript.textContent,'HermesMessage 10');
});

test('TC-010: controller pages partial history without duplicates and honors reduced motion',async()=>{
  const {elements,requests,respond}=await selected({reducedMotion:true});
  const transcript=elements.get('transcript');
  for(const [offset,rows] of [[50,page(900)],[100,page(850)],[150,page(800)],[200,page(775,25)]]){
    elements.get('older').dispatch('click');assert.equal(requests[0].url,`/api/chat/sessions/session-a/messages?offset=${offset}`);await respond({data:rows});await respond({data:page(950)});assert.ok(transcript.children.length<=200);
  }
  assert.equal(elements.get('older').hidden,true);
  elements.get('newer').dispatch('click');assert.equal(requests[0].url,'/api/chat/sessions/session-a/messages?offset=0');await respond({data:page(950)});await respond({data:page(950)});
  const contents=transcript.children.map(article=>article.children[1].textContent);
  assert.equal(new Set(contents).size,200);assert.equal(contents[0],'Message 800');assert.equal(contents.at(-1),'Message 999');
  elements.get('latest').dispatch('click');await respond({data:page(950)});
  assert.equal(transcript.scrollCalls.at(-1).behavior,'instant');
});

test('TC-010: controller paginates session identities and treats hostile content as text',async()=>{
  const {elements,requests,respond,select,shell}=await chatHarness();
  await respond({data:[{id:'opaque-a',title:'<script>unsafe title</script>'}],has_more:true});
  elements.get('more-sessions').dispatch('click');assert.equal(requests[0].url,'/api/chat/sessions?offset=50');
  await respond({data:[{id:'opaque-a',title:'duplicate'},{id:'opaque-b',title:'Second'}],has_more:false});
  assert.deepEqual(Array.from(elements.get('sessions').options,option=>option.value),['','opaque-a','opaque-b']);
  await select('opaque-a',[{id:1,role:'assistant',content:'<img src=x onerror=alert(1)>'}]);
  assert.equal(elements.get('transcript').children[0].children[1].textContent,'<img src=x onerror=alert(1)>');
  elements.get('mobile-view').value='project';elements.get('mobile-view').dispatch('change');
  assert.equal(shell.dataset.view,'project');
  assert.equal(elements.get('more-sessions').hidden,true);
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
  assert.equal(requests[0].url,'/api/chat/sessions/session-a/messages?offset=0');
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
