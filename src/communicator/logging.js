import {mkdirSync,lstatSync,fstatSync,openSync,closeSync,fchmodSync,writeSync,renameSync,unlinkSync,constants} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
export {requestDiagnostic} from './public/request-diagnostic.js';

// Deliberately exclude exception messages, arguments, URLs and application payloads.
export function errorDiagnostic(error) {
  const safe=value=>typeof value==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(value)?value:undefined;
  return {type:safe(error?.name)||'Error',code:safe(error?.code),
    frames:typeof error?.stack==='string'?error.stack.split('\n').filter(line=>/^\s+at /.test(line)&&(!line.includes('://')||line.includes('file://'))&&!/[?@]/.test(line)).slice(0,12).map(line=>line.slice(0,300)):[]};
}
export function createComLogger({home=homedir(),pid=process.pid,maxBytes=1024*1024,warn=()=>{}}={}) {
  for(const dir of [join(home,'.ned'),join(home,'.ned','logs')]) {
    mkdirSync(dir,{recursive:true,mode:0o700});
    const stat=lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Unsafe COM log directory');
    // Do not change permissions on the shared .ned directory.
    if(dir.endsWith('/logs')&&(stat.mode&0o077))throw new Error('COM log directory must be private');
  }
  const path=join(home,'.ned','logs',`com-${pid}.jsonl`);
  let fd,bytes=0,failed=false;
  const open=()=>{
    let existing;
    try{existing=lstatSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}
    const valid=stat=>stat.isFile()&&stat.nlink===1&&(!process.getuid||stat.uid===process.getuid());
    if(existing&&!valid(existing))throw new Error('Unsafe COM log file');
    fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW|constants.O_NONBLOCK,0o600);
    const stat=fstatSync(fd);
    if(!valid(stat)){closeSync(fd);fd=undefined;throw new Error('Unsafe COM log file');}
    fchmodSync(fd,0o600);bytes=stat.size;
  };
  open();
  return {path,
    event(event,details={}) {
      if(failed)return;
      try {
        const line=JSON.stringify({time:new Date().toISOString(),pid,event,...details})+'\n';
        if(bytes+Buffer.byteLength(line)>maxBytes){
          closeSync(fd);fd=undefined;
          try{unlinkSync(`${path}.3`);}catch(error){if(error.code!=='ENOENT')throw error;}
          for(let i=2;i>=0;i--){try{renameSync(i?`${path}.${i}`:path,`${path}.${i+1}`);}catch(error){if(error.code!=='ENOENT')throw error;}}
          open();
        }
        writeSync(fd,line);bytes+=Buffer.byteLength(line);
      }catch{failed=true;warn('NEDCOM: diagnostic log write failed.');}
    },
    close(){if(fd!==undefined){closeSync(fd);fd=undefined;}}
  };
}
