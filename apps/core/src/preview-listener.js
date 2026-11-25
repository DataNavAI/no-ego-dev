import {readFile,readdir,readlink,stat,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const exec=promisify(execFile);
const run=async(command,args)=>(await exec(command,args,{timeout:1500,maxBuffer:65536})).stdout;
export async function inspectPreviewListener(port,project){
  let identity;
  if(process.platform==='linux'){
    const rows=(await readFile('/proc/net/tcp','utf8')).split('\n').slice(1).map(s=>s.trim().split(/\s+/)).filter(a=>a[3]==='0A'&&parseInt(a[1]?.split(':')[1],16)===port);
    if(rows.length!==1||rows[0][1].split(':')[0]!=='0100007F')throw new Error('Unverified listener');
    const inode=rows[0][9];
    for(const entry of (await readdir('/proc')).filter(s=>/^\d+$/.test(s)).slice(0,32768)){
      try{
        if((await stat('/proc/'+entry)).uid!==process.getuid())continue;
        const fds=await readdir(`/proc/${entry}/fd`);let found=false;
        for(const fd of fds.slice(0,4096))if(await readlink(`/proc/${entry}/fd/${fd}`).catch(()=>null)===`socket:[${inode}]`){found=true;break;}
        if(!found)continue;
        const raw=await readFile(`/proc/${entry}/stat`,'utf8'),fields=raw.slice(raw.lastIndexOf(')')+2).split(' ');
        identity={pid:Number(entry),uid:process.getuid(),start:fields[19],socket:inode,cwd:await realpath(`/proc/${entry}/cwd`)};break;
      }catch{continue;}
    }
  }else if(process.platform==='darwin'){
    const lines=(await run('/usr/sbin/lsof',['-nP','-a',`-iTCP:${port}`,'-sTCP:LISTEN','-FpuFn'])).trim().split('\n');
    const pids=lines.filter(s=>s.startsWith('p'));const names=lines.filter(s=>s.startsWith('n'));
    if(pids.length!==1||names.length!==1||names[0]!==`n127.0.0.1:${port}`||lines.find(s=>s.startsWith('u'))!==`u${process.getuid()}`)throw new Error('Unverified listener');
    const pid=Number(pids[0].slice(1)),cwd=(await run('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn'])).split('\n').find(s=>s.startsWith('n'))?.slice(1);
    identity={pid,uid:process.getuid(),start:(await run('/bin/ps',['-p',String(pid),'-o','lstart=','-o','comm='])).trim(),socket:lines.find(s=>s.startsWith('f')),cwd:await realpath(cwd)};
  }
  if(!identity?.start)throw new Error('Listener identity unavailable');
  const relative=path.relative(project,identity.cwd);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('Listener outside project');
  return identity;
}
export const samePreviewListener=(a,b)=>Boolean(a&&b&&['pid','uid','start','socket','cwd'].every(key=>a[key]===b[key]));
