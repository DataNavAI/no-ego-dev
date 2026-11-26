import {openSync,readSync,closeSync,readdirSync} from 'node:fs';
import path from 'node:path';

// Inspect this container's process namespace only. Never return command lines,
// paths, PIDs or user content; unknown processes conservatively defer updates.
export function createManagedProcessInspector({env=process.env,procRoot='/proc',pid=process.pid,platform=process.platform}={}){
  if(platform!=='linux')return ()=>({idle:false,reason:'unknown_activity'});
  let trusted;
  const boundedRead=(file,limit)=>{const fd=openSync(file,'r');try{const buffer=Buffer.alloc(limit+1),size=readSync(fd,buffer,0,buffer.length,0);if(size>limit)throw Error();return buffer.subarray(0,size).toString('utf8');}finally{closeSync(fd);}};
  const stat=id=>{const value=boundedRead(path.join(procRoot,String(id),'stat'),8192);if(value.lastIndexOf(')')<1)throw Error();const fields=value.slice(value.lastIndexOf(')')+2).split(' ');const parent=Number(fields[1]);if(!Number.isSafeInteger(parent)||parent<0||!/^\d+$/.test(fields[19]??''))throw Error();return {parent,state:fields[0],started:fields[19]};};
  try{
    const extra=env.NED_PLATFORM_PIDS?.split(',');if(!extra?.length||extra.length>16||extra.some(id=>!/^\d{1,10}$/.test(id)||Number(id)<1))throw Error();
    const ids=new Set([pid,...extra.map(Number)]);let current=pid;
    for(let i=0;current&&i<16;i++){ids.add(current);current=stat(current).parent;}if(current)throw Error();
    trusted=new Map([...ids].map(id=>[id,stat(id).started]));
  }catch{return ()=>({idle:false,reason:'unknown_activity'});}
  function isHealth(id){
    let file;try{file=openSync(path.join(procRoot,String(id),'cmdline'),'r');const buffer=Buffer.alloc(512),size=readSync(file,buffer,0,buffer.length,0);const args=buffer.subarray(0,size).toString('utf8').split('\0',2);return path.basename(args[0])==='node'&&args[1]==='/opt/ned-managed/health.js';}finally{if(file!==undefined)closeSync(file);}
  }
  return ()=>{
    try{
      for(const [id,started]of trusted)if(stat(id).started!==started)return {idle:false,reason:'unknown_activity'};
      const ids=readdirSync(procRoot).filter(id=>/^\d+$/.test(id));if(ids.length>128)return {idle:false,reason:'unknown_activity'};
      for(const id of ids){if(trusted.has(Number(id)))continue;try{if(stat(id).state==='Z'||isHealth(id))continue;}catch(error){if(error.code==='ENOENT')continue;throw error;}return {idle:false,reason:'active_command'};}
      return {idle:true};
    }catch{return {idle:false,reason:'unknown_activity'};}
  };
}
