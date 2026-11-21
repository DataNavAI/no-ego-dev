import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter,once} from 'node:events';
import {PassThrough} from 'node:stream';
import {WebSocketServer,createWebSocketStream} from 'ws';
import {startPublicTunnel} from '../../../../apps/com/src/tunnel.js';
import {startHubConnection,readHubConfiguration} from '../../../../apps/com/src/hub.js';
import {createCommunicatorServer} from '../../ned-api/tests/auth-client.js';

export async function verifyBridges(t){
  let forwarded=0;const app=createCommunicatorServer({initializeDatabase:true});const target=await app.listen();t.after(()=>app.close());
  app.server.prependListener('request',()=>{forwarded++;});
  const hostile=['/%61pi/core/v1/health','/api/%2563ore/v1/health','/api/core%2fv1/health','/other/../api/core/v1/health','/api//core/v1/health','/api/v1/operator/health','/api/v1/operator','/api/v1/%6fperator/health','/api/v1/%256fperator/health','/api/v1//operator/health','/api/v1/chat/../operator/health','/api/v1/unknown-command'];
  let proxy,child;const pending=startPublicTunnel(target,{spawn(_binary,args){proxy=args.at(-1);child=new EventEmitter();child.stderr=new PassThrough();child.stdout=new PassThrough();child.kill=()=>{queueMicrotask(()=>child.emit('close',0));return true;};return child;}});
  while(!proxy)await new Promise(resolve=>setImmediate(resolve));
  child.stderr.write('https://core-fixture.trycloudflare.com\n');const tunnel=await pending;t.after(()=>tunnel.close());
  const request=(pathname,credential=app.apiCredential)=>new Promise((resolve,reject)=>{const req=http.request(proxy,{path:pathname,headers:{host:'core-fixture.trycloudflare.com',...(credential?{authorization:'Bearer '+credential}:{})}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  for(const pathname of hostile)assert.equal(await request(pathname),403,pathname);
  assert.equal(forwarded,0);
  assert.equal(await request('/api/v1/health',null),401);assert.equal(await request('/api/v1/context','wrong'),401);
  assert.equal(await request('/api/v1/health'),200);assert.equal(await request('/api/v1/context'),200);
  await tunnel.close();
  const hub=http.createServer((_req,res)=>res.end(JSON.stringify({tunnelUrl:`ws://127.0.0.1:${hub.address().port}/tunnel/control?slug=core-test`})));
  const wss=new WebSocketServer({server:hub});
  await new Promise(resolve=>hub.listen(0,'127.0.0.1',resolve));
  t.after(()=>{for(const ws of wss.clients)ws.terminate();wss.close();return new Promise(resolve=>hub.close(resolve));});
  const origin=`http://127.0.0.1:${hub.address().port}`,waiting=new Map();let control,opened;
  const ready=new Promise(resolve=>{opened=resolve;});
  wss.on('connection',(ws,req)=>{if(req.url.startsWith('/tunnel/control')){control=ws;ws.send(JSON.stringify({type:'ready'}));opened();}else waiting.get(new URL(req.url,origin).searchParams.get('id'))(createWebSocketStream(ws));});
  const connection=startHubConnection(readHubConfiguration({NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin,NED_HUB_TOKEN:'ned_synthetic_core_test_00000000000',NED_INSTANCE_NAME:'core-test'}),target,{apiCredential:()=>app.apiCredential});
  t.after(()=>connection.close());await ready;let serial=0;
  const hubRequest=async pathname=>{const id=String(++serial).padStart(43,'a');const data=new Promise(resolve=>waiting.set(id,resolve));control.send(JSON.stringify({type:'open',id}));const stream=await data;let text='';stream.on('data',chunk=>{text+=chunk;});stream.write(`GET ${pathname} HTTP/1.1\r\nHost: ned-com\r\nx-ned-instance: core-test\r\nx-forwarded-host: ${new URL(origin).host}\r\nx-forwarded-proto: http\r\nAuthorization: Bearer ${'a'.repeat(64)}\r\nConnection: close\r\n\r\n`);await once(stream,'end');stream.destroy();return text;};
  for(const pathname of hostile)assert.match(await hubRequest(pathname),/403 Forbidden/,pathname);
  assert.equal(forwarded,4);assert.match(await hubRequest('/api/v1/context'),/200 OK/);assert.equal(forwarded,5);
  await connection.close();
}
