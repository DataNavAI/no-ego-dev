import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Fixed image/library adapter; no browser-selected command/module/endpoint. */
export function createHermesModelAdapter({env=process.env,profile}={}){
  const operations=new Set();
  async function executable(){
    const choices=env.NED_HERMES_PYTHON?[env.NED_HERMES_PYTHON]:['/opt/hermes/.venv/bin/python',path.join(homedir(),'.hermes/hermes-agent/venv/bin/python'),path.join(homedir(),'.hermes/hermes-agent/.venv/bin/python')];
    for(const p of choices){if(!path.isAbsolute(p))throw Error('Hermes interpreter must be absolute');try{await access(p);return p;}catch{/* Try the next fixed installation path. */}}
    throw Error('Hermes authentication adapter unavailable');
  }
  async function start(input,{event=()=>{},beforeCommit=async()=>()=>{}}={}){
    const python=await executable();
    const child=spawn(python,['-I',fileURLToPath(new URL('./hermes-model.py',import.meta.url))],{env:{...env,HERMES_HOME:profile,PYTHONNOUSERSITE:'1',HERMES_INTERACTIVE:'0'},stdio:['pipe','pipe','ignore']});
    let buffer='',bytes=0,finished=false,release,committing=false,timer,success=false;
    const stop=()=>{if(finished)return;child.kill('SIGTERM');timer=setTimeout(()=>{if(!finished)child.kill('SIGKILL');},1000);timer.unref();};
    const done=new Promise((resolve,reject)=>{
      child.once('error',()=>reject(Error('Hermes authentication adapter unavailable')));
      child.once('close',async code=>{finished=true;clearTimeout(timer);try{await release?.();code===0&&success?resolve():reject(Error('Hermes authentication failed'));}catch{reject(Error('Hermes authentication cleanup failed'));}});
      child.stdout.on('data',chunk=>{
        bytes+=chunk.length;if(bytes>16384){stop();return;}buffer+=chunk;
        let i;while((i=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let message;try{message=JSON.parse(line);}catch{stop();return;}
          if(message.type==='authorized'){
            if(committing){stop();return;}committing=true;
            void Promise.resolve().then(beforeCommit).then(fn=>{release=fn;if(finished){void release?.();return;}child.stdin.write(JSON.stringify({commit:true})+'\n');}).catch(stop);
          }else if(['challenge','done','failed','available'].includes(message.type)){if(['done','available'].includes(message.type))success=true;event(message);}
          else stop();
        }
      });
    });
    child.stdin.on('error',()=>{});child.stdin.write(JSON.stringify(input)+'\n');
    const operation={stop,done};operations.add(operation);void done.then(()=>operations.delete(operation),()=>operations.delete(operation));return operation;
  }
  let availability;
  return {start,async close(){for(const op of operations)op.stop();await Promise.allSettled([...operations].map(op=>op.done));},async available(){return availability??=(async()=>{let ok=false,operation;try{operation=await start({action:'inspect'},{event:m=>{ok=m.type==='available'&&m.deviceLogin===true;}});const timeout=setTimeout(operation.stop,10000);try{await operation.done;}finally{clearTimeout(timeout);}return ok;}catch{return false;}})();}};
}
