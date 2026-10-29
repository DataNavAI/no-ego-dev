import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {marked} from 'marked';
import {messageParts,renderMessageContent} from '../../../../src/communicator/public/message-content.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';

function dom(){
  const document={createElement(tag){
    const listeners=new Map();
    return {tagName:tag.toUpperCase(),children:[],attributes:new Map(),dataset:{},className:'',
      append(...children){this.children.push(...children);},
      setAttribute(name,value){this.attributes.set(name,String(value));},getAttribute(name){return this.attributes.get(name) ?? null;},removeAttribute(name){this.attributes.delete(name);},
      addEventListener(name,listener){listeners.set(name,listener);},async dispatch(name){return listeners.get(name)?.({preventDefault(){}});},
      get textContent(){return this.text ?? this.children.map(child=>child.textContent).join('');},set textContent(value){this.text=String(value);this.children=[];},
      querySelectorAll(selector){return this.children.flatMap(child=>[...(child.tagName===selector.toUpperCase()?[child]:[]),...(child.querySelectorAll?.(selector) ?? [])]);},
    };
  }};
  return document;
}
function find(root,predicate){
  if(predicate(root))return root;
  for(const child of root.children ?? []){const match=find(child,predicate);if(match)return match;}
}

test('TC-013: mixed Hermes text, tools and unknown JSON remain readable without losing content',()=>{
  const row={role:'assistant',content:JSON.stringify([{type:'text',text:'**Done**'},{type:'tool_use',name:'shell',input:{command:'pwd'}},{type:'tool_result',content:[{type:'text',text:'/synthetic'}]},{unknown:7}]),tool_calls:JSON.stringify([{type:'function',function:{name:'read',arguments:'{"path":"example"}'}}])};
  const parts=messageParts(row);
  assert.deepEqual(parts[0],{kind:'text',text:'**Done**'});
  assert.deepEqual(parts[1],{kind:'tool',name:'shell',label:'Arguments',text:'{\n  "command": "pwd"\n}'});
  assert.match(parts[2].text,/synthetic/);assert.equal(parts[2].label,'Output');
  assert.deepEqual(parts[3],{kind:'data',text:'{\n  "unknown": 7\n}'});
  assert.equal(parts[4].name,'read');assert.match(parts[4].text,/"path": "example"/);
  const code='```json\n{"type":"tool_use"}\n```';
  assert.deepEqual(messageParts({role:'assistant',content:code}),[{kind:'text',text:code}]);
  assert.deepEqual(messageParts({role:'user',content:'**formatted**'}),[{kind:'text',text:'**formatted**'}]);
  assert.deepEqual(messageParts({role:'assistant',content:'not {json'}),[{kind:'text',text:'not {json'}]);
  const huge='x'.repeat(65537);assert.deepEqual(messageParts({role:'assistant',content:huge}),[{kind:'plain',text:huge}]);
  const calls=[{type:'function',function:{name:'retained_tool',arguments:'{"key":"value"}'}}];
  assert.deepEqual(messageParts({role:'assistant',content:huge,tool_calls:calls}),[{kind:'plain',text:huge},{kind:'data',text:JSON.stringify(calls,null,2)}]);
  assert.deepEqual(messageParts({role:'tool',name:'calculator',content:'{"answer":4}'}),[{kind:'tool',name:'calculator',label:'Output',text:'{\n  "answer": 4\n}'}]);
  assert.equal(messageParts({role:'assistant',content:Array(101).fill('small')}).length,1);
  assert.deepEqual(messageParts({role:'assistant',content:'text',tool_calls:huge}).at(-1),{kind:'data',text:huge});
  assert.equal(messageParts({role:'tool',tool_name:'search',content:'{"found":true}'})[0].text,'{\n  "found": true\n}');
  assert.equal(marked.parse('\t\v\n'),'<pre><code>\v\n</code></pre>\n');
  assert.equal(messageParts({role:'user',content:[{type:'text',text:'**formatted**'},{type:'tool_result',content:'result'}]})[0].kind,'text');
});

