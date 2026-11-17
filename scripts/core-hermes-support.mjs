import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,link,unlink} from 'node:fs/promises';
import path from 'node:path';

export async function cachedArchive(filename,checksum,download){
  const validate=bytes=>{if(createHash('sha256').update(bytes).digest('hex')!==checksum)throw new Error('Hermes source checksum mismatch.');return bytes;};
  try{return validate(await readFile(filename));}catch(error){if(error.code!=='ENOENT')throw error;}
  const bytes=validate(await download());
  const temporary=path.join(path.dirname(filename),`.archive-${randomUUID()}`);
  try{
    await writeFile(temporary,bytes,{mode:0o600,flag:'wx'});
    try{await link(temporary,filename);}catch(error){if(error.code!=='EEXIST')throw error;}
    return validate(await readFile(filename));
  }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}

export async function runCommand(binary,args,{cwd,env=process.env,timeout=600000,grace=10000,signal,stdio='inherit',onSpawn=()=>{}}={}){
  signal?.throwIfAborted();
  const child=spawn(binary,args,{cwd,env,stdio,detached:true});
  let timedOut=false,interrupted=false,forced,failure;
  const send=name=>{if(child.pid)try{process.kill(-child.pid,name);}catch(error){if(error.code!=='ESRCH')throw error;}};
  const terminate=()=>{send('SIGTERM');forced??=setTimeout(()=>send('SIGKILL'),grace);};
  const abort=()=>{interrupted=true;terminate();};
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;terminate();},timeout);
  try{
    const result=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,name)=>{
      if(timedOut||interrupted||code!==0)reject(new Error(`${binary} failed (${timedOut?'timeout':interrupted?'interrupted':code??name}).`));
      else resolve();
    });});
    onSpawn(child);
    await result;
  }catch(error){failure=error;}finally{
    if((timedOut||interrupted)&&child.pid){
      const deadline=Date.now()+grace;
      while(true){
        try{process.kill(-child.pid,0);}catch(error){if(error.code!=='ESRCH')failure??=error;break;}
        if(Date.now()>=deadline){send('SIGKILL');break;}
        await new Promise(resolve=>setTimeout(resolve,20));
      }
    }
    clearTimeout(timer);clearTimeout(forced);signal?.removeEventListener('abort',abort);
  }
  if(failure)throw failure;
}
