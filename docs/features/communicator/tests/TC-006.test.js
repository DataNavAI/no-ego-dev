import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {writeFileSync,symlinkSync,unlinkSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fixture} from './fixtures.js';
import {validatePreviewUrl} from '../../../../src/communicator/projects.js';
import {initialState,settleLoad,selectProject,selectSection,settleDetail,beginDetail,view} from '../../../../src/communicator/public/state.js';
import {clientHarness} from './client-harness.js';
test('TC-006: shipped client retains newer project and section after delayed detail success',async t=>{
  for(const navigation of ['project','section'])await t.test(navigation,async()=>{
    const {elements,requests,respond}=await clientHarness();
    elements.get('retry').dispatch('click');const stale=requests.shift();
    if(navigation==='project'){
      elements.get('project').value='b';elements.get('project').dispatch('change');
      await respond({project:{id:'b'},preview:{status:'unconfigured'}});
    }else elements.get('Tasks').dispatch('click');
    stale.resolve({ok:true,json:async()=>({project:{id:'a'},preview:{status:'available',url:'http://127.0.0.1:4321'}})});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(elements.get('project').value,navigation==='project'?'b':'a');
    assert.equal(elements.get('heading').textContent,'Goals');
    assert.equal(elements.get('open-app').hidden,true);
  });
});
test('TC-006: left tabs preserve preview, chat nodes and selected panel across mobile views',async()=>{
  const {elements,setMobile}=await clientHarness();
  const transcript=elements.get('chat');transcript.value='retained draft and history sentinel';
  assert.equal(elements.get('preview-heading').textContent,'No app preview configured');
  elements.get('Artifacts').dispatch('click');
  assert.equal(elements.get('content').hidden,false);assert.equal(elements.get('chat').hidden,true);
  assert.equal(elements.get('heading').textContent,'Artifacts');
  assert.equal(elements.get('preview-heading').textContent,'No app preview configured');
  elements.get('Artifacts').dispatch('click');assert.equal(elements.get('content').hidden,false,'repeating selected tab retains panel');
  setMobile(true);
  assert.equal(elements.get('left-pane').hidden,false);assert.equal(elements.get('preview').inert,true);
  elements.get('preview-toggle').dispatch('click');
  assert.equal(elements.get('left-pane').hidden,true);assert.equal(elements.get('content').inert,true);assert.equal(elements.get('preview').hidden,false);
  elements.get('left-toggle').dispatch('click');
  assert.equal(elements.get('content').hidden,false);assert.equal(elements.get('Artifacts')['aria-selected'],'true');
  elements.get('mobile-sidebar-toggle').dispatch('click');
  assert.equal(elements.get('chat').hidden,false);assert.equal(transcript.value,'retained draft and history sentinel');
  setMobile(false);assert.equal(elements.get('preview').hidden,false);assert.equal(elements.get('left-pane').hidden,false);
});
test('TC-006: mobile initially shows Preview; keyboard tab navigation wraps and updates focus',async()=>{
  const {elements,document,setMobile}=await clientHarness();setMobile(true);
  assert.equal(elements.get('preview').hidden,false);assert.equal(elements.get('left-pane').inert,true);
  elements.get('left-toggle').dispatch('click');
  elements.get('mobile-sidebar-toggle').dispatch('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.equal(document.activeElement,elements.get('Tasks'));assert.equal(elements.get('heading').textContent,'Goals');
  elements.get('Tasks').dispatch('keydown',{key:'End',preventDefault(){}});
  assert.equal(document.activeElement,elements.get('Artifacts'));
  elements.get('Artifacts').dispatch('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.equal(document.activeElement,elements.get('mobile-sidebar-toggle'));assert.equal(elements.get('content').inert,true);
  elements.get('project').value='';elements.get('project').dispatch('change');
  elements.get('Tasks').dispatch('click');assert.equal(elements.get('content').hidden,false);assert.equal(elements.get('heading').textContent,'Project is unavailable.');
});
test('TC-006: strict raw local URL policy',()=>{
  for(const value of ['http://localhost:80/','http://127.1:80/','http://2130706433:80/','http://127.0.0.1/','http://127.0.0.1:0/','http://127.0.0.1:65536/','http://127.0.0.1:80/?token=secret','http://u:p@127.0.0.1:80/','http://127.0.0.1:80/#x','https://127.0.0.1:80/','http://[::1]:80/','http://127.0.0.1:80/\\remote','http://127.0.0.1:80/\n']) assert.equal(validatePreviewUrl(value),null,value);
  assert.equal(validatePreviewUrl('http://127.0.0.1:4100/path'),'http://127.0.0.1:4100/path');
});
test('TC-006: bounded nonsymlink configuration and HEAD-only reachability',async t=>{
  const f=await fixture(t);let code=204;const requests=[];const sockets=new Set();
  const preview=http.createServer((req,res)=>{requests.push({method:req.method,headers:req.headers});if(code!==0){res.writeHead(code,{Location:'http://localhost:9/'});res.end();}});
  preview.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
  await new Promise(resolve=>preview.listen(0,'127.0.0.1',resolve));t.after(()=>{for(const socket of sockets)socket.destroy();preview.close();});
  const url=`http://127.0.0.1:${preview.address().port}/app`;const config=path.join(f.roots[0],'.nedcom.json');
  const read=async()=> (await f.get('/api/projects/project-0')).body.preview;
  writeFileSync(config,JSON.stringify({version:1,previewUrl:url}));assert.deepEqual(await read(),{status:'available',url});
  assert.equal(requests[0].method,'HEAD');assert.equal(requests[0].headers.cookie,undefined);assert.equal(requests[0].headers.authorization,undefined);
  for(const status of [302,500,0]){code=status;const start=Date.now();assert.deepEqual(await read(),{status:'stopped'});assert.ok(Date.now()-start<1600);}
  const count=requests.length;
  for(const value of ['not json','[]',JSON.stringify({version:2,previewUrl:url}),JSON.stringify({version:1,previewUrl:url,extra:true}),JSON.stringify({version:1,previewUrl:'http://localhost:99/'}),' '.repeat(4097)]){writeFileSync(config,value);assert.deepEqual(await read(),{status:'invalid'});}
  assert.equal(requests.length,count);
  writeFileSync(config,JSON.stringify({version:1,previewUrl:url}));chmodSync(config,0);assert.deepEqual(await read(),{status:'unavailable'});chmodSync(config,0o600);
  writeFileSync(config,JSON.stringify({version:1,previewUrl:'http://127.0.0.1:1/'}));assert.deepEqual(await read(),{status:'stopped'});
  unlinkSync(config);symlinkSync(path.join(f.roots[1],'sentinel'),config);assert.deepEqual(await read(),{status:'invalid'});unlinkSync(config);
  execFileSync('mkfifo',[config]);const start=Date.now();assert.deepEqual(await read(),{status:'invalid'});assert.ok(Date.now()-start<500);unlinkSync(config);
  assert.deepEqual(await read(),{status:'unconfigured'});
  code=0;writeFileSync(config,JSON.stringify({version:1,previewUrl:url}));const pending=read().catch(()=>null);await new Promise(resolve=>preview.once('request',resolve));const closing=Date.now();await f.app.close();await pending;assert.ok(Date.now()-closing<500);
});
test('TC-006: switch/retry clear preview and reject stale detail success and errors',()=>{
  let state=initialState();state=settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[{id:'a',name:'shop',displayPath:'~/a/shop'},{id:'b',name:'shop',displayPath:'~/b/shop'}]});
  state=selectProject(state,'a');const a=state.requestGeneration;
  state=selectProject(state,'b');const b=state.requestGeneration;
  assert.equal(view(state).title,'Loading project…');assert.equal(view(state).url,undefined);
  assert.equal(settleDetail(state,a,{preview:{status:'available',url:'http://127.0.0.1:80/'}}),state);
  assert.equal(settleDetail(state,a,null,'database_unavailable'),state);
  state=settleDetail(state,b,{preview:{status:'available',url:'http://127.0.0.1:81/'}});state=selectSection(state,'WIP app');assert.equal(view(state).url,'http://127.0.0.1:81/');
  state=beginDetail(state);assert.equal(view(state).url,undefined);assert.equal(beginDetail(state),state);
  assert.equal(settleDetail(state,b,null,'database_unavailable'),state);
  state=settleDetail(state,state.requestGeneration,{preview:{status:'stopped'}});assert.equal(view(state).title,'App is not running');
});

