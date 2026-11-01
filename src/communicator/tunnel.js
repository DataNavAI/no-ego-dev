import http from 'node:http';
import {spawn} from 'node:child_process';
export async function startPublicTunnel(target,{env=process.env,spawn:launch=spawn,startupTimeout=30000,signal}={}) {
  const local=new URL(target);
  if(local.protocol!=='http:'||local.hostname!=='127.0.0.1')throw new Error('Invalid tunnel target.');
  let publicUrl,child,closed=false,failed;
  const failure=new Promise(resolve=>{failed=resolve;});
  const sockets=new Set();
  const bridge=http.createServer((req,res)=>{
    if(!publicUrl){res.writeHead(503);res.end();return;}
    if(req.headers.host!==new URL(publicUrl).host||(req.headers.origin!==undefined&&req.headers.origin!==publicUrl)){res.writeHead(403);res.end();return;}
    if(/^\/api\/secrets(?:\/|\?|$)/.test(req.url)){res.writeHead(403);res.end();return;}
    const headers={...req.headers,host:local.host};
    if(headers.origin)headers.origin=local.origin;
    delete headers['x-forwarded-host'];delete headers['x-forwarded-proto'];delete headers.forwarded;
    const upstream=http.request(local,{method:req.method,path:req.url,headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    upstream.setTimeout(610000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    res.on('close',()=>upstream.destroy());req.pipe(upstream);
  });
  bridge.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
  const close=async()=>{
    if(closed)return;closed=true;publicUrl=undefined;
    for(const socket of sockets)socket.destroy();
    await new Promise(resolve=>bridge.close(()=>resolve()));
    if(child&&child.exitCode==null&&child.signalCode==null)await new Promise(resolve=>{
      const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},2000);timer.unref();
      child.once('close',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');
    });
  };
  try {
    await new Promise((resolve,reject)=>{bridge.once('error',reject);bridge.listen(0,'127.0.0.1',resolve);});
    if(signal?.aborted)throw new Error('Public tunnel startup cancelled.');
    child=launch(env.NED_CLOUDFLARED_BIN||'cloudflared',['tunnel','--config','/dev/null','--url',`http://127.0.0.1:${bridge.address().port}`],{env,stdio:['ignore','pipe','pipe']});
    const url=await new Promise((resolve,reject)=>{
      let output='';
      const timer=setTimeout(()=>reject(new Error('Public tunnel startup timed out.')),startupTimeout);
      const abort=()=>{clearTimeout(timer);reject(new Error('Public tunnel startup cancelled.'));};
      signal?.addEventListener('abort',abort,{once:true});
      child.once('close',()=>signal?.removeEventListener('abort',abort));
      const fail=()=>{clearTimeout(timer);reject(new Error('Public tunnel failed. Install cloudflared and retry.'));failed();};
      child.once('error',fail);child.once('close',()=>{if(!closed){fail();void close();}});
      const parse=chunk=>{output=(output+chunk.toString()).slice(-8192);const match=output.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com(?=[\s|/]|$)/);if(match){clearTimeout(timer);signal?.removeEventListener('abort',abort);publicUrl=match[0];resolve(publicUrl);}};
      child.stdout.on('data',parse);child.stderr.on('data',parse);
    });
    return {url,failure,close};
  } catch(error) {await close();throw error;}
}
