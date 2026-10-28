import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once,EventEmitter} from 'node:events';
import {WebSocketServer,createWebSocketStream} from 'ws';
import {readHubConfiguration,startHubConnection} from '../../../../src/communicator/hub.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {runCommunicatorCli} from '../../../../src/communicator/cli.js';
const token='ned_synthetic_test_credential_00000000';
const config={NED_HUB_URL:'https://hub.example',NED_HUB_TOKEN:token,NED_INSTANCE_NAME:'fixture'};
test('TC-015: explicit configuration and COM readiness precede registration; cleanup preserves local defaults',async()=>{
  assert.equal(readHubConfiguration({}),null);
  for(const bad of [{NED_HUB_NAME:'x'},{...config,NED_HUB_URL:'http://remote.example'},{...config,NED_HUB_TOKEN:'bad'},{...config,NED_INSTANCE_NAME:'UPPER'},{...config,NED_HUB_PROXY_URL:'https://proxy.example/path'}])assert.throws(()=>readHubConfiguration(bad));
  assert.equal(readHubConfiguration(config).proxy.origin,'https://proxy.hub.example');
  assert.equal(readHubConfiguration({...config,NED_HUB_URL:'http://localhost:3000',NED_HUB_PROXY_URL:'http://localhost:4000',NED_HUB_INSTANCE_ORIGINS:'true'}).instance.origin,'http://fixture.localhost:4000');
  for(const configured of [false,true]){
    const signals=new EventEmitter();const order=[];
    const result=await runCommunicatorCli([],{log(){setImmediate(()=>signals.emit('SIGTERM'));},error(){assert.fail();}},{env:configured?config:{},home:'/synthetic',signals,createServer(){return {async listen(){order.push('ready');return 'http://127.0.0.1:1234';},async close(){order.push('closed');}};},startHub(_config,url){assert.equal(url,'http://127.0.0.1:1234');order.push('registered');return {async close(){order.push('tunnel closed');}};}});
    assert.equal(result,0);
    assert.deepEqual(order,configured?['ready','registered','closed','tunnel closed','closed']:['ready','closed','closed']);
  }
});

test('TC-015: authenticated retry reaches real COM and rejects foreign origins without credential forwarding',async t=>{
  const com=createCommunicatorServer({databasePath:'/nonexistent/synthetic.sqlite'});const local=await com.listen();t.after(()=>com.close());
  let calls=0;const registrations=[];
  const server=http.createServer(async(req,res)=>{
    calls++;assert.equal(req.url,'/api/instances');assert.equal(req.headers.authorization,`Bearer ${token}`);
    let body='';for await(const chunk of req)body+=chunk;registrations.push(JSON.parse(body));
    if(calls===1){res.writeHead(503);res.end();return;}
    res.setHeader('content-type','application/json');res.end(JSON.stringify({tunnelUrl:`ws://127.0.0.1:${server.address().port}/tunnel/control?slug=fixture`}));
  });
  const wss=new WebSocketServer({server});t.after(()=>wss.close());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const pending=new Map();let control;let opened;const ready=new Promise(resolve=>{opened=resolve;});
  wss.on('connection',(ws,req)=>{
    assert.equal(req.headers.authorization,`Bearer ${token}`);
    if(req.url.startsWith('/tunnel/control')){control=ws;ws.send(JSON.stringify({type:'ready'}));opened();}
    else {const id=new URL(req.url,origin).searchParams.get('id');pending.get(id)(createWebSocketStream(ws));}
  });
  const states=[];
  const connection=startHubConnection(readHubConfiguration({...config,NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin}),local,{retryDelay:1,onStatus:s=>states.push(s)});t.after(()=>connection.close());
  await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('readiness deadline')),5000).unref())]);
  assert.equal(calls,2);assert.deepEqual(registrations,[{slug:'fixture',name:'fixture'},{slug:'fixture',name:'fixture'}]);
  let n=0;
  async function request(path,requestOrigin){
    const id=String(++n).padStart(43,'a');const waiting=new Promise(resolve=>pending.set(id,resolve));control.send(JSON.stringify({type:'open',id}));const stream=await waiting;
    let text='';stream.on('data',chunk=>{text+=chunk.toString();});
    stream.write(`GET ${path} HTTP/1.1\r\nHost: ned-com\r\nx-ned-instance: fixture\r\nx-forwarded-host: 127.0.0.1:${server.address().port}\r\nx-forwarded-proto: http\r\n${requestOrigin===null?'':`Origin: ${requestOrigin}\r\n`}Connection: close\r\n\r\n`);
    await once(stream,'end');stream.destroy();return text;
  }
  assert.match(await request('/api/health',origin),/200 OK[\s\S]*"status":"ok"/);
  assert.match(await request('/styles.css',null),/200 OK[\s\S]*text\/css/);
  assert.match(await request('/api/health','https://foreign.example'),/403 Forbidden/);
  assert.match(await request('//foreign.example/',origin),/400 Bad Request/);
  control.close();await once(control,'close');
  // A second ready control proves repeat registration uses the same stable identity.
  await new Promise(resolve=>{opened=resolve;});
  assert.equal(calls,3);assert.deepEqual(registrations[2],registrations[0]);
  assert.ok(states.includes('offline; retrying'));
  await connection.close();assert.equal((await fetch(`${local}/api/health`)).status,200);
  for(const ws of wss.clients)ws.terminate();
});

