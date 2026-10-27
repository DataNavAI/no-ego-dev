import http from 'node:http';
import {pipeline} from 'node:stream';
import WebSocket, {createWebSocketStream} from 'ws';

// Keep admission identical to Hub store.validSlug: public slugs are permanent identities.
const reservedSlugs = new Set(['api','auth','tunnel','healthz','assets','connect','favicon','robots','login','logout']);
const loopback = hostname => ['127.0.0.1','localhost','[::1]'].includes(hostname);
export function readHubConfiguration(env = process.env) {
  const keys = ['NED_HUB_URL','NED_HUB_TOKEN','NED_HUB_SLUG','NED_HUB_NAME','NED_HUB_PROXY_URL','NED_HUB_INSTANCE_ORIGINS'];
  if (!keys.some(key => env[key] !== undefined)) return null;
  const {NED_HUB_URL: hubUrl,NED_HUB_TOKEN: token,NED_HUB_SLUG: slug} = env;
  let hub;
  try { hub = new URL(hubUrl); } catch { throw new Error('Invalid NED Hub configuration.'); }
  if (!['http:','https:'].includes(hub.protocol) || hub.username || hub.password || hub.pathname !== '/' || hub.search || hub.hash || (hub.protocol !== 'https:' && !loopback(hub.hostname)) || !/^ned_[A-Za-z0-9_-]{20,}$/.test(token || '') || (!/^[a-z][a-z0-9-]{2,39}$/.test(slug || '') || reservedSlugs.has(slug))) throw new Error('Invalid NED Hub configuration.');
  const name = env.NED_HUB_NAME ?? slug;
  if (!name.trim() || name.length > 80) throw new Error('Invalid NED Hub configuration.');
  let proxy;
  try { proxy = new URL(env.NED_HUB_PROXY_URL ?? hub); } catch { throw new Error('Invalid NED Hub configuration.'); }
  if (!env.NED_HUB_PROXY_URL && !loopback(hub.hostname)) proxy.hostname = `proxy.${hub.hostname}`;
  if (!['http:','https:'].includes(proxy.protocol) || proxy.username || proxy.password || proxy.pathname !== '/' || proxy.search || proxy.hash || (proxy.protocol !== 'https:' && !loopback(proxy.hostname))) throw new Error('Invalid NED Hub configuration.');
  const local = loopback(hub.hostname) && loopback(proxy.hostname);
  const mode = env.NED_HUB_INSTANCE_ORIGINS;
  if ((mode !== undefined && !['true','false'].includes(mode)) || (!local && mode === 'false')) throw new Error('Invalid NED Hub configuration.');
  const isolated = mode === 'true' || !local;
  if (isolated && ['127.0.0.1','[::1]'].includes(proxy.hostname)) throw new Error('Isolated local instances require a localhost proxy hostname.');
  const instance = new URL(proxy);
  if (isolated) instance.hostname = `${slug}.${proxy.hostname}`;
  return {hub,proxy,instance,token,slug,name};
}

// This bridge has no listening socket: only authenticated Hub data channels enter it.
function createBridge(config, target) {
  return http.createServer((req,res) => {
    if (req.headers.host !== 'ned-com' || req.headers['x-ned-instance'] !== config.slug || req.headers['x-forwarded-host'] !== config.instance.host || req.headers['x-forwarded-proto'] !== config.instance.protocol.slice(0,-1) || (req.headers.origin !== undefined && req.headers.origin !== config.instance.origin)) {
      res.writeHead(403);res.end();return;
    }
    if (!req.url.startsWith('/') || req.url.startsWith('//')) {res.writeHead(400);res.end();return;}
    const headers = {...req.headers,host:target.host};
    if (headers.origin !== undefined) headers.origin = target.origin;
    for (const key of Object.keys(headers)) if (key.startsWith('x-forwarded-') || key === 'x-ned-instance') delete headers[key];
    const upstream = http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers},response => {
      res.writeHead(response.statusCode,response.headers);
      pipeline(response,res,()=>{});
    });
    upstream.setTimeout(120000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    res.on('close',()=>upstream.destroy());
    pipeline(req,upstream,()=>{});
  });
}

