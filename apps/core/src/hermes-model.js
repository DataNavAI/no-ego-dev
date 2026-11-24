import {cleanModelCatalog} from './model-catalog.js';
import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Fixed image/library adapter; no browser-selected command/module/endpoint. */
export function createHermesModelAdapter({env=process.env,profile}={}){
  const operations=new Set();let closed=false;
  async function executable(){
    const choices=env.NED_HERMES_PYTHON?[env.NED_HERMES_PYTHON]:['/opt/hermes/.venv/bin/python',path.join(homedir(),'.hermes/hermes-agent/venv/bin/python'),path.join(homedir(),'.hermes/hermes-agent/.venv/bin/python')];
    for(const p of choices){if(!path.isAbsolute(p))throw Error('Hermes interpreter must be absolute');try{await access(p);return p;}catch{/* Try the next fixed installation path. */}}
    throw Error('Hermes authentication adapter unavailable');
  }
  async function start(input,{event=()=>{},beforeCommit=async()=>()=>{}}={}){
    if(closed)throw Error('Hermes adapter closed');
    const python=await executable();
    if(closed)throw Error('Hermes adapter closed');
    if(operations.size>=2)throw Error('Hermes operation capacity exhausted');
    const child=spawn(python,['-I',fileURLToPath(new URL('./hermes-model.py',import.meta.url))],{env:{...env,HERMES_HOME:profile,PYTHONNOUSERSITE:'1',HERMES_INTERACTIVE:'0'},stdio:['pipe','pipe','ignore']});
    let buffer='',bytes=0,finished=false,release,committing=false,timer,success=false,commitTask=Promise.resolve(),commitFailure;
    const stop=()=>{if(finished)return;child.kill('SIGTERM');timer=setTimeout(()=>{if(!finished)child.kill('SIGKILL');},3000);timer.unref();};
    const done=new Promise((resolve,reject)=>{
      child.once('error',()=>reject(Error('Hermes authentication adapter unavailable')));
      child.once('close',async code=>{finished=true;clearTimeout(timer);try{await commitTask;await release?.();commitFailure?reject(commitFailure):code===0&&success?resolve():reject(Error('Hermes authentication failed'));}catch{reject(Error('Hermes authentication cleanup failed'));}});
      child.stdout.on('data',chunk=>{
        bytes+=chunk.length;if(bytes>16384){stop();return;}buffer+=chunk;
        let i;while((i=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let message;try{message=JSON.parse(line);}catch{stop();return;}
          if(message.type==='authorized'){
            if(committing){stop();return;}committing=true;
            commitTask=Promise.resolve().then(beforeCommit).then(fn=>{release=fn;if(!finished)child.stdin.write(JSON.stringify({commit:true})+'\n');}).catch(error=>{commitFailure=error;stop();});
          }else if(['challenge','done','failed','available'].includes(message.type)){if(['done','available'].includes(message.type))success=true;event(message);}
          else stop();
        }
      });
    });
    child.stdin.on('error',()=>{});child.stdin.write(JSON.stringify(input)+'\n');
    const operation={stop,done,submit(code){if(finished||committing)throw Error("Login is not accepting input");child.stdin.write(JSON.stringify({code})+"\n");}};operations.add(operation);void done.then(()=>operations.delete(operation),()=>operations.delete(operation));return operation;
  }
  let availability,models=cleanModelCatalog(null);
  return {start,async catalog(){await this.available();return cleanModelCatalog(closed?null:models);},async close(){closed=true;for(const op of operations)op.stop();await Promise.allSettled([...operations].map(op=>op.done));},async available(){if(closed)return false;return availability??=(async()=>{let ok=false,operation;try{operation=await start({action:'inspect'},{event:m=>{ok=m.type==='available'&&m.deviceLogin===true;if(ok)models=cleanModelCatalog(m.models);}});const timeout=setTimeout(operation.stop,10000);try{await operation.done;}finally{clearTimeout(timeout);}if(!ok)availability=undefined;return ok;}catch{availability=undefined;return false;}})();}};
}
