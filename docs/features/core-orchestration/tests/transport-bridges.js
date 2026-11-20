import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter,once} from 'node:events';
import {PassThrough} from 'node:stream';
import {WebSocketServer,createWebSocketStream} from 'ws';
import {startPublicTunnel} from '../../../../apps/com/src/tunnel.js';
import {startHubConnection,readHubConfiguration} from '../../../../apps/com/src/hub.js';

export async function verifyBridges(t){
  let forwarded=0;const upstream=http.createServer((_req,res)=>{forwarded++;res.end('ordinary');});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const target=`http://127.0.0.1:${upstream.address().port}`;
  const hostile=['/api/core/v1/health','/%61pi/core/v1/health','/api/%2563ore/v1/health','/api/core%2fv1/health','/other/../api/core/v1/health','/api//core/v1/health','/api/core/v1/health/?x=1'];
  let proxy,child;const pending=startPublicTunnel(target,{spawn(_binary,args){proxy=args.at(-1);child=new EventEmitter();child.stderr=new PassThrough();child.stdout=new PassThrough();child.kill=()=>{queueMicrotask(()=>child.emit('close',0));return true;};return child;}});
  while(!proxy)await new Promise(resolve=>setImmediate(resolve));
  child.stderr.write('https://core-fixture.trycloudflare.com\n');const tunnel=await pending;t.after(()=>tunnel.close());
  const request=pathname=>new Promise((resolve,reject)=>{const req=http.request(proxy,{path:pathname,headers:{host:'core-fixture.trycloudflare.com',authorization:'Bearer '+ 'a'.repeat(64)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  for(const pathname of hostile)assert.equal(await request(pathname),403,pathname);
  assert.equal(forwarded,0);assert.equal(await request('/api/chat/sessions'),200);
  await tunnel.close();
  const hub=http.createServer((_req,res)=>res.end(JSON.stringify({tunnelUrl:`ws://127.0.0.1:${hub.address().port}/tunnel/control?slug=core-test`})));
  const wss=new WebSocketServer({server:hub});
  await new Promise(resolve=>hub.listen(0,'127.0.0.1',resolve));
  t.after(()=>{for(const ws of wss.clients)ws.terminate();wss.close();return new Promise(resolve=>hub.close(resolve));});
  const origin=`http://127.0.0.1:${hub.address().port}`,waiting=new Map();let control,opened;
  const ready=new Promise(resolve=>{opened=resolve;});
  wss.on('connection',(ws,req)=>{if(req.url.startsWith('/tunnel/control')){control=ws;ws.send(JSON.stringify({type:'ready'}));opened();}else waiting.get(new URL(req.url,origin).searchParams.get('id'))(createWebSocketStream(ws));});
  const connection=startHubConnection(readHubConfiguration({NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin,NED_HUB_TOKEN:'ned_synthetic_core_test_00000000000',NED_INSTANCE_NAME:'core-test'}),target);
  t.after(()=>connection.close());await ready;let serial=0;
  const hubRequest=async pathname=>{const id=String(++serial).padStart(43,'a');const data=new Promise(resolve=>waiting.set(id,resolve));control.send(JSON.stringify({type:'open',id}));const stream=await data;let text='';stream.on('data',chunk=>{text+=chunk;});stream.write(`GET ${pathname} HTTP/1.1\r\nHost: ned-com\r\nx-ned-instance: core-test\r\nx-forwarded-host: ${new URL(origin).host}\r\nx-forwarded-proto: http\r\nAuthorization: Bearer ${'a'.repeat(64)}\r\nConnection: close\r\n\r\n`);await once(stream,'end');stream.destroy();return text;};
  for(const pathname of hostile)assert.match(await hubRequest(pathname),/403 Forbidden/,pathname);
  assert.equal(forwarded,1);assert.match(await hubRequest('/api/chat/sessions'),/200 OK/);assert.equal(forwarded,2);
  await connection.close();
}