export function startHubConnection(config,targetUrl,{onStatus = ()=>{}, retryDelay} = {}) {
  const target = new URL(targetUrl);
  if (target.protocol !== 'http:' || !loopback(target.hostname) || target.pathname !== '/' || target.username || target.password || target.search || target.hash) throw new Error('Invalid COM target.');
  const bridge = createBridge(config,target);
  const streams = new Set();
  let stopped = false,control,retry,heartbeat,attempt = 0,abort;
  let lastStatus;
  const status = value => {if(value !== lastStatus){lastStatus=value;onStatus(value);}};
  function schedule() {
    if (stopped) return;
    status('offline; retrying');
    retry = setTimeout(connect,retryDelay ?? Math.min(30000,500 * 2 ** Math.min(attempt++,6)) + Math.random()*500);
  }
  async function connect() {
    if(stopped)return;
    abort = new AbortController();
    const deadline = setTimeout(()=>abort.abort(),15000);
    try {
      status('connecting');
      const response = await fetch(new URL('/api/instances',config.hub),{method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},body:JSON.stringify({slug:config.slug,name:config.name}),signal:abort.signal,redirect:'error'});
      if(!response.ok){response.body?.cancel();if([400,401,403,409].includes(response.status)){stopped=true;status(`registration rejected (${response.status}); local COM remains available`);return;}throw new Error();}
      // Bound the only buffered protocol message, independent of response Content-Length.
      const reader=response.body.getReader();let bytes=0,text='';
      try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16384)throw new Error();text+=Buffer.from(value).toString('utf8');}} finally {await reader.cancel().catch(()=>{});}
      const endpoint = new URL(JSON.parse(text).tunnelUrl);
      const expected = new URL('/tunnel/control',config.proxy);expected.protocol = config.proxy.protocol === 'https:' ? 'wss:' : 'ws:';expected.searchParams.set('slug',config.slug);
      if(endpoint.href !== expected.href) {stopped=true;status('invalid tunnel endpoint; local COM remains available');return;}
      if(stopped)return;
      control = new WebSocket(endpoint,{headers:{Authorization:`Bearer ${config.token}`},handshakeTimeout:10000,maxPayload:65536,perMessageDeflate:false,followRedirects:false});
      const current=control;let alive=true;
      heartbeat=setInterval(()=>{if(!alive)current.terminate();else if(current.readyState===WebSocket.OPEN){alive=false;current.ping();}},15000);
      current.on('pong',()=>{alive=true;});
      current.on('message',data=>{
        let message;try{message=JSON.parse(data.toString());}catch{return;}
        if(message?.type==='ready'){attempt=0;status('online');return;}
        if(message?.type!=='open'||typeof message.id!=='string'||!/^[\w-]{43}$/.test(message.id)||streams.size>=64)return;
        const url=new URL('/tunnel/data',endpoint);url.searchParams.set('id',message.id);
        const ws=new WebSocket(url,{headers:{Authorization:`Bearer ${config.token}`},handshakeTimeout:10000,maxPayload:1024*1024,perMessageDeflate:false,followRedirects:false});
        const stream=createWebSocketStream(ws);streams.add(stream);
        stream.on('error',()=>{});stream.on('close',()=>streams.delete(stream));
        bridge.emit('connection',stream);
      });
      current.on('error',()=>{});
      current.on('unexpected-response',(_req,res)=>{res.destroy();if([401,403].includes(res.statusCode)){stopped=true;status('tunnel authorization rejected; local COM remains available');}current.terminate();});
      current.once('close',()=>{clearInterval(heartbeat);for(const stream of streams)stream.destroy();schedule();});
    } catch {schedule();} finally {clearTimeout(deadline);}
  }
  void connect();
  return {async close(){stopped=true;clearTimeout(retry);clearInterval(heartbeat);abort?.abort();control?.terminate();for(const stream of streams)stream.destroy();bridge.closeAllConnections();}};
}
