import {createHash,randomUUID,randomBytes} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {resolveRuntimeHome} from '../../../src/runtime-home.js';
import {resolveDatabasePath} from '../../../src/database.js';
import {createCoreServer} from '../../core/src/index.js';
import {loadOperatorCredential} from '../../core/src/auth.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const failure=(code,message)=>Object.assign(new Error(message),{code});
const messages={not_initialized:'Run ned task init for this project first.',not_found:'Work item or project not found.',not_owner:'Task belongs to another actor.',not_ready:'Task is not ready to start.',verification_required:'Managed attempt must be verified before completing this task.',idempotency_conflict:'Request ID already used for a different command. Read back state before continuing.',invalid_actor:'Actor must be agent:<id> or human:<id>.'};
const methods=['initialize','createItem','getItems','getItem','getChildren','getDependencies','getReadyTasks','getTree','getGoalProgress','getStatus','getActivity','startTask','completeTask','blockTask','unblockTask','getDelivery','setDelivery','getTaskAttempts'];

function apiOrigin(value){
  try{
    const url=new URL(value);
    if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error();
    return url.origin;
  }catch{throw failure('invalid_api','Use a loopback HTTP Core URL without a path, credentials, query or fragment.');}
}

export async function createTaskApiClient({project=process.cwd(),actor=`human:${os.userInfo().username}`,home,databaseUrl,env=process.env,api,requestId}={}){
  if(requestId!==undefined&&(typeof requestId!=='string'||!/^[\x21-\x7e]{1,128}$/.test(requestId)))throw failure('invalid_idempotency_key','Request ID must be 1–128 visible ASCII characters.');
  const configured=api??env.NED_CORE_URL;
  let origin=configured===undefined?null:apiOrigin(configured);
  const runtime=resolveRuntimeHome({home,env});
  const database=resolveDatabasePath({home,env,databaseUrl});
  const credential=origin?loadOperatorCredential({home,env}):randomBytes(32).toString('hex');
  let server;
  async function request(route,input){
    const key=requestId??randomUUID();
    let response,payload;
    try{
      const body=input===undefined?undefined:JSON.stringify(input);
      if(body&&Buffer.byteLength(body)>65536)throw failure('request_too_large','Task request exceeds 64 KiB.');
      response=await fetch(`${origin}/api/core/v1/${route}`,{method:input===undefined?'GET':'POST',headers:{authorization:`Bearer ${credential}`,...(body?{'content-type':'application/json','idempotency-key':key}:{})},body,redirect:'error',signal:AbortSignal.timeout(15000)});
      payload=await response.json();
    }catch(error){
      if(error.code==='request_too_large')throw error;
      throw failure('core_unavailable',`Core request could not be confirmed (request ID ${key}). Check the selected server and read back state; retry a mutation only with identical input and --request-id ${key}.`);
    }
    if(!response.ok){const reported=payload?.error?.code;const code=typeof reported==='string'&&/^[a-z_]{1,64}$/.test(reported)?reported:'core_unavailable';throw failure(code,messages[code]||`Core rejected the operation (${code}). Read back state before retrying.`);}
    if(!payload||!Object.hasOwn(payload,'data'))throw failure('core_unavailable',`Core returned an invalid response (request ID ${key}). Read back state before retrying.`);
    return payload.data;
  }
  try{
    if(!origin){server=await createCoreServer({home,env,databasePath:database,backendOnly:true,operatorCredential:credential});origin=await server.listen();}
    const context=await request('context');
    if(context?.runtime!==hash(runtime)||context?.database!==hash(database))throw failure('core_context_mismatch','Core runtime or database does not match this CLI context. Select the same NED_AGENT_HOME and database; no command was sent.');
    const client={close:async()=>{await server?.close();}};
    for(const operation of methods)client[operation]=(...args)=>{
      if(operation==='blockTask')args=[args[0],Object.fromEntries(['on','reason','service'].filter(key=>args[1]?.[key]!==undefined).map(key=>[key,args[1][key]]))];
      return request('task-management',{project:path.resolve(project),actor,operation,args});
    };
    return client;
  }catch(error){await server?.close();throw error;}
}