test('TC-006: deferred older response cannot restore link after registry reload or selection',async()=>{
  let state=initialState();state=settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[{id:'a',name:'shop'},{id:'b',name:'shop'}]});
  state=selectProject(state,'a');const generation=state.requestGeneration;
  let resolve;const deferred=new Promise(done=>{resolve=done;});
  const response=deferred.then(data=>{state=settleDetail(state,generation,data);});
  state=selectProject(state,'b');state=settleDetail(state,state.requestGeneration,{preview:{status:'unconfigured'}});
  resolve({preview:{status:'available',url:'http://127.0.0.1:99/'}});await response;
  assert.equal(state.projectId,'b');assert.equal(state.detail.preview.status,'unconfigured');
});


test('TC-006: preview retry restores focus to result without stealing intentional navigation',async()=>{
  for(const intentional of [false,true]){
    const {elements,document,respond}=await clientHarness();const retry=elements.get('preview-retry');
    retry.focus();retry.dispatch('click');
    assert.equal(retry.disabled,true);
    if(intentional)elements.get('project').focus();
    await respond({preview:{status:'available',url:'http://127.0.0.1:4321/'}});
    assert.equal(elements.get('preview-open').hidden,false);assert.equal(retry.hidden,true);
    assert.equal(document.activeElement,elements.get(intentional?'project':'preview-heading'));
  }
});
