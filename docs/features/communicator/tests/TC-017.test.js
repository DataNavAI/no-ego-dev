import test from 'node:test';
import {endStream} from './stream-fixtures.js';
import assert from 'node:assert/strict';
import http from 'node:http';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {createAttachmentStore,validateAttachment} from '../../../../src/communicator/attachments.js';
import {insertLink} from '../../../../src/communicator/public/composer-media.js';
import {projectHistoryMessage} from '../../../../src/communicator/chat-history.js';
import {pdfFixture,docxFixture} from './media-fixtures.js';
import {chatHarness} from './chat-harness.js';
function uploadRequest(name,mime,data){const request=Readable.from([data]);request.headers={'x-ned-filename':encodeURIComponent(name),'content-type':mime};return request;}

test('TC-017: real isolated PDF/DOCX and image parsers create single-use context-bound receipts',async()=>{
  let clock=0;const store=createAttachmentStore({now:()=>clock});
  try{
    for(const [name,mime,data,expected]of [
      ['report.pdf','application/pdf',pdfFixture(),'Synthetic PDF report'],
      ['report.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docxFixture(),'Synthetic DOCX report'],
      ['report.md','text/markdown',Buffer.from('# A report'),'# A report'],
    ]){
      const receipt=await store.upload(uploadRequest(name,mime,data),'s1','private-context');
      assert.equal(receipt.name,name);assert.match(receipt.id,/^[a-f0-9-]{36}$/);
      assert.throws(()=>store.prepare([receipt.id],'s2','private-context',''),/expired/);
      assert.throws(()=>store.prepare([receipt.id],'s1','rotated',''),/expired/);
      const prepared=store.prepare([receipt.id],'s1','private-context','');assert.equal(prepared.input[0].type,'text');assert.match(prepared.input[0].text,new RegExp(expected.replace('#','\\#')));
      prepared.consume();assert.throws(()=>store.prepare([receipt.id],'s1','private-context',''),/already sent/);
    }
    for(const [extension,mime]of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp']]){
      const buffer=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).toFormat(extension).toBuffer();
      const receipt=await store.upload(uploadRequest(`image.${extension}`,mime,buffer),'s1','ctx');
      const {input}=store.prepare([receipt.id],'s1','ctx','Look');assert.equal(input[0].text,'Look');assert.equal(input[1].type,'image_url');assert.match(input[1].image_url.url,new RegExp(`^data:${mime};base64,`));
      clock=900000;assert.throws(()=>store.prepare([receipt.id],'s1','ctx','Look'),/expired/);clock=0;
    }
  }finally{store.close();}
});

