import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {mergePage} from '../../../../src/communicator/public/chat-ui.js';
import {endStream} from './stream-fixtures.js';

test('TC-007: authenticated Hermes sessions, pagination and safe mutation perimeter',async t=>{
  const calls=[];
  const gateway=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    calls.push({path:req.url,method:req.method,key:req.headers.authorization,body});
    res.setHeader('Content-Type','application/json');
    if(req.url.includes('offset=999')){res.writeHead(500);res.end('private provider failure');return;}
    if(req.url.includes('offset=998')){res.writeHead(302,{Location:'http://127.0.0.1:1/private'});res.end();return;}
    if(req.url.includes('offset=997')){res.end('not-json private provider failure');return;}
    if(req.url.includes('offset=996')){res.end('x'.repeat(4194305));return;}
    if(req.url.includes('offset=995')){res.end(JSON.stringify({data:[{role:'assistant',content:'missing identity'}]}));return;}
    if(req.url.includes('offset=994')){res.end(JSON.stringify({data:[{id:1,content:'a'},{id:1,content:'b'}]}));return;}
    if(req.method==='POST' && req.url.endsWith('/chat/stream'))endStream(res,'s1','Hello');
    else if(req.method==='POST')res.end(JSON.stringify({session:{id:'s1',secret:'private'}}));
    else if(req.url.includes('/messages'))res.end(JSON.stringify({data:[{id:1,role:'user',content:'<script>bad</script>'}]}));
    else res.end(JSON.stringify({data:[{id:'s1',title:'First',private:'hidden'}],has_more:true}));
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{gateway.close(resolve);gateway.closeAllConnections();}));
  const app=createCommunicatorServer({gateway:{url:`http://127.0.0.1:${gateway.address().port}`,key:'synthetic-key'}});
  await app.listen();t.after(()=>app.close());
  const request=(path='',body,headers={})=>fetch(app.url+'/api/chat/sessions'+path,{...(body!==undefined?{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json',...headers},body:JSON.stringify(body)}:{})});
  assert.deepEqual(await(await request()).json(),{data:[{id:'s1',title:'First'}],has_more:true});
  assert.equal(calls[0].path,'/api/sessions?limit=50&offset=0');
  assert.deepEqual(await(await request('',{})).json(),{session:{id:'s1'}});
  assert.equal(calls[1].body,'{"source":"nedcom"}');
  assert.deepEqual(await(await request('/s1/messages?offset=50')).json(),{data:[{id:1,role:'user',content:'<script>bad</script>'}]});
  assert.equal(calls[2].path,'/api/sessions/s1/messages?order=latest&limit=50&offset=50');
  const accepted=await request('/s1/chat',{input:'Hi'});assert.equal(accepted.status,202);
  const {turn}=await accepted.json();let result;
  do{result=await(await request(`/s1/turns/${turn.id}`)).json();}while(result.turn.status==='pending');
  assert.equal(result.message.content,'Hello');
  assert.deepEqual(JSON.parse(calls[3].body),{input:'Hi'});
  assert.equal(calls[3].path,'/api/sessions/s1/chat/stream');
  assert.ok(calls.every(call=>call.key==='Bearer synthetic-key'));
  const count=calls.length;
  for(const [path,body,headers,status] of [
    ['',{}, {Origin:'http://evil.test'},403],['',{}, {Origin:''},403],['',{}, {'Content-Type':'text/plain'},403],
    ['/s1/chat',{input:''},{},400],['/s1/chat',{input:'x'.repeat(8001)},{},400],['/s1/chat',{input:'x'.repeat(33000)},{},413],
    ['/../messages',undefined,{},404],['?offset=-1',undefined,{},400],['?url=http://evil.test',undefined,{},400],
  ])assert.equal((await request(path,body,headers)).status,status,path);
  assert.equal(calls.length,count);
  const failure=await request('?offset=999');assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('private'));
  for(const offset of [998,997,996]){const failure=await request(`?offset=${offset}`);assert.equal(failure.status,503);assert.deepEqual(await failure.json(),{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});}
  for(const offset of [995,994])assert.equal((await request(`/s1/messages?offset=${offset}`)).status,503);
  const absent=createCommunicatorServer({gateway:{key:''}});await absent.listen();t.after(()=>absent.close());
  assert.equal((await fetch(absent.url+'/api/chat/sessions')).status,503);
  for(const url of ['https://example.com','http://localhost:8642','http://127.0.0.1:8642/path','http://127.0.0.1:8642?key=x'])assert.throws(()=>createCommunicatorServer({gateway:{url}}));
});

test('TC-007: long history windows preserve chronological paging and cap DOM data',()=>{
  const sequence=(start,count)=>Array.from({length:count},(_,index)=>({id:start+index}));
  let rows=sequence(9950,50);
  for(let page=1;page<100;page++){
    const end=9950-(page-1)*50;
    rows=mergePage(rows,sequence(end-50,50),'older');
    assert.equal(rows[0].id,end-50);assert.ok(rows.length<=200);
    assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  }
  const next=rows.at(-1).id+1;
  rows=mergePage(rows,sequence(next,50),'newer');
  assert.equal(rows.at(-1).id,next+49);assert.equal(rows.length,200);
  const oldest=sequence(0,200);
  const newest=sequence(175,50);
  const partial=mergePage(oldest,newest,'newer',25);
  assert.deepEqual(partial,sequence(25,200));
  assert.equal(new Set(partial.map(row=>row.id)).size,200);
  assert.throws(()=>mergePage(sequence(50,50),sequence(25,50),'older'),{code:'history_changed'});
  assert.throws(()=>mergePage(oldest,sequence(200,50),'newer',25),{code:'history_changed'});
  for(const invalid of [[{content:'missing'}],[{id:1},{id:'1'}],[{id:null}]])assert.throws(()=>mergePage([],invalid,'older'),{code:'history_changed'});
});
