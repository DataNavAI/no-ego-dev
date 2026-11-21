import {constants} from 'node:fs';
import {open,mkdir,lstat,rename,unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {parseDocument} from 'yaml';
import {parse as dotenv} from 'dotenv';
import {resolveGatewaySettings} from '../../../src/gateway-settings.js';

const modelPattern=/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/;
const validModel=value=>typeof value==='string'&&modelPattern.test(value);
const publicModel=current=>{const value=current.model.default??current.model.name;return validModel(value)?value:null;};
const providerUrls={openai:'https://api.openai.com/v1',openrouter:'https://openrouter.ai/api/v1'};
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
export function createModelSetup({home=homedir(),env=process.env,fetch:request=globalThis.fetch,enabled=true}={}){
  const root=env.HERMES_HOME??path.join(home,'.hermes'),intents=new Map(),requests=new Set();
  let hub,closed=false,queue=Promise.resolve();
  const serial=operation=>{const current=queue.then(()=>{if(closed)throw new ModelSetupError();return operation();});queue=current.catch(()=>{});return current;};
  async function fetchBound(url,options={}){
    const abort=new AbortController();requests.add(abort);
    try{return await request(url,{...options,redirect:'error',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(10000)])});}
    finally{requests.delete(abort);}
  }
  async function profile(){
    try{const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink()||process.getuid&&stat.uid!==process.getuid())throw new ModelSetupError();}catch(error){if(error.code!=='ENOENT')throw error;}
    const yaml=await readPrivate(path.join(root,'config.yaml')),secrets=await readPrivate(path.join(root,'.env'),true);
    const document=parseDocument(yaml.text,{logLevel:'silent'});if(document.errors.length)throw new ModelSetupError();
    const config=document.toJS({maxAliasCount:20})??{};
    if(!config||Array.isArray(config)||typeof config!=='object'||containsKey(config)&&!yaml.private)throw new ModelSetupError();
    const keys={...dotenv(secrets.text),...env};
    const auth=[];
    for(const file of ['auth.json','.anthropic_oauth.json'])auth.push((await readPrivate(path.join(root,file),true)).text);
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
    if(ownedHub)return {document,config,fingerprint,kind:'hub',model,entry,marker};
    if(key)return {document,config,fingerprint,kind:'profile',model};
    if(auth.some(Boolean)){
      // Ask the selected authenticated gateway to interpret its own OAuth store;
      // do not reimplement token formats or discover credentials from other homes.
      const settings=await resolveGatewaySettings({home,env});
      if(!/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(settings.url)||!settings.key)throw new ModelSetupError();
      const inventory=await jsonResponse(await fetchBound(settings.url+'/api/model/options',{headers:{Authorization:'Bearer '+settings.key}}),1048576);
      if(inventory.providers?.some(p=>p.authenticated===true&&(p.is_current===true||p.slug===inventory.provider)))return {document,config,fingerprint,kind:'profile',model};
      throw new ModelSetupError();
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
      if(!identity||current.kind==='hub'&&(current.marker.origin!==identity.origin||current.marker.instanceId!==identity.id))throw new ModelSetupError(409,'model_setup_required');
      const metadata=await remote(identity);if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');if(!metadata.connection)throw new ModelSetupError(409,'model_setup_required');
      const c=metadata.connection;
      if(current.kind!=='hub'||current.marker.connectionVersion!==c.version||current.entry.api_key!==identity.token)await persist(current,{provider:c.provider,model:c.model,key:identity.token,baseUrl:metadata.baseUrl,kind:'hub',connection:c,identity,authorize});
      return {provider:'custom:ned-hub',model:c.model};
    });
  }
  async function status(){
    const identity=hub,current=await profile();if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');
    const settingsUrl=identity?identity.origin+'/?settings=model':null;
    for(const [nonce,intent]of intents)if(intent.expires<Date.now())intents.delete(nonce);
    if(intents.size>=16)intents.delete(intents.keys().next().value);
    const nonce=randomBytes(32).toString('base64url');intents.set(nonce,{fingerprint:current.fingerprint,expires:Date.now()+300000});
    if(current.kind==='hub'){
      if(!hub||current.marker.origin!==hub.origin||current.marker.instanceId!==hub.id)return {configured:false,source:'hub',settingsUrl,hosted:hub?.kind==='hosted',nonce};
      const data=await remote(identity);if(identity!==hub)throw new ModelSetupError(409,'model_setup_changed');return {configured:Boolean(data.connection)&&data.connection.version===current.marker.connectionVersion&&current.entry.api_key===hub.token,source:'hub',settingsUrl,hosted:hub.kind==='hosted',model:data.connection?.model??null,nonce};
    }
    if(current.kind==='profile')return {configured:true,source:'profile',settingsUrl,hosted:hub?.kind==='hosted',model:publicModel(current),nonce};
    return {configured:false,source:hub?'hub':'local',settingsUrl,hosted:hub?.kind==='hosted',nonce};
  }
  return {status,prepare,
    async register(input){
      if(closed)throw new ModelSetupError();
      const url=new URL(input.origin);
      if(url.origin!==input.origin||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))||!/^[a-f0-9-]{36}$/.test(input.id)||!/^ned_[A-Za-z0-9_-]{20,252}$/.test(input.token)||!['hosted','cli'].includes(input.kind))throw new ModelSetupError();
      hub={...input};
      try{if(enabled)await prepare();}catch{/* Missing provider must not prevent registration/COM health. UI status remains truthful. */}
    },
    async configure(input,authorize=()=>true){
      if(!enabled||hub?.kind==='hosted')throw new ModelSetupError(403,'model_setup_forbidden');
      const intent=intents.get(input?.nonce);intents.delete(input?.nonce);
      if(!intent||intent.expires<Date.now()||!input||Object.keys(input).some(k=>!['nonce','provider','model','apiKey','replace'].includes(k))||input.replace!==undefined&&typeof input.replace!=='boolean'||typeof input.provider!=='string'||!Object.hasOwn(providerUrls,input.provider)||!validModel(input.model)||typeof input.apiKey!=='string'||!/^[\x21-\x7e]{16,4096}$/.test(input.apiKey))throw new ModelSetupError(400,'model_setup_invalid');
      return serial(async()=>{
        const current=await profile();if(current.fingerprint!==intent.fingerprint||current.kind!=='missing'&&input.replace!==true)throw new ModelSetupError(409,'model_setup_changed');
        const provider=input.provider,response=await fetchBound(providerUrls[provider]+(provider==='openrouter'?'/key':'/models'),{headers:{Authorization:'Bearer '+input.apiKey}});await response.body?.cancel();
        if(!response.ok)throw new ModelSetupError(422,'model_authentication_failed');
        if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');
        await persist(current,{provider,model:input.model,key:input.apiKey,baseUrl:providerUrls[provider],kind:'local',authorize});
        return {configured:true,source:'profile',model:input.model};
      });
    },
    async handle(req,res,send,origin,authorize=()=>true){
      const fail=error=>send(error instanceof ModelSetupError?error.status:503,{error:{code:error instanceof ModelSetupError?error.code:'model_setup_unavailable',message:error instanceof ModelSetupError?error.message:'Model settings are unavailable. Check configuration and try again.'}});
      if(!enabled||req.headers['x-ned-models']!=='1'||req.headers['sec-fetch-site']==='cross-site')return fail(new ModelSetupError(403,'model_setup_forbidden'));
      if(req.url!=='/api/model-setup'||!['GET','POST'].includes(req.method))return fail(new ModelSetupError(400,'model_setup_invalid'));
      try{
        if(req.method==='GET'){const result=await status();if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return send(200,result);}
        if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return fail(new ModelSetupError(403,'model_setup_forbidden'));
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)throw new ModelSetupError(413,'model_setup_invalid');chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ModelSetupError(400,'model_setup_invalid');}
        if(input?.action==='inherit'&&Object.keys(input).length===1){await prepare(authorize);const result=await status();if(!authorize())throw new ModelSetupError(401,'model_setup_unauthorized');return send(200,result);}
        return send(200,await this.configure(input,authorize));
      }catch(error){return fail(error);}
    },
    async close(){closed=true;for(const request of requests)request.abort();intents.clear();await queue;hub=null;},
  };
}
