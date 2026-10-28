import {constants} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {homedir} from 'node:os';
import path from 'node:path';

export function canonicalHubOrigin(value) {
  let url;try {url=new URL(value);}catch {throw new Error('Invalid Hub origin.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('Invalid Hub origin.');
  return url.origin;
}
export function resolveHubOrigin(env=process.env) {
  const environment=env.NED_HUB_ENV??'staging';
  if(!['staging','production'].includes(environment))throw new Error('Invalid Hub environment.');
  return canonicalHubOrigin(env.NED_HUB_URL??(environment==='production'?'https://hub.datanav.app':'https://staging.hub.datanav.app'));
}
export function validHubCredential(value,origin) {
  return value && value.hub===origin && /^ned_[A-Za-z0-9_-]{20,512}$/.test(value.token||'') && typeof value.tokenId==='string' && value.tokenId.length>0 && value.tokenId.length<=256 && value.account && typeof value.account.id==='string' && value.account.id.length>0 && value.account.id.length<=256 && typeof value.account.name==='string' && value.account.name.length<=256 && (value.account.email===undefined || (typeof value.account.email==='string'&&value.account.email.length<=320));
}
export function createHubCredentialStore({home=homedir()}={}) {
  if(process.platform==='win32')throw new Error('Hub private credential storage requires macOS or Linux.');
  const root=path.join(home,'.ned'),directory=path.join(root,'hub-credentials');
  const filename=origin=>path.join(directory,`${createHash('sha256').update(origin).digest('hex')}.json`);
  async function checkDirectory(target,privateMode=false) {
    const stat=await fs.lstat(target);
    if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)||(privateMode&&(stat.mode&0o077))||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Unsafe Hub credential directory.');
  }
  async function directories(create=false) {
    await checkDirectory(home);
    for(const [target,privateMode] of [[root,false],[directory,true]]) {
      if(create)await fs.mkdir(target,{mode:0o700}).catch(error=>{if(error.code!=='EEXIST')throw error;});
      await checkDirectory(target,privateMode);
    }
  }
  async function read(origin) {
    origin=canonicalHubOrigin(origin);
    try {
      await directories();
      const handle=await fs.open(filename(origin),constants.O_RDONLY|constants.O_NOFOLLOW);
      try {
        const stat=await handle.stat();
        if(!stat.isFile()||(stat.mode&0o077)||stat.nlink!==1||stat.size>8192||(process.getuid&&stat.uid!==process.getuid()))throw new Error('Unsafe Hub credential file.');
        const value=JSON.parse(await handle.readFile('utf8'));
        if(!validHubCredential(value,origin))throw new Error('Invalid Hub credential file.');
        return value;
      }finally {await handle.close();}
    }catch(error){if(error.code==='ENOENT')return null;throw new Error('Cannot read private Hub credentials.',{cause:error});}
  }
  async function mutate(origin,operation) {
    await directories(true);
    const lock=`${filename(origin)}.lock`,deadline=Date.now()+5000;
    for(;;){
      try {await fs.mkdir(lock,{mode:0o700});break;}
      catch(error){if(error.code!=='EEXIST'||Date.now()>=deadline)throw new Error('Hub credential is busy. Retry login/logout.',{cause:error});await new Promise(resolve=>setTimeout(resolve,25));}
    }
    const owned=await fs.lstat(lock);
    let result,operationError,cleanupWarning=false;
    try {result=await operation();}catch(error){operationError=error;}
    try {
      const current=await fs.lstat(lock);
      if(current.dev!==owned.dev||current.ino!==owned.ino)throw new Error('Credential lock ownership changed.');
      await fs.rmdir(lock);
    }catch {cleanupWarning=true;}
    if(operationError)throw operationError;
    // A completed rename/unlink is authoritative even if releasing its lock failed.
    return {ok:true,...result,cleanupWarning};
  }
  return {
    read,
    async write(value) {
      const origin=canonicalHubOrigin(value.hub);
      if(!validHubCredential(value,origin))throw new Error('Invalid Hub credential.');
      return mutate(origin,async()=>{
      await read(origin); // Reject unsafe existing files; a failed login never replaces a good credential.
      const temporary=path.join(directory,`.${randomBytes(24).toString('hex')}.tmp`);
      let handle,published=false;
      try {
        handle=await fs.open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
        await handle.writeFile(JSON.stringify(value));await handle.sync();await handle.close();handle=null;
        await fs.rename(temporary,filename(origin));published=true;
      }finally {await handle?.close().catch(()=>{});if(!published)await fs.unlink(temporary).catch(()=>{});}
      });
    },
    async remove(origin,expectedToken) {
      origin=canonicalHubOrigin(origin);
      return mutate(origin,async()=>{const current=await read(origin);
        if(current&&current.token===expectedToken)await fs.unlink(filename(origin));
      });
    },
  };
}
