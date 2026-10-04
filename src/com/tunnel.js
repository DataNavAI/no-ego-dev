import { spawn } from 'node:child_process';

export async function stopTunnel(child) {
 if (!child || child.exitCode !== null || child.signalCode !== null) return;
 await new Promise(resolve => {
  const timer=setTimeout(()=>{child.kill('SIGKILL');},1000);
  const hard=setTimeout(resolve,2000);
  child.once('exit',()=>{clearTimeout(timer);clearTimeout(hard);resolve();});
  child.kill('SIGTERM');
 });
}
export async function quickTunnel(origin,{binary='cloudflared',timeoutMs=20000,signal}={}) {
 const child=spawn(binary,['tunnel','--url',origin,'--no-autoupdate'],{stdio:['ignore','pipe','pipe']});
 try {
  const publicOrigin=await new Promise((resolve,reject)=>{
   let tail=''; let settled=false;
   const finish=(error,url)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);child.off('error',onError);child.off('exit',onExit);error?reject(error):resolve(url);};
   const abort=()=>finish(new Error('Tunnel startup cancelled'));
   const timer=setTimeout(()=>finish(new Error('Cloudflared tunnel startup timed out; retry or use --local')),timeoutMs);
   const onError=()=>finish(new Error('cloudflared not found or could not start; install cloudflared or use --local'));
   const onExit=()=>finish(new Error('Cloudflared tunnel exited before providing a URL; retry or use --local'));
   child.once('error',onError);child.once('exit',onExit);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   const consume=data=>{tail=(tail+data.toString()).slice(-4096);const match=tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/);if(match)finish(null,match[0]);};
   child.stdout.on('data',consume);child.stderr.on('data',consume);
  });
  // Drain output without logging user/environment data or capability tokens.
  return { child, publicOrigin, close:()=>stopTunnel(child) };
 } catch(error) { await stopTunnel(child);throw error; }
}