test('TC-013: user text stays literal while assistant Markdown uses the strict sanitized fragment',()=>{
  const document=dom();let parses=0;let sanitizeOptions;
  const libraries={marked:{parse(text){parses++;return `<h2>${text}</h2>`;}},DOMPurify:{sanitize(_html,options){
    sanitizeOptions=options;const fragment=document.createElement('fragment');
    const heading=document.createElement('h2');heading.textContent='Semantic heading';fragment.append(heading);
    for(const href of ['https://example.test/read','javascript:alert(1)']){const link=document.createElement('a');link.setAttribute('href',href);fragment.append(link);}
    return fragment;
  }}};
  const user=renderMessageContent({role:'user',content:'# literal **text**'},document,libraries);
  assert.equal(parses,0);assert.equal(find(user,node=>node.tagName==='P').textContent,'# literal **text**');assert.equal(user.getAttribute('aria-label'),'User message');
  const literal='[Review](https://example.test/read) and https://example.test/plain';
  const userLink=renderMessageContent({role:'user',content:literal},document,libraries);
  assert.equal(find(userLink,node=>node.tagName==='P').textContent,literal);
  assert.equal(userLink.querySelectorAll('a').length,0,'user punctuation and URLs remain literal');
  const assistant=renderMessageContent({role:'assistant',content:'# formatted'},document,libraries);
  assert.equal(parses,1);assert.equal(find(assistant,node=>node.tagName==='H2').textContent,'Semantic heading');assert.equal(assistant.getAttribute('aria-label'),'Assistant message');
  assert.ok(sanitizeOptions.ALLOWED_TAGS.includes('table'));assert.deepEqual(sanitizeOptions.ALLOWED_ATTR,['href','title','start']);assert.equal(sanitizeOptions.ALLOW_DATA_ATTR,false);assert.equal(sanitizeOptions.ALLOW_ARIA_ATTR,false);
  const links=assistant.querySelectorAll('a');assert.equal(links[0].getAttribute('href'),'https://example.test/read');assert.equal(links[0].getAttribute('rel'),'noopener noreferrer');assert.equal(links[1].getAttribute('href'),null);
});

test('TC-013: tool activity is collapsed and copy activates explicitly with truthful failure',async()=>{
  const document=dom();const writes=[];const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>writes.push(text)}}});
  try{
    const row={role:'assistant',content:[{type:'text',text:'Stored prose'},{type:'tool_use',name:'reader',input:{private:'not copied'}}]};
    const root=renderMessageContent(row,document);
    const details=find(root,node=>node.tagName==='DETAILS');const copy=find(root,node=>node.className==='message-copy');
    assert.equal(details.open,undefined);assert.equal(find(details,node=>node.tagName==='SUMMARY').textContent,'Tool: reader');assert.match(details.textContent,/not copied/);
    assert.deepEqual(writes,[]);await copy.dispatch('click');assert.deepEqual(writes,['Stored prose']);assert.equal(copy.getAttribute('aria-label'),'Message copied');assert.equal(find(root,node=>node.className==='message-copy-status').textContent,'Copied');
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw new Error('denied');}}}});
    await copy.dispatch('click');assert.equal(copy.dataset.state,'failed');assert.equal(copy.getAttribute('aria-label'),'Copy failed. Try again');assert.equal(copy.tagName,'BUTTON');assert.equal(find(root,node=>node.className==='message-copy-status').textContent,'Copy failed. Try again.');
  }finally{
    if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;
  }
});

test('TC-013: structured history metadata and pinned browser modules cross the real HTTP boundary',async t=>{
  const content=[{type:'text',text:'Hello'},{type:'tool_use',name:'read',input:{path:'synthetic'}}];
  const gateway=http.createServer((req,res)=>res.end(JSON.stringify({data:[{id:1,role:'assistant',content,tool_calls:'[]',tool_name:'read',name:'calculator',tool_call_id:'call1',reasoning:'private',unexpected:'private'}]})));
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>gateway.close(resolve)));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
  const response=await fetch(app.url+'/api/chat/sessions/s1/messages');
  assert.deepEqual(await response.json(),{data:[{id:1,role:'assistant',content,tool_calls:'[]',tool_name:'read',name:'calculator',tool_call_id:'call1'}]});
  for(const asset of ['/vendor/marked.js','/vendor/dompurify.js','/message-content.js']){
    const resource=await fetch(app.url+asset);assert.equal(resource.status,200);assert.match(resource.headers.get('content-type'),/text\/javascript/);assert.match(resource.headers.get('content-security-policy'),/script-src 'self'/);assert.ok((await resource.text()).length>100);
  }
  assert.equal((await fetch(app.url+'/vendor/package.json')).status,404);
});


test('TC-013: bounded structured fallbacks remain lossless without copying tool payloads',async t=>{
  const tool={type:'tool_use',name:'reader',input:{private:'not-copyable'}};
  const cases=[
    ['part cap',[{type:'text',text:'Visible prose'},...Array.from({length:100},()=>tool),{unknown:'retained'}]],
    ['byte cap',JSON.stringify([{type:'text',text:'Visible prose'},tool,{unknown:'retained',padding:'x'.repeat(65536)}])],
  ];
  for(const [name,content] of cases)await t.test(name,()=>{
    const root=renderMessageContent({role:'assistant',content},dom());
    assert.match(root.textContent,/not-copyable/);
    assert.match(root.textContent,/retained/);
    assert.equal(find(root,node=>node.className==='message-copy'),undefined,'unsafe-to-separate fallback has no prose-copy action');
  });
});
