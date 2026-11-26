import {cleanModelCatalog} from './model-catalog.js';
import {constants} from 'node:fs';
import {open,mkdir,lstat,rename,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {parseDocument} from 'yaml';
import {parse as dotenv} from 'dotenv';
import {createHermesModelAdapter} from './hermes-model.js';
import {resolveGatewaySettings} from '../../../src/gateway-settings.js';

const modelPattern=/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/;
const subscriptions=['claude-subscription-directsdk-experimental','antigravity-subscription-directsdk'];
const validModel=value=>typeof value==='string'&&modelPattern.test(value);
const publicModel=current=>{const value=current.model.default??current.model.name;return validModel(value)?value:null;};
const providerUrls={openai:'https://api.openai.com/v1',openrouter:'https://openrouter.ai/api/v1',gemini:'https://generativelanguage.googleapis.com/v1beta',anthropic:'https://api.anthropic.com/v1'};
const envKeys={openai:['OPENAI_API_KEY'],openrouter:['OPENROUTER_API_KEY'],anthropic:['ANTHROPIC_API_KEY'],nous:['NOUS_API_KEY'],google:['GOOGLE_API_KEY','GEMINI_API_KEY'],gemini:['GEMINI_API_KEY','GOOGLE_API_KEY'],groq:['GROQ_API_KEY'],xai:['XAI_API_KEY'],deepseek:['DEEPSEEK_API_KEY']};
const digest=value=>createHash('sha256').update(value).digest('hex');
export class ModelSetupError extends Error {
  constructor(status=503,code='model_setup_unavailable'){super(code==='model_setup_unauthorized'?'NED API authentication required.':code==='model_setup_required'?'Model provider is required before chatting.':'Model settings are unavailable. Check configuration and try again.');this.status=status;this.code=code;}
}
async function readPrivate(file,secret=false){
  let handle;
  try{
    handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size>1048576||stat.nlink!==1||process.getuid&&stat.uid!==process.getuid()||secret&&(stat.mode&0o077))throw new ModelSetupError();
    const buffer=Buffer.alloc(1048577),{bytesRead}=await handle.read(buffer,0,buffer.length,0);
    if(bytesRead>1048576)throw new ModelSetupError();
    return {text:buffer.subarray(0,bytesRead).toString('utf8'),private:!(stat.mode&0o077)};
  }catch(error){if(error.code==='ENOENT')return {text:'',private:true};throw new ModelSetupError();}
  finally{await handle?.close();}
}
function containsKey(value,depth=0){
  if(depth>30)throw new ModelSetupError();
  return value&&typeof value==='object'&&Object.entries(value).some(([key,item])=>key==='api_key'&&typeof item==='string'&&item.length||containsKey(item,depth+1));
}
async function jsonResponse(response,limit=32768){
  if(!response.ok){await response.body?.cancel();throw new ModelSetupError();}
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>limit){await response.body.cancel().catch(()=>{});throw new ModelSetupError();}chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createModelSetup({home=homedir(),env=process.env,fetch:request=globalThis.fetch,enabled=true,hermesAdapter,modelCatalog,clock=Date.now}={}){
  const root=env.HERMES_HOME??path.join(home,'.hermes'),intents=new Map(),requests=new Set();
  const adapter=hermesAdapter??createHermesModelAdapter({env,profile:root}),logins=new Map();
  let hub,closed=false,queue=Promise.resolve(),serialActive=0;
  const serial=operation=>{const current=queue.then(async()=>{if(closed)throw new ModelSetupError();serialActive++;try{return await operation();}finally{serialActive--;}});queue=current.catch(()=>{});return current;};
  async function fetchBound(url,options={}){
    if(closed)throw new ModelSetupError();
    if(requests.size>=8)throw new ModelSetupError(429,'model_setup_busy');
    const abort=new AbortController();requests.add(abort);
    try{return await request(url,{...options,redirect:'error',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(10000)])});}
    finally{requests.delete(abort);}
  }
  async function profile(){
    try{const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)||process.getuid&&stat.uid!==process.getuid())throw new ModelSetupError();}catch(error){if(error.code!=='ENOENT')throw error;}
    const yaml=await readPrivate(path.join(root,'config.yaml')),secrets=await readPrivate(path.join(root,'.env'),true);
    const document=parseDocument(yaml.text,{logLevel:'silent'});if(document.errors.length)throw new ModelSetupError();
    const config=document.toJS({maxAliasCount:20})??{};
    if(!config||Array.isArray(config)||typeof config!=='object'||containsKey(config)&&!yaml.private)throw new ModelSetupError();
    const keys={...dotenv(secrets.text),...env};
    const auth=[];
    for(const file of ['auth.json','.anthropic_oauth.json'])auth.push((await readPrivate(path.join(root,file),true)).text);
    const selection=config.ned_model;
    if(selection?.kind==='instance'&&subscriptions.includes(selection.provider)){
      const settings=config.plugins?.entries?.[selection.provider]?.settings;
      const directory=settings?.[selection.provider.startsWith('claude-')?'claude_config_dir':'ned_config_dir'];
      const parent=path.join(root,'ned-subscriptions');
      if(typeof directory!=='string'||path.dirname(directory)!==parent||!/^credential-[a-zA-Z0-9_-]+$/.test(path.basename(directory)))throw new ModelSetupError();
      for(const p of [parent,directory]){const stat=await lstat(p);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)||process.getuid&&stat.uid!==process.getuid())throw new ModelSetupError();}
      auth.push((await readPrivate(path.join(directory,selection.provider.startsWith('claude-')?'.credentials.json':'jetski-standalone-oauth-token'),true)).text);
    }
    const fingerprint=digest(JSON.stringify([yaml.text,secrets.text,auth,Object.values(envKeys).flat().map(k=>keys[k]??'')]));
    if(config.model!==undefined&&config.model!==null&&typeof config.model!=='string'&&(typeof config.model!=='object'||Array.isArray(config.model)))throw new ModelSetupError();
    const model=typeof config.model==='object'&&config.model?config.model:{default:typeof config.model==='string'?config.model:''};
    for(const field of ['provider','default','name','api_key'])if(model[field]!==undefined&&model[field]!==null&&typeof model[field]!=='string')throw new ModelSetupError();
    const provider=typeof model.provider==='string'?model.provider:'';
    const slug=provider.replace(/^custom:/,''),entry=config.providers?.[slug]??config.custom_providers?.find?.(p=>p.name===slug);
    if(entry)for(const field of ['api_key','key_env','api_key_env','key_cmd'])if(entry[field]!==undefined&&entry[field]!==null&&typeof entry[field]!=='string')throw new ModelSetupError();
    const marker=config.ned_model;
    const ownedHub=marker?.kind==='hub'&&provider==='custom:ned-hub'&&entry?.base_url===marker.baseUrl&&typeof entry.api_key==='string'&&digest(entry.api_key)===marker.capabilityHash&&(model.default??model.name)===marker.model;
    const key=model.api_key||entry?.api_key||keys[entry?.key_env??entry?.api_key_env]||entry?.key_cmd||(envKeys[slug]??(!provider||provider==='custom'?Object.values(envKeys).flat():[])).some(k=>typeof keys[k]==='string'&&keys[k].trim());
    if(marker?.kind==='instance'&&provider==='custom:ned-unconfigured')return {document,config,fingerprint,kind:'missing',model};
    if(ownedHub)return {document,config,fingerprint,kind:'hub',model,entry,marker};
    if(key)return {document,config,fingerprint,kind:'profile',model};
    if(auth.some(Boolean)){
      // Ask the selected authenticated gateway to interpret its own OAuth store;
      // do not reimplement token formats or discover credentials from other homes.
      const settings=await resolveGatewaySettings({home,env});
      if(!/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(settings.url)||!settings.key)throw new ModelSetupError();
      const inventory=await jsonResponse(await fetchBound(settings.url+'/api/model/options',{headers:{Authorization:'Bearer '+settings.key}}),1048576);
      if(inventory.providers?.some(p=>p.authenticated===true&&(p.is_current===true||p.slug===inventory.provider)))return {document,config,fingerprint,kind:'profile',model};
    }
    return {document,config,fingerprint,kind:'missing',model};
  }
  async function remote(identity=hub){
    if(!identity)throw new ModelSetupError(409,'model_setup_required');
    const data=await jsonResponse(await fetchBound(identity.origin+'/api/models/instances/'+identity.id+'?verify=1',{headers:{Authorization:'Bearer '+identity.token}}));
    const baseUrl=identity.origin+'/api/models/instances/'+identity.id+'/v1';
    if(typeof data.configured!=='boolean'||data.baseUrl!==baseUrl)throw new ModelSetupError();
    const c=data.connection;
    if(data.configured&&(!c||!Object.hasOwn(providerUrls,c.provider)||!validModel(c.model)||!/^[a-f0-9-]{36}$/.test(c.version)||!/^[a-f0-9-]{36}$/.test(c.id)))throw new ModelSetupError();
    return {connection:data.configured?c:null,baseUrl};
  }
  async function persist(snapshot,{provider,model,key,baseUrl,kind,connection,identity,authorize=()=>true}){
    if(process.platform==='win32')throw new ModelSetupError(403,'model_setup_platform_unavailable');
    await mkdir(root,{recursive:true,mode:0o700});
    // Re-read and verify the profile directory before creating a private lock.
    await profile();
    const lockPath=path.join(root,'.ned-model.lock');let lock,temp;
    try{
      lock=await open(lockPath,'wx',0o600);
      const current=await profile();if(current.fingerprint!==snapshot.fingerprint)throw new ModelSetupError(409,'model_setup_changed');
      const slug=kind==='hub'?'ned-hub':'ned-model',existing=current.config.providers?.[slug]??current.config.custom_providers?.find?.(entry=>entry.name===slug);
      if(existing&&current.config.ned_model?.provider!==slug)throw new ModelSetupError(409,'model_setup_changed');
      const document=current.document;
      const selected={...(typeof current.config.model==='object'?current.config.model:{}),default:model,name:model,provider:'custom:'+slug};
      for(const key of ['api_key','base_url','api_mode'])delete selected[key];
      document.set('model',selected);
      document.setIn(['providers',slug],{base_url:baseUrl,api_key:key,api_mode:'chat_completions',models:[model]});
      document.set('ned_model',{kind,provider:slug,model,selectedProvider:provider,...(kind==='hub'?{origin:identity.origin,instanceId:identity.id,baseUrl,capabilityHash:digest(key),connectionId:connection.id,connectionVersion:connection.version}:{})});
      temp=path.join(root,'.ned-model-'+randomBytes(16).toString('hex'));
      const file=await open(temp,'wx',0o600);try{await file.writeFile(String(document));await file.sync();}finally{await file.close();}
      if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');
      if(closed||kind==='hub'&&identity!==hub)throw new ModelSetupError(409,'model_setup_changed');
      await rename(temp,path.join(root,'config.yaml'));temp=null;
      const directory=await open(root,constants.O_RDONLY);try{await directory.sync();}finally{await directory.close();}
    }finally{if(temp)await unlink(temp).catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
  }
  async function prepare(authorize=()=>true){
    return serial(async()=>{
      const identity=hub,current=await profile();
      if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');
      if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');
      if(!enabled&&current.kind!=='profile')throw new ModelSetupError(403,'model_setup_forbidden');
      if(current.kind==='profile')return typeof current.model.provider==='string'&&current.model.provider&&validModel(current.model.default??current.model.name)?{provider:current.model.provider,model:current.model.default??current.model.name}:{};
      if(current.config.ned_model?.kind==='instance')throw new ModelSetupError(409,'model_setup_required');
      if(!identity||current.kind==='hub'&&(current.marker.origin!==identity.origin||current.marker.instanceId!==identity.id))throw new ModelSetupError(409,'model_setup_required');
      const metadata=await remote(identity);if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');if(!metadata.connection)throw new ModelSetupError(409,'model_setup_required');
      const c=metadata.connection;
      if(current.kind!=='hub'||current.marker.connectionVersion!==c.version||current.entry.api_key!==identity.token)await persist(current,{provider:c.provider,model:c.model,key:identity.token,baseUrl:metadata.baseUrl,kind:'hub',connection:c,identity,authorize});
      return {provider:'custom:ned-hub',model:c.model};
    });
  }
  async function catalog(){try{return cleanModelCatalog(await (modelCatalog?modelCatalog():adapter.catalog?.()));}catch{return cleanModelCatalog(null);}}
  async function status(){
    if(closed)throw new ModelSetupError();
    const deviceLogin=enabled&&process.platform!=='win32'&&await adapter.available();
    const identity=hub,current=await profile();if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');
    const models=modelCatalog||deviceLogin?await catalog():cleanModelCatalog(null);
    const settingsUrl=identity?identity.origin+'/?settings=model':null;
    for(const [nonce,intent]of intents)if(intent.expires<clock())intents.delete(nonce);
    if(intents.size>=16)intents.delete(intents.keys().next().value);
    const nonce=randomBytes(32).toString('base64url');intents.set(nonce,{fingerprint:current.fingerprint,expires:clock()+300000,models});
    if(current.kind==='hub'){
      if(!hub||current.marker.origin!==hub.origin||current.marker.instanceId!==hub.id)return {models,catalogSource:'installed-hermes',deviceLogin,login:activeLogin(),configured:false,source:'hub',settingsUrl,hosted:hub?.kind==='hosted',canDisconnect:['local','hub','instance'].includes(current.config.ned_model?.kind),nonce};
      const data=await remote(identity);if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');return {models,catalogSource:'installed-hermes',deviceLogin,login:activeLogin(),configured:Boolean(data.connection)&&data.connection.version===current.marker.connectionVersion&&current.entry.api_key===hub.token,source:'hub',settingsUrl,hosted:hub.kind==='hosted',canDisconnect:true,provider:data.connection?.provider,model:data.connection?.model??null,nonce};
    }
    if(current.kind==='profile')return {models,catalogSource:'installed-hermes',deviceLogin,login:activeLogin(),configured:true,source:'profile',settingsUrl,hosted:hub?.kind==='hosted',canDisconnect:['local','hub','instance'].includes(current.config.ned_model?.kind),provider:current.config.ned_model?.selectedProvider??current.model.provider,model:publicModel(current),nonce};
    return {models,catalogSource:'installed-hermes',deviceLogin,login:activeLogin(),configured:false,source:current.config.ned_model?.kind==='instance'?'local':hub?'hub':'local',settingsUrl,hosted:hub?.kind==='hosted',canDisconnect:['local','hub','instance'].includes(current.config.ned_model?.kind),nonce};
  }
  const pending=j=>['starting','waiting','authorizing'].includes(j.state);
  const publicLogin=j=>j&&({id:j.id,provider:j.provider,model:j.model,state:j.state,expiresAt:j.expiresAt,...(pending(j)&&j.verificationUri?{verificationUri:j.verificationUri,...(j.method==='manual_code'?{method:j.method,acceptsCode:j.state==='waiting'&&!j.submitted}:{userCode:j.userCode})}:{})});
  const activeLogin=()=>{for(const j of logins.values())if(pending(j)){if(clock()>=j.expiresAt)endLogin(j,'expired');else if(!j.authorize())endLogin(j,'cancelled');}return publicLogin([...logins.values()].find(pending));};
  function endLogin(j,state){if(!pending(j)||j.state==='authorizing'&&['cancelled','expired'].includes(state))return;j.state=state;delete j.userCode;delete j.verificationUri;j.operation?.stop();}
  async function profileLock(snapshot,authorize){
    await mkdir(root,{recursive:true,mode:0o700});await profile();let lock;
    try{lock=await open(path.join(root,'.ned-model.lock'),'wx',0o600);}catch{throw new ModelSetupError(409,'model_setup_changed');}
    const release=async()=>{await lock.close();await unlink(path.join(root,'.ned-model.lock'));};
    try{const current=await profile();if(closed||current.fingerprint!==snapshot.fingerprint)throw new ModelSetupError(409,'model_setup_changed');if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return release;}catch(error){await release();throw error;}
  }
  async function nativeConfigure(current,input,authorize){
    const operation=await adapter.start({action:'configure',provider:input.provider,model:input.model,apiKey:input.apiKey},{beforeCommit:()=>serial(()=>profileLock(current,authorize))});
    const deadline=setTimeout(operation.stop,30000),watch=setInterval(()=>{if(closed||!authorize())operation.stop();},250);
    try{await operation.done;if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');}finally{clearTimeout(deadline);clearInterval(watch);}
    return {configured:true,source:'profile',model:input.model};
  }
  async function disconnect(input,authorize){
    if(process.platform==='win32')throw new ModelSetupError(403,'model_setup_platform_unavailable');
    const intent=intents.get(input?.nonce);intents.delete(input?.nonce);
    if(!enabled||!intent||intent.expires<clock()||input.confirm!==true||Object.keys(input).some(k=>!['action','nonce','confirm'].includes(k)))throw new ModelSetupError(400,'model_setup_invalid');
    if([...logins.values()].some(j=>!j.finished))throw new ModelSetupError(409,'model_login_active');
    const current=await profile(),marker=current.config.ned_model;if(current.fingerprint!==intent.fingerprint||!['local','hub','instance'].includes(marker?.kind))throw new ModelSetupError(409,'model_setup_changed');
    const provider=marker.kind==='instance'&&['openai-codex','gemini','anthropic',...subscriptions].includes(marker.provider)?marker.provider:'hub';
    const operation=await adapter.start({action:'disconnect',provider,model:'disconnected'},{beforeCommit:()=>serial(()=>profileLock(current,authorize))});
    const timeout=setTimeout(operation.stop,30000);try{await operation.done;}finally{clearTimeout(timeout);}
    if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return {configured:false,source:'local'};
  }
  async function startLogin(input,authorize){
    if(process.platform==='win32')throw new ModelSetupError(403,'model_setup_platform_unavailable');
    if(!enabled||closed)throw new ModelSetupError(403,'model_setup_forbidden');
    const intent=intents.get(input?.nonce);intents.delete(input?.nonce);
    if(!intent||intent.expires<clock()||Object.keys(input).some(k=>!['action','nonce','provider','model','replace'].includes(k))||!['openai-codex',...subscriptions].includes(input.provider)||!validModel(input.model)||input.replace!==undefined&&typeof input.replace!=='boolean')throw new ModelSetupError(400,'model_setup_invalid');
    if(!intent.models?.[input.provider]?.includes(input.model)||!(await catalog())[input.provider]?.includes(input.model))throw new ModelSetupError(400,'model_setup_invalid');
    if([...logins.values()].some(j=>!j.finished))throw new ModelSetupError(409,'model_login_active');
    const current=await profile();if(current.fingerprint!==intent.fingerprint||current.kind!=='missing'&&input.replace!==true)throw new ModelSetupError(409,'model_setup_changed');
    if(!await adapter.available())throw new ModelSetupError(503,'model_authentication_unavailable');
    if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');
    // Recheck after interpreter discovery so concurrent starts cannot race.
    if([...logins.values()].some(j=>!j.finished))throw new ModelSetupError(409,'model_login_active');
    while(logins.size>=8)logins.delete(logins.keys().next().value);
    const j={id:randomUUID(),provider:input.provider,model:input.model,state:'starting',expiresAt:clock()+900000,authorize,finished:false};logins.set(j.id,j);
    j.task=(async()=>{
      let deadline,watch;
      try{
        j.operation=await adapter.start({action:subscriptions.includes(input.provider)?'subscription':'device',provider:input.provider,model:input.model},{
          beforeCommit:()=>serial(async()=>{if(clock()>=j.expiresAt){endLogin(j,'expired');throw new ModelSetupError();}if(!pending(j))throw new ModelSetupError();const release=await profileLock(current,authorize);if(!pending(j)){await release();throw new ModelSetupError();}j.state='authorizing';return release;}),
          event:m=>{if(m.type==='challenge'){
            let valid=false;
            if(subscriptions.includes(j.provider)){try{const url=new URL(m.verificationUri),expected=j.provider.startsWith('claude-')?['claude.ai','/oauth/authorize']:['accounts.google.com','/o/oauth2/auth'];valid=m.method==='manual_code'&&typeof m.verificationUri==='string'&&m.verificationUri.length<=4096&&/^[\x21-\x7e]+$/.test(m.verificationUri)&&url.protocol==='https:'&&url.host===expected[0]&&url.pathname===expected[1]&&Boolean(url.search)&&!url.username&&!url.password&&!url.hash;}catch{/* Invalid helper challenge fails closed. */}}
            else valid=m.verificationUri==='https://auth.openai.com/codex/device'&&typeof m.userCode==='string'&&/^[A-Za-z0-9-]{3,32}$/.test(m.userCode);
            if(!valid||j.verificationUri){endLogin(j,'failed');return;}if(pending(j)){j.state='waiting';j.verificationUri=m.verificationUri;if(subscriptions.includes(j.provider))j.method='manual_code';else j.userCode=m.userCode;}
          }},
        });
        if(!pending(j))j.operation.stop();
        deadline=setTimeout(()=>endLogin(j,'expired'),Math.max(1,j.expiresAt-clock()));deadline.unref();
        watch=setInterval(()=>{if(closed||!authorize())endLogin(j,'cancelled');else if(clock()>=j.expiresAt)endLogin(j,'expired');},250);watch.unref();
        await j.operation.done;if(pending(j)){j.state=authorize()?'complete':'cancelled';delete j.userCode;delete j.verificationUri;}
      }catch{endLogin(j,'failed');}finally{clearTimeout(deadline);clearInterval(watch);j.finished=true;}
    })();
    return publicLogin(j);
  }
  return {status,prepare,startLogin,isBusy:()=>requests.size>0||serialActive>0||[...logins.values()].some(j=>!j.finished),
    submitLoginCode(id,code){
      const j=logins.get(id);if(!j)throw new ModelSetupError(404,'model_login_missing');
      if(!j.authorize()){endLogin(j,'cancelled');throw new ModelSetupError(401,'model_setup_unauthorized');}
      if(clock()>=j.expiresAt)endLogin(j,'expired');
      if(j.state!=='waiting'||j.method!=='manual_code'||j.submitted||!j.operation)throw new ModelSetupError(409,'model_login_not_waiting');
      if(typeof code!=='string'||!/^[\x21-\x7e]{6,4096}$/.test(code))throw new ModelSetupError(400,'model_setup_invalid');
      j.submitted=true;j.operation.submit(code);return publicLogin(j);
    },
    login(id){const j=logins.get(id);if(j&&clock()>=j.expiresAt)endLogin(j,'expired');if(!j)throw new ModelSetupError(404,'model_login_missing');if(!j.authorize()){endLogin(j,'cancelled');throw new ModelSetupError(401,'model_setup_unauthorized');}return publicLogin(j);},
    async cancelLogin(id){const j=logins.get(id);if(!j)throw new ModelSetupError(404,'model_login_missing');if(j.state==='authorizing')throw new ModelSetupError(409,'model_login_committing');endLogin(j,'cancelled');await j.task;return publicLogin(j);},
    async register(input){
      if(closed)throw new ModelSetupError();
      const url=new URL(input.origin);
      if(url.origin!==input.origin||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))||!/^[a-f0-9-]{36}$/.test(input.id)||!/^ned_[A-Za-z0-9_-]{20,252}$/.test(input.token)||!['hosted','cli'].includes(input.kind))throw new ModelSetupError();
      hub={...input};
      try{if(enabled)await prepare();}catch{/* Missing provider must not prevent registration/COM health. UI status remains truthful. */}
    },
    async configure(input,authorize=()=>true){
      if(closed)throw new ModelSetupError();
      if(process.platform==='win32')throw new ModelSetupError(403,'model_setup_platform_unavailable');
      if([...logins.values()].some(j=>!j.finished))throw new ModelSetupError(409,'model_login_active');
      if(!enabled)throw new ModelSetupError(403,'model_setup_forbidden');
      const intent=intents.get(input?.nonce);intents.delete(input?.nonce);
      if(!intent||intent.expires<clock()||!input||Object.keys(input).some(k=>!['nonce','provider','model','apiKey','replace'].includes(k))||input.replace!==undefined&&typeof input.replace!=='boolean'||typeof input.provider!=='string'||!Object.hasOwn(providerUrls,input.provider)||!validModel(input.model)||typeof input.apiKey!=='string'||!/^[\x21-\x7e]{16,4096}$/.test(input.apiKey))throw new ModelSetupError(400,'model_setup_invalid');
      if(!intent.models?.[input.provider]?.includes(input.model)||!(await catalog())[input.provider]?.includes(input.model))throw new ModelSetupError(400,'model_setup_invalid');
      return (async()=>{
        const current=await profile();if(current.fingerprint!==intent.fingerprint||current.kind!=='missing'&&input.replace!==true)throw new ModelSetupError(409,'model_setup_changed');
        const provider=input.provider,headers=provider==='gemini'?{'x-goog-api-key':input.apiKey}:provider==='anthropic'?{'x-api-key':input.apiKey,'anthropic-version':'2023-06-01'}:{Authorization:'Bearer '+input.apiKey};
        const response=await fetchBound(providerUrls[provider]+(provider==='openrouter'?'/key':'/models'),{headers});await response.body?.cancel();
        if(!response.ok)throw new ModelSetupError(422,'model_authentication_failed');
        if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');
        if(['gemini','anthropic'].includes(provider))return nativeConfigure(current,input,authorize);
        await serial(()=>persist(current,{provider,model:input.model,key:input.apiKey,baseUrl:providerUrls[provider],kind:'local',authorize}));
        return {configured:true,source:'profile',model:input.model};
      })();
    },
    async handle(req,res,send,origin,authorize=()=>true,jobAuthorize=authorize){
      const fail=error=>send(error instanceof ModelSetupError?error.status:503,{error:{code:error instanceof ModelSetupError?error.code:'model_setup_unavailable',message:error instanceof ModelSetupError?error.message:'Model settings are unavailable. Check configuration and try again.'}});
      if(!enabled||req.headers['x-ned-models']!=='1'||req.headers['sec-fetch-site']==='cross-site')return fail(new ModelSetupError(403,'model_setup_forbidden'));
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname!=='/api/model-setup'||[...url.searchParams.keys()].some(k=>k!=='login')||url.searchParams.getAll('login').length>1||!['GET','POST'].includes(req.method)||req.method==='POST'&&url.search)return fail(new ModelSetupError(400,'model_setup_invalid'));
      try{
        if(req.method==='GET'){const result=url.searchParams.has('login')?{login:this.login(url.searchParams.get('login'))}:await status();if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return send(200,result);}
        if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return fail(new ModelSetupError(403,'model_setup_forbidden'));
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)throw new ModelSetupError(413,'model_setup_invalid');chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ModelSetupError(400,'model_setup_invalid');}
        if(input?.action==='disconnect')return send(200,await disconnect(input,authorize));
        if(input?.action==='login')return send(202,{login:await startLogin(input,jobAuthorize)});
        if(input?.action==='submit-login-code'&&Object.keys(input).every(k=>['action','id','code'].includes(k)))return send(202,{login:this.submitLoginCode(input.id,input.code)});
        if(input?.action==='cancel-login'&&Object.keys(input).every(k=>['action','id'].includes(k))){const login=await this.cancelLogin(input.id);if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return send(200,{login});}
        if(input?.action==='inherit'&&Object.keys(input).length===1){await prepare(authorize);const result=await status();if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return send(200,result);}
        return send(200,await this.configure(input,authorize));
      }catch(error){return fail(error);}
    },
    async close(){closed=true;for(const j of logins.values()){if(j.state==='authorizing'){j.state='cancelled';j.operation?.stop();}else endLogin(j,'cancelled');}await Promise.allSettled([...logins.values()].map(j=>j.task));await adapter.close?.();for(const request of requests)request.abort();intents.clear();await queue;hub=null;},
  };
}
