import {constants,lstatSync,mkdirSync,openSync,closeSync,readFileSync,writeFileSync,fstatSync,fsyncSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {resolveRuntimeHome,ensureRuntimeHome} from '../../../src/runtime-home.js';

export function coreNamespace(raw='') {
  try {
    const unsafe=value=>[...value].some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127||character==='\\');
    if(!raw.startsWith('/')||raw.startsWith('//')||unsafe(raw))return {blocked:true,valid:false};
    let pathname=raw.split('?')[0];
    for(let count=0;count<5;count++){
      const decoded=decodeURIComponent(pathname);
      if(decoded===pathname)break;
      pathname=decoded;
      if(count===4)return {blocked:true,valid:false};
    }
    if(/[?#]/.test(pathname)||unsafe(pathname))return {blocked:true,valid:false};
    pathname=new URL(pathname,'http://localhost').pathname.replace(/\/{2,}/g,'/');
    return {blocked:/^\/api\/core(?:\/|$)/.test(pathname),valid:pathname===raw.split('?')[0],pathname};
  }catch{return {blocked:true,valid:false};}
}

export function loadOperatorCredential({home,env=process.env}={}) {
  const selected=resolveRuntimeHome({home,env});
  if(typeof selected!=='string'||!path.isAbsolute(selected))throw new Error('Unsafe Core runtime selection.');
  const root=path.resolve(selected);
  ensureRuntimeHome(root);
  const safe=(filename,directory)=>{
    const info=lstatSync(filename);
    if(info.isSymbolicLink()||(directory?!info.isDirectory():!info.isFile())||(process.getuid&&info.uid!==process.getuid())||(info.mode&0o077))throw new Error('Unsafe Core credential storage.');
    return info;
  };
  for(const directory of [path.join(root,'.ned'),path.join(root,'.ned','core')]){
    try{mkdirSync(directory,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}
    safe(directory,true);
  }
  const filename=path.join(root,'.ned','core','operator-token');
  let descriptor;
  try{
    try{descriptor=openSync(filename,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(descriptor,randomBytes(32).toString('hex')+'\n');fsyncSync(descriptor);}
    catch(error){if(error.code!=='EEXIST')throw error;}
    finally{if(descriptor!==undefined){closeSync(descriptor);descriptor=undefined;}}
    const before=safe(filename,false);
    descriptor=openSync(filename,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
    const opened=fstatSync(descriptor);
    if(opened.ino!==before.ino||opened.dev!==before.dev||opened.size>128)throw new Error();
    const token=readFileSync(descriptor,'utf8').trim();
    if(!/^[a-f0-9]{64}$/.test(token))throw new Error();
    return token;
  }catch{throw new Error('Unable to load private Core operator credential.');}
  finally{if(descriptor!==undefined)closeSync(descriptor);}
}

export function authorized(header,credential) {
  if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
  const supplied=Buffer.from(header.slice(7)),expected=Buffer.from(credential);
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
}
