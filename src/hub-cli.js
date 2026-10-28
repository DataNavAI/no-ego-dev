import http from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {canonicalHubOrigin,resolveHubOrigin,createHubCredentialStore,validHubCredential} from './hub-credentials.js';

const cleanupWarning='NED Hub credential lock cleanup failed. Credentials reflect the completed command; see the Hub setup guide for recovery before another login/logout.';
async function jsonResponse(response) {
  if(!response.ok){await response.body?.cancel();throw new Error('Hub request rejected.');}
  if(!response.headers.get('content-type')?.startsWith('application/json')){await response.body?.cancel();throw new Error('Invalid Hub response.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty Hub response.');
  const chunks=[];let bytes=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192)throw new Error('Hub response too large.');chunks.push(value);}}finally {await reader.cancel().catch(()=>{});}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function openHubBrowser(url) {
  const [command,args]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['rundll32',['url.dll,FileProtocolHandler',url]]:['xdg-open',[url]];
  return new Promise((resolve,reject)=>execFile(command,args,{timeout:10000,windowsHide:true},error=>error?reject(error):resolve()));
}
async function revoke(origin,token,signal) {
  const response=await fetch(new URL('/api/oauth/token',origin),{method:'DELETE',headers:{Authorization:`Bearer ${token}`},redirect:'error',signal});
  await response.body?.cancel();
  if(![204,401].includes(response.status))throw new Error('Hub revocation failed.');
}
export async function loginToHub(origin,{store,io=console,openBrowser=openHubBrowser,noBrowser=false,signal,timeoutMs=300000}={}) {
  origin=canonicalHubOrigin(origin);
  const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  const deadline=setTimeout(abort,timeoutMs);
  const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  let settled=false,accept,rejectCallback,redirectUri;
  const callback=new Promise((resolve,reject)=>{accept=resolve;rejectCallback=reject;});
  // Observe rejection immediately while the browser command is starting.
  callback.catch(()=>{});
  const rejectAborted=()=>{settled=true;rejectCallback(new Error('Hub login interrupted or timed out.'));};
  controller.signal.addEventListener('abort',rejectAborted,{once:true});
  const server=http.createServer((req,res)=>{
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
    const bad=()=>{res.writeHead(400);res.end('Invalid login callback.');};
    if(settled){res.writeHead(410);res.end('Login attempt finished.');return;}
    if(req.method!=='GET'||req.headers.host!==new URL(redirectUri).host||!req.url||req.url.length>2048||!req.url.startsWith('/oauth/callback?'))return bad();
    let url;try {url=new URL(req.url,redirectUri);}catch {return bad();}
    const keys=[...url.searchParams.keys()];
    if(url.pathname!=='/oauth/callback'||url.origin!==new URL(redirectUri).origin||keys.length!==2||new Set(keys).size!==2||url.searchParams.get('state')!==state)return bad();
    const code=url.searchParams.get('code'),error=url.searchParams.get('error');
    if((code&&!/^[A-Za-z0-9_-]{20,256}$/.test(code))||(!code&&error!=='access_denied'))return bad();
    settled=true;res.end(error?'Login denied. You may close this window.':'Return to the NED terminal to finish login.');
    if(error)rejectCallback(new Error('Hub login denied.'));else accept(code);
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.maxHeadersCount=16;server.maxConnections=8;
  server.on('clientError',(_error,socket)=>socket.destroy());
  let credential,saved=false;
  try {
    if(controller.signal.aborted)throw new Error('Hub login interrupted.');
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    controller.signal.throwIfAborted();
    redirectUri=`http://127.0.0.1:${server.address().port}/oauth/callback`;
    const authorize=new URL('/api/oauth/authorize',origin);
    for(const [key,value] of Object.entries({response_type:'code',client_id:'ned-cli',redirect_uri:redirectUri,code_challenge:challenge,code_challenge_method:'S256',state}))authorize.searchParams.set(key,value);
    io.log(`Open this URL to sign in to NED Hub:\n${authorize.href}`);
    if(!noBrowser)void Promise.resolve().then(()=>openBrowser(authorize.href)).catch(()=>{if(!controller.signal.aborted)io.log('Browser could not open. Use the URL above.');});
    const code=await callback;
    const response=await fetch(new URL('/api/oauth/token',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:'ned-cli',code,redirect_uri:redirectUri,code_verifier:verifier}),redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    const result=await jsonResponse(response);
    credential={hub:origin,token:result.access_token,tokenId:result.token_id,account:result.account};
    if(result.token_type!=='Bearer'||!validHubCredential(credential,origin))throw new Error('Invalid Hub credential response.');
    controller.signal.throwIfAborted();
    const stored=await store.write(credential);saved=true;
    if(stored?.cleanupWarning)io.error?.(cleanupWarning);
    io.log(`Signed in to NED Hub at ${origin}.`);
    return credential;
  }finally {
    clearTimeout(deadline);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAborted);
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    if(credential&&!saved&&validHubCredential(credential,origin))await revoke(origin,credential.token,AbortSignal.timeout(5000)).catch(()=>{});
  }
}
export async function runHubAuthentication(action,io=console,dependencies={}) {
  let hub;
  try {hub=resolveHubOrigin(dependencies.env||process.env);}
  catch {io.error('NEDCOM: configure a valid NED_HUB_ENV or NED_HUB_URL.');return 2;}
  const store=dependencies.hubCredentialStore||createHubCredentialStore({home:dependencies.home});
  const signals=dependencies.signals||process;const controller=new AbortController();const stop=()=>controller.abort();
  signals.on('SIGINT',stop);signals.on('SIGTERM',stop);
  try {
    if(action==='login')await loginToHub(hub,{store,io,noBrowser:dependencies.noBrowser,openBrowser:dependencies.openBrowser,signal:controller.signal,timeoutMs:dependencies.timeoutMs});
    else {
      const saved=await store.read(hub);
      if(saved){await revoke(hub,saved.token,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]));const removed=await store.remove(hub,saved.token);if(removed?.cleanupWarning)io.error(cleanupWarning);}
      io.log(`Signed out of NED Hub at ${hub}.`);
    }
    return 0;
  }catch {io.error(action==='login'?'NED Hub login failed, was denied, interrupted or timed out. Previous credentials were preserved.':'NED Hub logout failed. Saved credentials were retained; retry when the Hub is available.');return 1;}
  finally {signals.off('SIGINT',stop);signals.off('SIGTERM',stop);}
}
