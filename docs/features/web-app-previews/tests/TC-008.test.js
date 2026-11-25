import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import WebSocket,{WebSocketServer} from 'ws';
import {apiFixture,appFixture,mutate} from './helpers.js';

async function appRequest(access,{method='GET',body,headers={}}={}){
 const url=new URL(access.origin);return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:url.port,path:method==='POST'?access.bootstrapPath:'/',method,headers:{host:url.host,...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end(body);});
}
async function access(f,mode='frame'){
 const r=await f.request('/api/v1/preview/access',{method:'POST',headers:{origin:f.app.url},body:{mode}});assert.equal(r.status,200,await r.clone().text());return r.json();
}

test('TC-008: real owned listener receives isolated authenticated HTTP/WS without NED credentials; replacement revokes old access',{timeout:20000},async context=>{
 const f=await apiFixture(context),seen=[];
 const app=await appFixture(context,(req,res)=>{seen.push(req.headers);res.writeHead(200,{'content-type':'text/plain','content-security-policy':"default-src 'self'",'set-cookie':['app=ok; Path=/','__Host-ned_stolen=no; Secure; Path=/','other=no; Domain=localhost; Path=/']});res.end('working-app');});
 const wss=new WebSocketServer({server:app.server});context.after(()=>wss.close());wss.on('connection',ws=>ws.on('message',(data,binary)=>ws.send(data,{binary})));
 const registered=await mutate(f,'PUT',{project:process.cwd(),port:app.port,expectedRevision:0});assert.equal(registered.status,200);
 const ticket=await access(f);assert.notEqual(new URL(ticket.origin).origin,f.app.url);assert.equal(new URL(ticket.origin).hostname.startsWith('pv-'),true);
 assert.equal((await appRequest(ticket)).status,401);
 assert.equal((await appRequest(ticket,{method:'POST',body:new URLSearchParams({grant:ticket.grant}).toString(),headers:{origin:'https://evil.test','content-type':'application/x-www-form-urlencoded'}})).status,403);
 const boot=await appRequest(ticket,{method:'POST',body:new URLSearchParams({grant:ticket.grant}).toString(),headers:{origin:f.app.url,'content-type':'application/x-www-form-urlencoded'}});assert.equal(boot.status,303);const cookie=boot.headers['set-cookie'][0].split(';')[0];assert.match(boot.headers['set-cookie'][0],/HttpOnly; Secure; SameSite=None; Partitioned/);
 const replay=await appRequest(ticket,{method:'POST',body:new URLSearchParams({grant:ticket.grant}).toString(),headers:{origin:f.app.url,'content-type':'application/x-www-form-urlencoded'}});assert.equal(replay.status,403);
 const loaded=await appRequest(ticket,{headers:{cookie:cookie+'; app=saved',authorization:'Bearer '+f.credential(),'x-ned-test':'private'}});assert.equal(loaded.status,200);assert.equal(loaded.text,'working-app');assert.match(loaded.headers['content-security-policy'],/worker-src 'none'/);assert.match(loaded.headers['content-security-policy'],/default-src 'self'/);assert.deepEqual(loaded.headers['set-cookie'],['app=ok; Path=/']);assert.equal(seen.at(-1).authorization,undefined);assert.equal(seen.at(-1)['x-ned-test'],undefined);assert.equal(seen.at(-1).cookie,'app=saved');
 assert.equal((await appRequest(ticket,{headers:{cookie,'service-worker':'script'}})).status,403);
 const ws=new WebSocket(`ws://127.0.0.1:${new URL(ticket.origin).port}/hmr`,{headers:{host:new URL(ticket.origin).host,origin:ticket.origin,cookie}});context.after(()=>ws.terminate());await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});const echo=new Promise(resolve=>ws.once('message',data=>resolve(Buffer.from(data).toString())));ws.send('hmr-update');assert.equal(await echo,'hmr-update');
 const saturated=[];context.after(()=>{for(const socket of saturated)socket.terminate();});
 for(let i=1;i<16;i++){const socket=new WebSocket(`ws://127.0.0.1:${new URL(ticket.origin).port}/hmr`,{headers:{host:new URL(ticket.origin).host,origin:ticket.origin,cookie}});saturated.push(socket);await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});}
 const refused=new WebSocket(`ws://127.0.0.1:${new URL(ticket.origin).port}/hmr`,{headers:{host:new URL(ticket.origin).host,origin:ticket.origin,cookie}});context.after(()=>refused.terminate());refused.on('error',()=>{});assert.equal(await new Promise(resolve=>refused.once('unexpected-response',(_request,response)=>{resolve(response.statusCode);response.resume();refused.terminate();})),503);
 assert.equal((await f.request('/api/v1/preview')).status,200);
 const closed=new Promise(resolve=>ws.once('close',resolve));await mutate(f,'DELETE',{expectedRevision:1});await closed;assert.equal((await appRequest(ticket,{headers:{cookie}})).status,403);
});

test('TC-008: wrong project listener remains metadata-only and cannot obtain private access',{timeout:10000},async context=>{
 const f=await apiFixture(context),app=await appFixture(context);assert.equal((await mutate(f,'PUT',{project:f.project,port:app.port,expectedRevision:0})).status,200);
 const r=await f.request('/api/v1/preview/access',{method:'POST',headers:{origin:f.app.url},body:{mode:'frame'}});assert.equal(r.status,503);await r.body.cancel();
});


test('TC-008: reused port cannot inherit a prior process lease; credential rotation revokes active access',{timeout:20000},async context=>{
 const f=await apiFixture(context);
 async function start(port=0){
  const child=spawn(process.execPath,['--input-type=module','-e',`import http from 'node:http';const s=http.createServer((q,r)=>r.end('owned'));s.listen(${port},'127.0.0.1',()=>console.log(s.address().port));`],{cwd:f.project,stdio:['ignore','pipe','pipe']});
  context.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}});
  const value=await new Promise((resolve,reject)=>{child.stdout.once('data',data=>resolve(Number(data.toString().trim())));child.once('error',reject);child.once('exit',()=>reject(Error('fixture exited')));});return {child,port:value};
 }
 const first=await start();assert.equal((await mutate(f,'PUT',{project:f.project,port:first.port,expectedRevision:0})).status,200);
 const ticket=await access(f);const bootstrap=await appRequest(ticket,{method:'POST',body:new URLSearchParams({grant:ticket.grant}).toString(),headers:{origin:f.app.url,'content-type':'application/x-www-form-urlencoded'}});const cookie=bootstrap.headers['set-cookie'][0].split(';')[0];
 first.child.kill();await once(first.child,'exit');await start(first.port);
 assert.equal((await appRequest(ticket,{headers:{cookie}})).status,503);
 const replaced=await mutate(f,'PUT',{project:f.project,port:first.port,expectedRevision:1});assert.equal(replaced.status,200);assert.notEqual(replaced.body.preview.id,ticket.id);assert.equal(replaced.body.revision,2);
 const current=await access(f);const currentBoot=await appRequest(current,{method:'POST',body:new URLSearchParams({grant:current.grant}).toString(),headers:{origin:f.app.url,'content-type':'application/x-www-form-urlencoded'}});const currentCookie=currentBoot.headers['set-cookie'][0].split(';')[0];assert.equal((await appRequest(current,{headers:{cookie:currentCookie}})).status,200);
 await writeFile(path.join(f.home,'.ned','core','operator-token'),randomBytes(32).toString('hex')+'\n',{mode:0o600});
 assert.equal((await appRequest(current,{headers:{cookie:currentCookie}})).status,503);
});
