import {randomUUID} from 'node:crypto';
import {createManagedProcessInspector} from './maintenance-processes.js';
import {existsSync} from 'node:fs';
import {openNedDatabase} from '../../../src/database.js';

const namespace='managed-maintenance.v1',quietMs=300000,prepareMs=60000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const target=value=>typeof value==='string'&&value.length<=512&&/^[a-z0-9][a-z0-9./:_-]+@sha256:[a-f0-9]{64}$/.test(value);
export class MaintenanceError extends Error {
  constructor(code='instance_updating',status=503){super('NED maintenance is unavailable. Retry shortly.');this.code=code;this.status=status;this.isTaskError=true;}
}
const invalid=()=>{throw new MaintenanceError('maintenance_invalid',400);};
export function createManagedMaintenance({database, databasePath, env=process.env, clock=Date.now,resetQuietClock=false,inspectProcesses}={}){
  const id=env.NED_MANAGED_INSTANCE_ID,generation=Number(env.NED_MANAGED_GENERATION);
  const supported=uuid(id)&&Number.isSafeInteger(generation)&&generation>0;
  inspectProcesses??=supported?createManagedProcessInspector({env}):()=>({idle:false,reason:'unknown_activity'});
  let db=database,owned=false,closed=false;const active=new Set(),sources=new Set();
  function connection(){if(closed)throw new MaintenanceError();if(!db){if(!supported&&(!databasePath||databasePath===':memory:'||!existsSync(databasePath)))return null;db=openNedDatabase({databaseUrl:databasePath,env,timeout:1000});owned=true;}return db;}
  const save=state=>db.setFeatureValue(namespace,'state',state);
  function read(){
    const state=db.getFeatureValue(namespace,'state');if(!state)return null;
    if(state.version!==1||!uuid(state.instanceId)||!Number.isSafeInteger(state.generation)||state.generation<1||!Number.isSafeInteger(state.lastActivityAt)||state.lastActivityAt<0||state.lease&&(!uuid(state.lease.requestId)||!target(state.lease.targetImage)||!['prepared','committed'].includes(state.lease.state)||!Number.isSafeInteger(state.lease.expiresAt)))throw new MaintenanceError();
    if(supported&&(state.instanceId!==id||state.generation!==generation))throw new MaintenanceError('maintenance_identity_changed',409);
    if(state.lease?.state==='prepared'&&state.lease.expiresAt<=clock()){state.lease=null;state.lastActivityAt=clock();save(state);}return state;
  }
  try{if(supported){connection().write(()=>{
    const old=db.getFeatureValue(namespace,'state');
    if(old&&(old.version!==1||old.instanceId!==id||!Number.isSafeInteger(old.generation)||old.generation>generation))throw new MaintenanceError('maintenance_identity_changed',409);
    if(!old||old.generation<generation){db.connection.prepare('DELETE FROM ned_feature_data WHERE namespace=?').run(namespace);save({version:1,instanceId:id,generation,lastActivityAt:clock(),lease:null});}
    else{const current=read();if(resetQuietClock){current.lastActivityAt=clock();save(current);}}
  });}}catch(error){if(owned)db?.close();throw error;}
  function validate(input){
    if(!supported)throw new MaintenanceError('maintenance_unsupported',409);
    if(!input||Object.keys(input).sort().join(',')!=='generation,instanceId,requestId,targetImage'||!uuid(input.requestId)||!target(input.targetImage)||input.instanceId!==id||input.generation!==generation)invalid();
  }
  const matches=(lease,input)=>lease?.requestId===input.requestId&&lease.targetImage===input.targetImage;
  function idle(state){
    if(state.lease?.state==='committed')return {idle:false,reason:'maintenance'};
    if(db.connection.prepare("SELECT 1 FROM ned_feature_data WHERE namespace=? AND key LIKE 'work:%' LIMIT 1").get(namespace))return {idle:false,reason:'active_work'};
    if(db.connection.prepare("SELECT 1 FROM ned_work_items WHERE type IN ('task','issue') AND state='working' LIMIT 1").get())return {idle:false,reason:'active_task'};
    if(db.connection.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ned_core_attempts'").get()&&db.connection.prepare("SELECT 1 FROM ned_core_attempts WHERE state NOT IN ('succeeded','failed','cancelled') LIMIT 1").get())return {idle:false,reason:'active_task'};
    if(db.connection.prepare("SELECT 1 FROM ned_feature_data WHERE namespace=? AND key LIKE 'draft:%' LIMIT 1").get(namespace))return {idle:false,reason:'pending_draft'};
    if([...sources].some(source=>source()))return {idle:false,reason:'active_work'};
    if(clock()-state.lastActivityAt<quietMs)return {idle:false,reason:'recent_activity'};
    const processes=inspectProcesses();if(processes?.idle!==true)return {idle:false,reason:processes?.reason==='active_command'?'active_command':'unknown_activity'};
    return {idle:true,reason:'idle'};
  }
  const reply=(state,input,ready=false)=>({supported:true,instanceId:id,generation,...idle(state),requestId:input.requestId,ready,state:matches(state.lease,input)?state.lease.state:'none',expiresAt:state.lease?.state==='prepared'?state.lease.expiresAt:null});
  function operation(action,input){validate(input);return connection().write(()=>{
    const state=read();if(!state)throw new MaintenanceError();
    if(action==='status')return reply(state,input);
    if(action==='release'){if(state.lease&&!matches(state.lease,input))throw new MaintenanceError('maintenance_conflict',409);state.lease=null;state.lastActivityAt=clock();save(state);return {supported:true,released:true,requestId:input.requestId,instanceId:id,generation};}
    if(state.lease&&!matches(state.lease,input))throw new MaintenanceError('maintenance_conflict',409);
    if(state.lease?.state==='committed')return reply(state,input,true);
    const readiness=idle(state);if(!readiness.idle)return {...reply(state,input),ready:false};
    if(action==='prepare'){state.lease??={requestId:input.requestId,targetImage:input.targetImage,state:'prepared',expiresAt:clock()+prepareMs};save(state);return reply(state,input,true);}
    if(action==='commit'){if(!matches(state.lease,input))throw new MaintenanceError('maintenance_missing',409);state.lease.state='committed';save(state);return reply(state,input,true);}
    invalid();
  });}
  function enter(kind='request'){
    if(!['request','chat','task','command','document','model_auth'].includes(kind))invalid();
    if(active.size>=64)throw new MaintenanceError('maintenance_busy');const current=connection();if(!current)return ()=>{};
    const key='work:'+randomUUID();let identity;
    current.write(()=>{const state=read();if(!state)return;if(state.lease?.state==='committed')throw new MaintenanceError();state.lease=null;state.lastActivityAt=clock();save(state);identity={instanceId:state.instanceId,generation:state.generation};current.setFeatureValue(namespace,key,{...identity,kind});});
    if(!identity)return ()=>{};active.add(key);let finished=false;
    return ()=>{if(finished)return;finished=true;active.delete(key);if(closed)return;current.write(()=>{current.connection.prepare('DELETE FROM ned_feature_data WHERE namespace=? AND key=?').run(namespace,key);const state=read();if(state&&state.instanceId===identity.instanceId&&state.generation===identity.generation){state.lastActivityAt=clock();save(state);}});};
  }
  function interaction(input){
    if(!input||!['interaction','draft'].includes(input.kind)||!uuid(input.clientId)||typeof input.hasDraft!=='boolean'||Object.keys(input).sort().join(',')!=='clientId,hasDraft,kind')invalid();
    const current=connection();if(!current)return {accepted:false};
    return current.write(()=>{const state=read();if(!state)return {accepted:false};if(state.lease?.state==='committed')throw new MaintenanceError();
      const key='draft:'+input.clientId;if(input.hasDraft){if(!current.getFeatureValue(namespace,key)&&current.connection.prepare("SELECT COUNT(*) AS n FROM ned_feature_data WHERE namespace=? AND key LIKE 'draft:%'").get(namespace).n>=64)throw new MaintenanceError('maintenance_busy');current.setFeatureValue(namespace,key,{pending:true});}else current.connection.prepare('DELETE FROM ned_feature_data WHERE namespace=? AND key=?').run(namespace,key);
      if(input.kind==='interaction'||input.hasDraft){state.lease=null;if(input.kind==='interaction')state.lastActivityAt=clock();save(state);}return {accepted:true};
    });
  }
  return {supported,enter,interaction,touch(){const release=enter();release();return {accepted:supported};},addBusySource(source){if(typeof source!=='function'||sources.size>=16)invalid();sources.add(source);return ()=>sources.delete(source);},
    status(input){if(!supported)return {supported:false,idle:false,reason:'unsupported'};try{return operation('status',input);}catch(error){if(error instanceof MaintenanceError&&error.status===400)throw error;return {supported:true,idle:false,ready:false,reason:'unknown_activity'};}},
    prepare:input=>operation('prepare',input),commit:input=>operation('commit',input),release:input=>operation('release',input),
    close(){closed=true;if(owned)db?.close();}
  };
}
