import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {WebSocketServer, createWebSocketStream} from 'ws';

export const token = 'ned_' + 't'.repeat(32);

export async function listen(server) {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return 'http://127.0.0.1:' + server.address().port;
}

export async function hubFixture(t) {
  const pending = new Map();
  let origin, control, seq = 0;
  const host = () => new URL(origin).host;
  const hub = http.createServer(async (req,res) => {
    if (req.url === '/api/instances' && req.headers.authorization === 'Bearer ' + token) {
      res.end(JSON.stringify({tunnelUrl:'ws://' + host() + '/tunnel/control?slug=aws-owner',
        instance:{id:'9e02142d-e43b-42f3-892d-374033d39ca0',kind:'cli'}}));
      return;
    }
    if (req.headers.cookie !== 'hub-owner=fixture') {res.writeHead(401).end();return;}
    if (req.headers.origin !== undefined && req.headers.origin !== origin) {res.writeHead(403).end();return;}
    const id = String(++seq).padStart(43,'x');
    const socket = new Promise(resolve => pending.set(id, resolve));
    control.send(JSON.stringify({type:'open',id}));
    const stream = await socket;
    const agent = new http.Agent();
    agent.createConnection = () => stream;
    const headers = {...req.headers,host:'ned-com','x-ned-instance':'aws-owner',
      'x-forwarded-host':host(),'x-forwarded-proto':'http',connection:'close'};
    delete headers.authorization;
    delete headers.cookie;
    const upstream = http.request({host:'127.0.0.1',path:req.url,method:req.method,headers,agent},reply=>{
      res.writeHead(reply.statusCode,{...reply.headers,'x-ned-hub-access':'1'});
      reply.pipe(res);
    });
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    res.on('close',()=>agent.destroy());
    req.pipe(upstream);
  });
  origin = await listen(hub);
  const wss = new WebSocketServer({server:hub});
  const ready = once(wss,'ownerReady');
  wss.on('connection',(ws,req)=>{
    assert.equal(req.headers.authorization,'Bearer ' + token);
    if(req.url.startsWith('/tunnel/control')){
      control=ws;
      ws.send(JSON.stringify({type:'ready'}));
      wss.emit('ownerReady');
    }else{
      const id = new URL(req.url,origin).searchParams.get('id');
      const accept = pending.get(id);
      pending.delete(id);
      accept(createWebSocketStream(ws));
    }
  });
  t.after(async()=>{for(const ws of wss.clients)ws.terminate();wss.close();hub.closeAllConnections();await new Promise(resolve=>hub.close(resolve));});
  return {origin,ready};
}