test('TC-017: invalid signatures, corrupt documents, external DOCX links, text and archive bombs reject safely',async()=>{
  const store=createAttachmentStore();
  try{
    for(const [name,mime,data]of [
      ['bad.png','image/png',Buffer.from('<svg/>')],['bad.pdf','application/pdf',Buffer.from('%PDF-not-real')],
      ['bad.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',Buffer.from([80,75,3,4])],
      ['external.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docxFixture('safe',{'word/_rels/document.xml.rels':'<Relationships><Relationship TargetMode="External" Target="file:///private"/></Relationships>'})],
      ['large.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docxFixture('x'.repeat(131073))],
      ['invalid.json','application/json',Buffer.from('not-json')],['invalid.txt','text/plain',Buffer.from([255])],['empty.txt','text/plain',Buffer.alloc(0)],
      ['large.txt','text/plain',Buffer.alloc(4194305)],['data.html','text/html',Buffer.from('<script/>')],['../x.txt','text/plain',Buffer.from('no')],
    ])await assert.rejects(store.upload(uploadRequest(name,mime,data),'s1','ctx'),undefined,name);
    const corrupt=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer();corrupt.fill(255,50,65);
    await assert.rejects(store.upload(uploadRequest('corrupt.png','image/png',corrupt),'s1','ctx'));
    assert.throws(()=>validateAttachment('x.png','image/jpeg',corrupt),/Unsupported/);
    const receipt=await store.upload(uploadRequest('okay.txt','text/plain',Buffer.from('text')),'s1','ctx');
    assert.throws(()=>store.prepare([receipt.id,receipt.id],'s1','ctx',''),/four/);
    assert.throws(()=>store.prepare(Array(5).fill('unknown'),'s1','ctx',''),/four/);
    const long=await store.upload(uploadRequest('long.txt','text/plain',Buffer.from('x'.repeat(131072))),'s1','ctx');
    const parts=store.prepare([long.id],'s1','ctx','').input;
    assert.ok(parts.every(part=>part.text.length<=60000));assert.equal(parts.map(part=>part.text).join(''),'Attachment: long.txt\n'+'x'.repeat(131072));
    const bomb=docxFixture();const central=bomb.indexOf(Buffer.from([80,75,1,2]));bomb.writeUInt32LE(100000000,central+24);
    await assert.rejects(store.upload(uploadRequest('bomb.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',bomb),'s1','ctx'));
  }finally{store.close();}
});

test('TC-017: receipt capacity, in-flight uploads and aggregate image bytes remain bounded',async()=>{
  const store=createAttachmentStore();
  try{
    const blocked=[];
    for(let index=0;index<2;index++){let release;const barrier=new Promise(resolve=>release=resolve);const request=Readable.from((async function*(){await barrier;yield Buffer.from('data');})());request.headers={'x-ned-filename':'file.txt','content-type':'text/plain'};blocked.push({release,result:store.upload(request,'s','ctx')});}
    await assert.rejects(store.upload(uploadRequest('extra.txt','text/plain',Buffer.from('data')),'s','ctx'),/busy/);
    for(const upload of blocked)upload.release();await Promise.all(blocked.map(upload=>upload.result));
    for(let index=0;index<30;index++)await store.upload(uploadRequest('file.txt','text/plain',Buffer.from('data')),'s','ctx');
    await assert.rejects(store.upload(uploadRequest('extra.txt','text/plain',Buffer.from('data')),'s','ctx'),/busy/);
  }finally{store.close();}
  const images=createAttachmentStore();
  try{
    const data=await sharp(randomBytes(700*700*3),{raw:{width:700,height:700,channels:3}}).png().toBuffer();
    const first=await images.upload(uploadRequest('a.png','image/png',data),'s','ctx');
    const second=await images.upload(uploadRequest('b.png','image/png',data),'s','ctx');
    assert.throws(()=>images.prepare([first.id,second.id],'s','ctx',''),/2 MB/);
    assert.equal(images.prepare([first.id],'s','ctx','').input[0].type,'image_url');
  }finally{images.close();}
});

test('TC-017: real COM upload perimeter and multimodal turn reject replay without upstream side effects',async t=>{
  const calls=[];let key='synthetic';
  const gateway=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    calls.push({path:req.url,body:JSON.parse(body)});endStream(res,'s1','Confirmed');
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{env:{NED_HERMES_URL:`http://127.0.0.1:${gateway.address().port}`,get NED_HERMES_API_KEY(){return key;}}}});await app.listen();t.after(()=>app.close());
  const upload=(headers={})=>fetch(app.url+'/api/chat/sessions/s1/attachments',{method:'POST',headers:{Origin:app.url,'Content-Type':'text/plain','X-NED-Filename':'report.txt',...headers},body:'Synthetic document'});
  for(const headers of [{Origin:'https://foreign.test'},{Origin:''},{'Content-Type':'image/png'}])assert.ok((await upload(headers)).status>=400);
  assert.equal(calls.length,0);
  const response=await upload();assert.equal(response.status,201);const {attachment}=await response.json();
  const send=(session,ids)=>fetch(`${app.url}/api/chat/sessions/${session}/chat`,{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({input:'',attachments:ids})});
  assert.equal((await send('s2',[attachment.id])).status,400);key='rotated';assert.equal((await send('s1',[attachment.id])).status,400);key='synthetic';assert.equal(calls.length,0);
  const accepted=await send('s1',[attachment.id]);assert.equal(accepted.status,202);const {turn}=await accepted.json();
  let result;do{result=await(await fetch(`${app.url}/api/chat/sessions/s1/turns/${turn.id}`)).json();}while(result.turn.status==='pending');
  assert.equal(result.turn.status,'completed');assert.equal(calls.length,1);assert.deepEqual(calls[0].body,{input:[{type:'text',text:'Attachment: report.txt\nSynthetic document'}]});
  assert.equal(calls[0].path,'/api/sessions/s1/chat/stream');
  assert.equal((await send('s1',[attachment.id])).status,400);assert.equal(calls.length,1);
});