test('TC-015: untrusted tunnel endpoint never receives a bearer',async t=>{
  let contacted=false;const hostile=http.createServer(()=>{contacted=true;});await new Promise(resolve=>hostile.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>hostile.close(resolve)));
  const server=http.createServer((_req,res)=>res.end(JSON.stringify({tunnelUrl:`ws://127.0.0.1:${hostile.address().port}/tunnel/control?slug=fixture`})));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let settled;const rejected=new Promise(resolve=>{settled=resolve;});
  const connection=startHubConnection(readHubConfiguration({...config,NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin}),'http://127.0.0.1:1',{onStatus:s=>{if(s.startsWith('invalid tunnel endpoint'))settled();}});t.after(()=>connection.close());
  await rejected;assert.equal(contacted,false);
});

test('TC-015: rejected authentication stops retry and stopping aborts an outstanding registration',async t=>{
  for(const reject of [true,false]){
    let received,closed;const requestSeen=new Promise(resolve=>{received=resolve;});const requestClosed=new Promise(resolve=>{closed=resolve;});let count=0;
    const server=http.createServer((_req,res)=>{count++;res.on('close',closed);received();if(reject){res.writeHead(401);res.end();}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
    const origin=`http://127.0.0.1:${server.address().port}`;const statuses=[];let rejected;
    const settled=new Promise(resolve=>{rejected=resolve;});
    const connection=startHubConnection(readHubConfiguration({...config,NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin}),'http://127.0.0.1:1',{retryDelay:1,onStatus:s=>{statuses.push(s);if(s.includes('registration rejected'))rejected();}});
    t.after(()=>connection.close());await requestSeen;
    if(reject)await settled;
    await connection.close();await requestClosed;
    assert.equal(count,1);assert.ok(statuses.every(status=>!status.includes(token)));
    if(reject)assert.deepEqual(statuses,['connecting','registration rejected (401); local COM remains available']);
  }
});

test('TC-015: permanent slug admission matches Hub and local origin mode is explicit',()=>{
  for(const slug of ['moon-','abc','a'.repeat(40)]) assert.equal(readHubConfiguration({...config,NED_INSTANCE_NAME:slug}).slug,slug);
  for(const slug of ['1ned','ab','a'.repeat(41),'api','auth','tunnel','healthz','assets','connect','favicon','robots','login','logout']) assert.throws(()=>readHubConfiguration({...config,NED_INSTANCE_NAME:slug}));
  const local={...config,NED_HUB_URL:'http://localhost:3000',NED_HUB_PROXY_URL:'http://localhost:4000'};
  assert.equal(readHubConfiguration(local).instance.origin,'http://localhost:4000');
  assert.equal(readHubConfiguration({...local,NED_HUB_INSTANCE_ORIGINS:'false'}).instance.origin,'http://localhost:4000');
  assert.equal(readHubConfiguration({...local,NED_HUB_INSTANCE_ORIGINS:'true'}).instance.origin,'http://fixture.localhost:4000');
  assert.equal(readHubConfiguration(config).instance.origin,'https://fixture.proxy.hub.example');
  assert.throws(()=>readHubConfiguration({...config,NED_HUB_INSTANCE_ORIGINS:'false'}));
  assert.throws(()=>readHubConfiguration({...local,NED_HUB_INSTANCE_ORIGINS:'yes'}));
});

test('TC-015: normal and isolated localhost Hub modes stream real COM with exact Origin checks',async t=>{
  for(const isolated of [false,true]) await t.test(isolated?'explicit isolated localhost':'default shared localhost',async t=>{
    const com=createCommunicatorServer({databasePath:'/nonexistent/synthetic.sqlite'});const local=await com.listen();t.after(()=>com.close());
    const server=http.createServer((_req,res)=>res.end(JSON.stringify({tunnelUrl:`ws://localhost:${server.address().port}/tunnel/control?slug=fixture`})));
    await new Promise(resolve=>server.listen(0,resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
    const port=server.address().port;const origin=`http://localhost:${port}`;const expectedOrigin=`http://${isolated?'fixture.':''}localhost:${port}`;
    const wss=new WebSocketServer({server});t.after(()=>wss.close());let control,opened;const ready=new Promise(resolve=>{opened=resolve;});const pending=new Map();
    wss.on('connection',(ws,req)=>{if(req.url.startsWith('/tunnel/control')){control=ws;ws.send(JSON.stringify({type:'ready'}));opened();}else pending.get(new URL(req.url,origin).searchParams.get('id'))(createWebSocketStream(ws));});
    const env={...config,NED_HUB_URL:origin,NED_HUB_PROXY_URL:origin,...(isolated?{NED_HUB_INSTANCE_ORIGINS:'true'}:{})};
    const connection=startHubConnection(readHubConfiguration(env),local);t.after(()=>connection.close());await ready;
    let n=0;async function request(requestOrigin){const id=String(++n).padStart(43,'b');const waiting=new Promise(resolve=>pending.set(id,resolve));control.send(JSON.stringify({type:'open',id}));const stream=await waiting;let text='';stream.on('data',chunk=>{text+=chunk;});stream.write(`GET /api/health HTTP/1.1\r\nHost: ned-com\r\nx-ned-instance: fixture\r\nx-forwarded-host: ${new URL(expectedOrigin).host}\r\nx-forwarded-proto: http\r\nOrigin: ${requestOrigin}\r\nConnection: close\r\n\r\n`);await once(stream,'end');stream.destroy();return text;}
    assert.match(await request(expectedOrigin),/200 OK[\s\S]*"status":"ok"/);
    assert.match(await request(`http://${isolated?'':'fixture.'}localhost:${port}`),/403 Forbidden/);
    await connection.close();for(const ws of wss.clients)ws.terminate();
  });
});
