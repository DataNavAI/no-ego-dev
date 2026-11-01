import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import http from 'node:http';
import {startPublicTunnel} from '../../../../src/communicator/tunnel.js';
import {runCommunicatorCli} from '../../../../src/communicator/cli.js';
test('TC-011: public tunnel gates startup, rewrites only its exact origin and closes its child',async t=>{
  const received=[];
  const upstream=http.createServer((req,res)=>{received.push({host:req.headers.host,origin:req.headers.origin});res.end('ok');});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const target=`http://127.0.0.1:${upstream.address().port}`;
  let proxy,child;
  const pending=startPublicTunnel(target,{spawn(_binary,args){proxy=args[args.indexOf('--url')+1];child=new EventEmitter();child.stderr=new PassThrough();child.stdout=new PassThrough();child.kill=()=>{queueMicrotask(()=>child.emit('close',0));return true;};return child;}});
  while(!proxy)await new Promise(resolve=>setImmediate(resolve));
  const request=(host,origin)=>new Promise((resolve,reject)=>{const req=http.request(proxy,{headers:{host,...(origin?{origin}:{})}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  assert.equal(await request('fixture.trycloudflare.com'),503);assert.equal(received.length,0);
  child.stderr.write('https://fixture.trycloudflare.com\n');const tunnel=await pending;t.after(()=>tunnel.close());
  assert.equal(tunnel.url,'https://fixture.trycloudflare.com');
  assert.equal(await request('fixture.trycloudflare.com','https://fixture.trycloudflare.com'),200);
  assert.deepEqual(received,[{host:new URL(target).host,origin:target}]);
  assert.equal(await request('evil.example'),403);assert.equal(await request('fixture.trycloudflare.com','https://evil.example'),403);assert.equal(received.length,1);
  await tunnel.close();await assert.rejects(fetch(proxy));
});
test('TC-011: missing tunnel dependency fails closed',async()=>{
  await assert.rejects(startPublicTunnel('http://127.0.0.1:1234',{spawn(){const child=new EventEmitter();child.stderr=new PassThrough();child.stdout=new PassThrough();child.kill=()=>true;queueMicrotask(()=>child.emit('error',new Error('ENOENT')));return child;}}),/tunnel/);
});
test('TC-011: CLI public exposure is explicit, warned and cleaned up',async()=>{
  for(const enabled of [false,true]){
    const signals=new EventEmitter();const logs=[],errors=[];let tunnelCalls=0,closed=0;
    const result=await runCommunicatorCli(enabled?['--public']:[],{log:message=>logs.push(message),error:message=>errors.push(message)},{env:{},home:'/synthetic',createLogger:()=>({path:'/synthetic/log',event(){},close(){}}),signals,createServer(){return {async listen(){if(!enabled)setImmediate(()=>signals.emit('SIGTERM'));return 'http://127.0.0.1:1234';},async close(){}};},async startTunnel(url){assert.equal(url,'http://127.0.0.1:1234');tunnelCalls++;setImmediate(()=>signals.emit('SIGTERM'));return {url:'https://fixture.trycloudflare.com',failure:new Promise(()=>{}),async close(){closed++;}};}});
    assert.equal(result,0);assert.equal(tunnelCalls,Number(enabled));assert.equal(closed,Number(enabled));
    assert.equal(errors.length,Number(enabled));if(enabled){assert.match(errors[0],/no authentication/);assert.ok(logs.some(message=>message.includes('https://fixture.trycloudflare.com')));}
    assert.equal(signals.listenerCount('SIGTERM'),0);
  }
});
test('TC-011: shutdown cancels pending tunnel startup and releases owned listener',async()=>{
  const controller=new AbortController();let proxy,killed=false;
  const pending=startPublicTunnel('http://127.0.0.1:1234',{signal:controller.signal,spawn(_binary,args){proxy=args[args.indexOf('--url')+1];const child=new EventEmitter();child.stderr=new PassThrough();child.stdout=new PassThrough();child.kill=()=>{killed=true;queueMicrotask(()=>child.emit('close',0));return true;};queueMicrotask(()=>controller.abort());return child;}});
  await assert.rejects(pending,/cancelled/);assert.equal(killed,true);await assert.rejects(fetch(proxy));
});