test('TC-017: image-heavy history adaptively preserves fifty ordered stable rows without leaking data URLs',async t=>{
  const requests=[];const rows=Array.from({length:100},(_,id)=>({id,role:'user',content:[{type:'text',text:`Message ${id}`},{type:'image_url',image_url:{url:'data:image/png;base64,'+'A'.repeat(150000)}}]}));
  const gateway=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));requests.push({offset,limit});res.end(JSON.stringify({data:rows.slice(Math.max(0,100-offset-limit),100-offset)}));});
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic'}});await app.listen();t.after(()=>app.close());
  for(const offset of [0,50,100]){
    const response=await fetch(`${app.url}/api/chat/sessions/s1/messages?offset=${offset}`);assert.equal(response.status,200);const text=await response.text();assert.equal(text.includes('data:image'),false);const data=JSON.parse(text).data;
    assert.deepEqual(data.map(row=>row.id),Array.from({length:offset===100?0:50},(_,index)=>50-offset+index));
    if(data.length)assert.equal(data[0].content,`Message ${50-offset}\n\nImage attachment`);
  }
  assert.ok(requests.some(row=>row.limit===25));assert.ok(requests.length<20);
  assert.equal(projectHistoryMessage({id:1,role:'user',content:'[not json'}).content,'[not json');
});

test('TC-017: links replace selected text, escape labels and reject unsafe or oversized changes',()=>{
  assert.deepEqual(insertLink('hello world!',6,11,'https://example.test/a(b)','Read [this]'),{text:'hello [Read \\[this\\]](https://example.test/a%28b%29)!',caret:52});
  for(const url of ['javascript:alert(1)','file:///private','https://user:secret@example.test','bad'])assert.throws(()=>insertLink('safe',0,0,url),/HTTP/);
  assert.throws(()=>insertLink('x'.repeat(8000),8000,8000,'https://example.test'),/8000/);
});

test('TC-017: image projection preserves ordinary JSON prose and mixed unknown/scalar payloads losslessly',()=>{
  for(const content of ['[1,2]','["hello","world"]','[{"important":"retain me"}]',' [1, false, null]','[{"type":"text","text":"literal typed prose"}]','[not json'])assert.equal(projectHistoryMessage({id:1,role:'user',content}).content,content);
  const ordinary=[1,false,null,{important:'retain me'}];assert.deepEqual(projectHistoryMessage({id:1,role:'user',content:ordinary}).content,ordinary);
  const mixed=[{type:'text',text:'Keep prose',custom:'retain field'},{type:'image_url',image_url:{url:'data:image/png;base64,private',detail:'high'},extra:'retain metadata'},7,false,null,{unknown:['keep',4]}];
  for(const content of [mixed,JSON.stringify(mixed)]){
    const result=JSON.parse(projectHistoryMessage({id:2,role:'user',content}).content);
    assert.deepEqual(result,[mixed[0],{...mixed[1],image_url:{url:'Image attachment',detail:'high'}},...mixed.slice(2)]);
    assert.equal(JSON.stringify(result).includes('base64'),false);
  }
  const simple=JSON.stringify([{type:'text',text:'Look'},{type:'image_url',image_url:{url:'data:image/png;base64,private'}}]);
  assert.equal(projectHistoryMessage({id:3,role:'user',content:simple}).content,'Look\n\nImage attachment');
});

