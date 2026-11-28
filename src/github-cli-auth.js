import {spawn as nodeSpawn,execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir,lstat,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {stripVTControlCharacters} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {IdentityError} from './identity-errors.js';

const activeManagers=new Set();
const failure=()=>new IdentityError('github_cli_unavailable','GitHub sign-in could not start. Check that gh is installed and try again.',503);
function fingerprint(pid){
  try{
    if(process.platform==='linux'){const text=readFileSync(`/proc/${pid}/stat`,'utf8'),fields=text.slice(text.lastIndexOf(')')+2).split(' ');return fields[0]==='Z'?null:readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim()+':'+fields[19];}
    if(process.platform==='darwin'){const [state,...birth]=execFileSync('/bin/ps',['-p',String(pid),'-o','stat=','-o','lstart='],{encoding:'utf8',timeout:1000,stdio:['ignore','pipe','ignore']}).trim().split(/\s+/);return state?.includes('Z')?null:birth.join(' ')||null;}
  }catch{/* Missing or ended process has no identity. */}
  return null;
}
function alive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
function signal(pid,group,kind){try{process.kill(group?-pid:pid,kind);}catch(error){if(group&&error.code==='EPERM'){process.kill(pid,kind);return;}if(error.code!=='ESRCH')throw error;}}
const stopping=new WeakMap();
function stop(child,grace){
  if(!child?.pid||child.exitCode!==null||child.signalCode)return Promise.resolve();
  if(stopping.has(child))return stopping.get(child);
  const operation=(async()=>{
    const ended=new Promise(resolve=>child.once('close',resolve));
    signal(child.pid,process.platform!=='win32','SIGTERM');
    await Promise.race([ended,delay(grace)]);
    if(child.exitCode===null&&!child.signalCode){signal(child.pid,process.platform!=='win32','SIGKILL');await Promise.race([ended,delay(grace)]);}
    if(child.exitCode===null&&!child.signalCode)throw failure();
  })();stopping.set(child,operation);operation.catch(()=>{});return operation;
}

// gh owns OAuth polling. Its temporary plaintext CLI config is private and is
// removed before NED asks the user to confirm encrypted vault storage.
export function createGithubCliAuth({home,env=process.env,clock=Date.now,spawn=nodeSpawn,startupMs=10000,commandMs=4000,killGraceMs=1000}={}){
  const instance=randomUUID(),sessions=new Map();activeManagers.add(instance);
  let rootReady,closed=false,recovering=false;
  const root=home&&join(home,'.ned','github-auth');
  async function secure(path,privateMode=false){
    await mkdir(path,{recursive:true,mode:0o700});const info=await lstat(path);
    if(!info.isDirectory()||info.isSymbolicLink()||process.getuid&&(info.uid!==process.getuid()||(info.mode&(privateMode?0o077:0o022))))throw failure();
  }
  async function prepareRoot(){
    if(!home||!isAbsolute(home))throw failure();
    await secure(home);await secure(join(home,'.ned'));await secure(root,true);
    for(const name of await readdir(root)){
      if(!/^[a-f0-9-]{36}$/.test(name))continue;
      const path=join(root,name);let owner;
      try{const info=await lstat(path);if(!info.isDirectory()||info.isSymbolicLink()||process.getuid&&info.uid!==process.getuid())continue;owner=JSON.parse(await readFile(join(path,'owner.json'),'utf8'));}catch{continue;}
      if(owner.version!==1||owner.id!==name||!Number.isSafeInteger(owner.pid)||owner.pid<1||typeof owner.instance!=='string')continue;
      const sameProcess=owner.pid===process.pid&&activeManagers.has(owner.instance);
      const live=owner.pid===process.pid?sameProcess:alive(owner.pid)&&(!owner.birth||fingerprint(owner.pid)===owner.birth);
      if(live)continue;
      if(Number.isSafeInteger(owner.child)&&owner.child>0&&owner.childBirth&&fingerprint(owner.child)===owner.childBirth){
        signal(owner.child,process.platform!=='win32','SIGTERM');
        const deadline=Date.now()+killGraceMs;while(alive(owner.child)&&Date.now()<deadline)await delay(10);
        if(fingerprint(owner.child)===owner.childBirth){signal(owner.child,process.platform!=='win32','SIGKILL');const finalDeadline=Date.now()+killGraceMs;while(fingerprint(owner.child)===owner.childBirth&&Date.now()<finalDeadline)await delay(10);if(fingerprint(owner.child)===owner.childBirth)throw failure();}
      }
      await rm(path,{recursive:true,force:true});
    }
  }
  function initialize(){if(!rootReady){recovering=true;rootReady=prepareRoot().finally(()=>{recovering=false;});rootReady.catch(()=>{});}return rootReady;}
  function privateEnv(directory){return {PATH:env.PATH,HOME:directory,USERPROFILE:directory,XDG_CONFIG_HOME:directory,GH_CONFIG_DIR:join(directory,'gh'),GH_HOST:'github.com',GH_PROMPT_DISABLED:'1',GH_NO_UPDATE_NOTIFIER:'1',GH_NO_EXTENSION_UPDATE_NOTIFIER:'1',GH_BROWSER:'false',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:join(directory,'gitconfig'),LANG:'C.UTF-8',LC_ALL:'C.UTF-8',NO_COLOR:'1'};}
  function cleanup(session){
    if(session.cleanup)return session.cleanup;
    session.cleanup=(async()=>{
      await session.setup?.catch(()=>{});
      await Promise.all([...session.children].map(child=>stop(child,killGraceMs)));
      if(session.directory)await rm(session.directory,{recursive:true,force:true});
      sessions.delete(session.id);clearTimeout(session.expiry);
    })();session.cleanup.catch(()=>{});return session.cleanup;
  }
  function cancel(id){const session=sessions.get(id);if(!session)return;session.cancelled=true;session.reject?.(new IdentityError('restart_required','GitHub sign-in ended. Start again.',409));void cleanup(session);}
  function capture(session,args){
    return new Promise((resolve,reject)=>{
      if(session.cancelled){reject(failure());return;}
      const child=spawn('gh',args,{cwd:session.directory,env:session.env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});session.children.add(child);
      let output='',size=0,invalid=false;
      const timer=setTimeout(()=>{invalid=true;void stop(child,killGraceMs);reject(failure());},commandMs);
      child.stdout.on('data',chunk=>{size+=chunk.length;if(size>16384){invalid=true;void stop(child,killGraceMs);reject(failure());}else output+=chunk;});
      child.stderr.on('data',chunk=>{size+=chunk.length;if(size>16384){invalid=true;void stop(child,killGraceMs);reject(failure());}});
      child.once('error',()=>{clearTimeout(timer);reject(failure());});
      child.once('close',code=>{clearTimeout(timer);session.children.delete(child);if(invalid||code!==0||session.cancelled)reject(failure());else resolve(output.trim());});
    });
  }
  async function start(input,limit,id=randomUUID()){
    if(closed||sessions.has(id)||typeof input.login!=='string'||!/^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(input.login))throw failure();
    const session={id,children:new Set(),cancelled:false,exited:false};sessions.set(id,session);
    let resolveReady;
    const ready=new Promise((resolve,reject)=>{resolveReady=resolve;session.reject=reject;});ready.catch(()=>{});
    const expiresAt=Math.min(limit,clock()+600000);
    session.setup=(async()=>{
      await initialize();if(session.cancelled)throw failure();
      session.directory=join(root,randomUUID());await mkdir(session.directory,{mode:0o700});await mkdir(join(session.directory,'gh'),{mode:0o700});
      if(session.cancelled)throw failure();
      const owner={version:1,id:session.directory.slice(root.length+1),pid:process.pid,birth:fingerprint(process.pid),instance};
      await writeFile(join(session.directory,'owner.json'),JSON.stringify(owner),{mode:0o600,flag:'wx'});
      session.env=privateEnv(session.directory);if(session.cancelled)throw failure();
      const child=spawn('gh',['auth','login','--hostname','github.com','--git-protocol','https','--web','--insecure-storage','--skip-ssh-key'],{cwd:session.directory,env:session.env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});session.children.add(child);
      let buffer='',bytes=0,code,url;
      const parse=chunk=>{
        if(code&&url||session.cancelled)return;
        bytes+=chunk.length;if(bytes>16384){session.reject(failure());void stop(child,killGraceMs);return;}
        buffer+=stripVTControlCharacters(String(chunk));let end;
        while((end=buffer.indexOf('\n'))>=0){
          const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
          const found=/\bFirst copy your one-time code:\s+([A-Z0-9]{4}-[A-Z0-9]{4})$/.exec(line);if(found)code=found[1];
          if(line.startsWith('Open this URL to continue in your web browser:')){
            if(line!=='Open this URL to continue in your web browser: https://github.com/login/device'){session.reject(failure());void stop(child,killGraceMs);return;}
            url='https://github.com/login/device';
          }
        }
        if(code&&url)resolveReady({method:'gh-cli',session:id,login:input.login,url,userCode:code,interval:1000,expiresAt});
      };
      child.stdout.on('data',parse);child.stderr.on('data',parse);
      child.once('error',()=>{session.exited=true;session.code=1;session.reject(failure());});
      child.once('close',status=>{session.exited=true;session.code=status;session.children.delete(child);if(!code||!url||status!==0)session.reject(failure());});
      if(child.pid){owner.child=child.pid;owner.childBirth=fingerprint(child.pid);await writeFile(join(session.directory,'owner.json'),JSON.stringify(owner),{mode:0o600});}
      session.expiry=setTimeout(()=>cancel(id),Math.max(1,expiresAt-clock()));session.expiry.unref?.();
    })();
    const timer=setTimeout(()=>session.reject(failure()),startupMs);
    try{await session.setup;if(session.cancelled)throw failure();return await ready;}catch(error){session.cancelled=true;await cleanup(session);throw error instanceof IdentityError?error:failure();}finally{clearTimeout(timer);}
  }
  async function poll(state){
    const session=sessions.get(state.session);if(!session||session.cancelled)throw new IdentityError('expired','GitHub sign-in ended. Start again.',410);
    if(clock()>=state.expiresAt){cancel(session.id);await cleanup(session);throw new IdentityError('expired','GitHub sign-in expired. Start again.',410);}
    if(!session.exited)return 'pending';
    if(session.result)return session.result;
    session.result=(async()=>{
      try{
        if(session.code!==0)throw failure();
        const user=JSON.parse(await capture(session,['api','user','--hostname','github.com']));
        if(typeof user.login!=='string'||user.login.toLowerCase()!==state.login.toLowerCase()||!Number.isSafeInteger(user.id)||user.id<=0)throw new IdentityError('verification_failed','GitHub verified a different account. Start again with the intended username.',422);
        const token=await capture(session,['auth','token','--hostname','github.com']);if(!/^[!-~]{1,8192}$/.test(token)||session.cancelled)throw failure();
        return {identity:{login:user.login,id:user.id},token,expiresAt:null};
      }catch(error){throw error instanceof IdentityError?error:failure();}finally{await cleanup(session);}
    })();return session.result;
  }
  return {start,poll,cancel,initialize,isBusy:()=>sessions.size>0||recovering,async close(){closed=true;await rootReady?.catch(()=>{});for(const id of sessions.keys())cancel(id);await Promise.all([...sessions.values()].map(cleanup));activeManagers.delete(instance);}};
}
