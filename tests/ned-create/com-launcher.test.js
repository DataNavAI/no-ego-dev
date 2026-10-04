import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runLauncher } from '../../src/launcher.js';

async function until(fn, timeout=5000) {
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline) { try {const value=await fn();if(value)return value;} catch {} await new Promise(r=>setTimeout(r,25)); }
 throw new Error('Lifecycle condition timed out');
}
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
for(const [signal,group] of [['SIGTERM',false],['SIGINT',false],['SIGINT',true]]) for(const local of [true,false]) {
 test(`installed launcher ${group?'process-group ':''}${signal} waits for COM ${local?'local':'tunnel'} shutdown`, async t=>{
  const home=await mkdtemp(join(tmpdir(),'com-installed-'));const state=join(home,'receipt.json');
  await mkdir(join(home,'.local/share/ned/current'),{recursive:true});
  await symlink(resolve('.'),join(home,'.local/share/ned/current/app'));
  const root=join(home,'review');await mkdir(root);await writeFile(join(root,'report.md'),'# Report');
  const bin=join(home,'bin');await mkdir(bin);
  await writeFile(join(bin,'cloudflared'),`#!${process.execPath}\nconsole.error('https://fixture.trycloudflare.com');setInterval(()=>{},1000);process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),100));\n`,{mode:0o700});
  const child=spawn(process.execPath,['bin/ned-launcher.js','serve','--root',root,'--state',state,'--port','0',...(local?['--local']:[])],{detached:group,env:{...process.env,HOME:home,PATH:bin+':'+process.env.PATH},stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',d=>errors+=d);child.stdout.resume();let receipt;
  t.after(async()=>{child.kill('SIGKILL');if(receipt){for(const pid of [receipt.pid,receipt.tunnelPid].filter(Boolean))if(alive(pid))process.kill(pid,'SIGKILL');}await rm(home,{recursive:true,force:true});});
  receipt=await until(async()=>{const r=JSON.parse(await readFile(state,'utf8'));return r.status==='running'&&r;});
  assert.equal((await fetch(receipt.localOrigin+`/s/${receipt.capability}/api/health`)).status,200);
  const closed=new Promise(r=>child.once('close',(code,sig)=>r({code,sig})));if(group)process.kill(-child.pid,signal);else child.kill(signal);
  let timer;
  const result=await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Launcher failed to exit: '+errors)),6000);})]).finally(()=>clearTimeout(timer));
  assert.equal(JSON.parse(await readFile(state,'utf8')).status,'stopped','launcher must wait for receipt cleanup');
  assert.equal(alive(receipt.pid),false,'COM child must be reaped');
  if(receipt.tunnelPid)assert.equal(alive(receipt.tunnelPid),false,'owned tunnel must stop');
  await assert.rejects(fetch(receipt.localOrigin));assert.equal(result.sig,null);
 });
}
test('launcher spawn failure rejects cleanly and removes signal listeners', async()=>{
 const before=['SIGTERM','SIGINT'].map(s=>process.listenerCount(s));
 await assert.rejects(runLauncher(['--version'],{home:'/unused',generation:'/unused',exists:()=>true,node:'/nonexistent/ned-node'}),/could not start/i);
 assert.deepEqual(['SIGTERM','SIGINT'].map(s=>process.listenerCount(s)),before);
});
