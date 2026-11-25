import http from 'node:http';
import net from 'node:net';
import {randomBytes,createHash} from 'node:crypto';
import {pipeline,Transform} from 'node:stream';
const nonce=()=>randomBytes(32).toString('base64url'),hash=s=>createHash('sha256').update(s).digest('hex');
const cookieNames=['__Host-ned_preview_frame','__Host-ned_preview'];
export const previewBootstrapPath='/__ned/preview/bootstrap';
export function previewHeaders(headers,origin,port){
  const clean={...headers};
  for(const name of String(headers.connection??'').split(','))delete clean[name.trim().toLowerCase()];
  for(const key of Object.keys(clean))if(/^(?:authorization|proxy-|forwarded|x-forwarded-|x-ned-|connection$|transfer-encoding$)/i.test(key))delete clean[key];
  clean.cookie=(headers.cookie??'').split(';').filter(pair=>!/^\s*(?:__Host-ned_|ned_proxy_|ned_session=|ned_oauth=)/i.test(pair)).join(';');if(!clean.cookie)delete clean.cookie;
  clean.host=`127.0.0.1:${port}`;if(clean.origin===origin)clean.origin=`http://127.0.0.1:${port}`;
  return clean;
}
export function createPreviewDelivery({service,boundOrigin,isControlAuthorization=()=>true}){
  let server,basePort,starting,closed=false;const grants=new Map(),leases=new Map(),active=new Set();
  const comOrigin=()=>typeof boundOrigin==='function'?boundOrigin():boundOrigin;
  const generationOrigin=state=>`http://pv-${state.preview.id.replaceAll('-','')}.localhost:${basePort}`;
  const live=async context=>{
    if(closed||context.expires<=Date.now()||!await context.authorized())throw new Error('Preview authority expired');
    return service.binding(context.id,context.revision);
  };
  const destroy=entry=>{entry.socket?.destroy();entry.upstream?.destroy();entry.target?.destroy();active.delete(entry);};
  const sweep=setInterval(async()=>{
    for(const map of [grants,leases])for(const [key,value] of map)if(value.expires<=Date.now())map.delete(key);
    for(const entry of [...active])try{await live(entry.context);}catch{destroy(entry);}
  },2000);sweep.unref();
  async function relay(req,target,head,context){
    const upgrade=Boolean(head),httpCount=[...active].filter(e=>!e.upgrade).length,wsCount=active.size-httpCount;
    const reject=code=>{if(upgrade){target.end(`HTTP/1.1 ${code} Preview unavailable\r\nConnection: close\r\n\r\n`);}else{if(!target.headersSent)target.writeHead(code,{'cache-control':'no-store'});target.end('Preview unavailable');}};
    if((upgrade?wsCount>=16:httpCount>=32)||closed)return reject(503);
    if(!req.url?.startsWith('/')||req.url.startsWith('//')||[...req.url].some(c=>c.charCodeAt(0)<=32||c==='\\')||req.url.startsWith('/__ned/preview/')||req.headers['service-worker']||/worker/i.test(req.headers['sec-fetch-dest']??''))return reject(403);
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==context.origin)return reject(403);
    if(upgrade&&req.headers.origin!==context.origin)return reject(403);
    const entry={context,target,upgrade};active.add(entry);target.once('close',()=>destroy(entry));
    try{
      const binding=await live(context);if(target.destroyed)throw new Error();
      const socket=net.connect({host:'127.0.0.1',port:binding.port});entry.socket=socket;
      await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);socket.setTimeout(5000,()=>socket.destroy(new Error('Preview connect timeout')));});
      await live(context);if(target.destroyed)throw new Error();socket.setTimeout(120000,()=>socket.destroy());
      const headers=previewHeaders(req.headers,context.origin,binding.port);
      if(req.headers.authorization&&!isControlAuthorization(req.headers.authorization))headers.authorization=req.headers.authorization;
      if(upgrade){headers.connection='Upgrade';headers.upgrade=req.headers.upgrade;}
      const agent=new http.Agent({keepAlive:false});agent.createConnection=()=>socket;
      const upstream=http.request({host:'127.0.0.1',port:binding.port,path:req.url,method:req.method,headers,agent,maxHeaderSize:32768},response=>{
        if(upgrade){response.destroy();return reject(502);}
        const output={...response.headers,'cache-control':'private, no-store','origin-agent-cluster':'?1','permissions-policy':'document-domain=()','cross-origin-opener-policy':'same-origin','referrer-policy':'origin'};
        for(const key of ['connection','transfer-encoding','keep-alive','proxy-authenticate','proxy-authorization','trailer','upgrade'])delete output[key];
        output['content-security-policy']=[...(Array.isArray(output['content-security-policy'])?output['content-security-policy']:output['content-security-policy']?[output['content-security-policy']]:[]),"worker-src 'none'"];
        if(output['set-cookie'])output['set-cookie']=output['set-cookie'].filter(s=>!/^\s*(?:__Host-ned_|ned_proxy_|ned_session=|ned_oauth=)/i.test(s)&&! /;\s*Domain\s*=/i.test(s));
        if(output.location){try{const location=new URL(output.location,context.origin);if(location.origin===`http://127.0.0.1:${binding.port}`)output.location=context.origin+location.pathname+location.search+location.hash;else if(location.origin!==context.origin&&(/^(?:(?:.*\.)?localhost$|127\.|\[(?:::1|f[cd][0-9a-f]*:|fe[89ab][0-9a-f]*:))/.test(location.hostname)||/^(?:10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(location.hostname)))throw new Error();}catch{response.destroy();return reject(502);}}
        target.writeHead(response.statusCode,output);pipeline(response,target,()=>destroy(entry));
      });entry.upstream=upstream;
      upstream.on('upgrade',(response,appSocket,appHead)=>{
        if(!upgrade){appSocket.destroy();return;}
        let status=`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n`;
        for(const [name,value] of Object.entries(response.headers))if(value!==undefined&&!['set-cookie','authorization','proxy-authorization'].includes(name))status+=`${name}: ${Array.isArray(value)?value.join(', '):value}\r\n`;
        target.write(status+'\r\n');if(appHead.length)target.write(appHead);if(head.length)appSocket.write(head);
        target.pipe(appSocket);appSocket.pipe(target);appSocket.once('error',()=>destroy(entry));target.once('error',()=>destroy(entry));appSocket.once('close',()=>destroy(entry));
      });
      upstream.on('error',()=>{reject(502);destroy(entry);});
      let size=0;const limit=new Transform({transform(chunk,_encoding,callback){size+=chunk.length;callback(size>33554432?new Error('Body limit'):null,chunk);}});
      pipeline(req,limit,upstream,error=>{if(error)destroy(entry);});
    }catch{reject(503);destroy(entry);}
  }
  function cookie(req){const values=(req.headers.cookie??'').split(';').map(p=>p.trim().split('='));for(const name of cookieNames){const matches=values.filter(p=>p[0]===name);if(matches.length>1)return null;if(matches.length===1)return leases.get(hash(matches[0][1]??''));}return null;}
  async function handle(req,res,head){
    const state=service.snapshot(),origin=state.preview&&generationOrigin(state);
    if(!origin||req.headers.host!==new URL(origin).host){if(head)res.end('HTTP/1.1 403 Forbidden\r\n\r\n');else{res.writeHead(403);res.end('Preview unavailable');}return;}
    if(!head&&req.url===previewBootstrapPath){
      try{
        if(req.method!=='POST'||req.headers.origin!==comOrigin()||!/^application\/x-www-form-urlencoded(?:;.*)?$/.test(req.headers['content-type']??''))throw new Error();
        let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>4096)throw new Error();text+=chunk;}
        const params=new URLSearchParams(text);if([...params.keys()].join(',')!=='grant')throw new Error();
        const key=hash(params.get('grant')??''),grant=grants.get(key);grants.delete(key);if(!grant||grant.origin!==origin)throw new Error();await live(grant);
        if(leases.size>=64)throw new Error();const raw=nonce();leases.set(hash(raw),{...grant,expires:Date.now()+900000});
        const name=grant.mode==='frame'?cookieNames[0]:cookieNames[1];res.writeHead(303,{'set-cookie':`${name}=${raw}; Path=/; HttpOnly; Secure; SameSite=None${grant.mode==='frame'?'; Partitioned':''}; Max-Age=900`,'location':'/__ned/preview/verify','cache-control':'no-store','content-security-policy':"default-src 'none'; worker-src 'none'"});res.end();
      }catch{res.writeHead(403);res.end('Preview access expired');}return;
    }
    const context=cookie(req);if(!context||context.origin!==origin){if(head)res.end('HTTP/1.1 401 Unauthorized\r\n\r\n');else{res.writeHead(401);res.end('Preview access expired');}return;}
    if(!head&&req.url==='/__ned/preview/verify'){
      try{await live(context);const token=nonce();const body=`<!doctype html><script nonce="${token}">if(parent!==self)parent.postMessage(${JSON.stringify({type:'ned-preview-ready',id:context.id,revision:context.revision})},${JSON.stringify(comOrigin())});location.replace('/')</script>`;res.writeHead(200,{'content-type':'text/html','cache-control':'no-store','content-security-policy':`default-src 'none'; script-src 'nonce-${token}'; worker-src 'none'`});res.end(body);}catch{res.writeHead(403);res.end();}return;
    }
    await relay(req,res,head,context);
  }
  const start=()=>starting??=(async()=>{server=http.createServer((req,res)=>{void handle(req,res).catch(()=>res.destroy());});server.on('upgrade',(req,socket,head)=>{void handle(req,socket,head).catch(()=>socket.destroy());});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});basePort=server.address().port;})();
  return {
    async access(mode,authorized){if(closed||!['frame','tab'].includes(mode))throw new Error('Preview unavailable');await start();const state=service.snapshot();if(!state.preview||grants.size>=64)throw new Error('Preview unavailable');const context={id:state.preview.id,revision:state.revision,origin:generationOrigin(state),authorized,expires:Date.now()+30000,mode};await live(context);if(grants.size>=64)throw new Error('Preview unavailable');const raw=nonce();grants.set(hash(raw),context);return {id:context.id,revision:context.revision,origin:context.origin,bootstrapPath:previewBootstrapPath,grant:raw};},
    relay,
    async close(){closed=true;clearInterval(sweep);grants.clear();leases.clear();for(const entry of [...active])destroy(entry);await starting?.catch(()=>{});server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));}
  };
}