test('TC-017: shipped composer blocks uploading, sends attachment-only once and retains uncertainty until Reload',async()=>{
  const harness=await chatHarness({media:true});const element=id=>harness.elements.get(id);
  await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await harness.respond({data:[]});
  element('chat-files').files=[{name:'report.txt',size:5,arrayBuffer:async()=>Buffer.from('Hello')}];element('chat-files').dispatch('change');await harness.flush();
  assert.equal(element('chat-send').disabled,true);element('chat-message').dispatch('keydown',{key:'Enter'});assert.equal(harness.requests.length,1);
  assert.equal(harness.requests[0].url,'/api/chat/sessions/nedcom-main/attachments');assert.equal(harness.requests[0].options.headers['Content-Type'],'text/plain');
  await harness.respond({attachment:{id:'receipt',name:'report.txt',size:5}});assert.equal(element('chat-send').disabled,false);assert.match(element('chat-attachments').textContent,/Ready/);
  element('chat-message').dispatch('keydown',{key:'Enter'});await harness.flush();assert.deepEqual(JSON.parse(harness.requests[0].options.body),{input:'',attachments:['receipt']});
  element('chat-form').dispatch('submit');assert.equal(harness.requests.length,1);
  const id='00000000-0000-0000-0000-000000000001';await harness.respond({turn:{id,status:'pending'}});await harness.respond({},503);
  assert.match(element('chat-status').textContent,/Delivery could not be confirmed/);assert.match(element('chat-attachments').textContent,/report.txt/);assert.equal(element('chat-send').disabled,true);
  element('chat-form').dispatch('submit');assert.equal(harness.requests.length,0);
  element('chat-retry').dispatch('click');await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await harness.respond({data:[]});
  element('chat-form').dispatch('submit');await harness.respond({turn:{id,status:'pending'}});await harness.respond({turn:{id,status:'completed'},session_id:'nedcom-main',message:{content:'Confirmed'}});await harness.respond({data:[{id:1,role:'assistant',content:'Confirmed'}]});
  assert.equal(element('chat-attachments').children.length,0);assert.equal(element('chat-message').value,'');
});

test('TC-017: removal cancels receipt adoption, upload errors preserve draft, link editor restores saved caret and focus',async()=>{
  const harness=await chatHarness({media:true});const element=id=>harness.elements.get(id);
  await harness.respond({session:{id:'nedcom-main',title:'NED Chat',source:'api_server'}});await harness.respond({data:[]});
  const draft=element('chat-message');draft.value='Keep draft';
  element('chat-files').files=[{name:'report.txt',size:5,arrayBuffer:async()=>Buffer.from('Hello')}];element('chat-files').dispatch('change');await harness.flush();
  element('chat-attachments').children[0].children[1].dispatch('click');await harness.respond({attachment:{id:'removed'}});assert.equal(element('chat-attachments').children.length,0);
  element('chat-files').dispatch('change');await harness.flush();await harness.respond({error:{message:'Document rejected'}},400);assert.equal(draft.value,'Keep draft');assert.equal(element('chat-attachment-status').textContent,'Document rejected');
  draft.setSelectionRange(5,10);element('chat-add-link').dispatch('click');assert.equal(harness.document.activeElement,element('chat-link-url'));
  element('chat-link-url').value='javascript:alert(1)';element('chat-link-insert').dispatch('click');assert.equal(draft.value,'Keep draft');assert.match(element('chat-link-error').textContent,/HTTP/);
  element('chat-link-url').value='https://example.test';element('chat-link-label').value='report';element('chat-link-insert').dispatch('click');
  assert.equal(draft.value,'Keep [report](https://example.test/)');assert.equal(harness.document.activeElement,draft);assert.equal(draft.selectionStart,draft.value.length);assert.equal(element('chat-link-editor').hidden,true);
});
