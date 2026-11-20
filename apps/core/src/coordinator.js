import {randomUUID,createHash} from 'node:crypto';
import {createExecutionOwner} from './owner.js';
import {createHermesGateway} from './hermes.js';

const activeStates=['dispatching','running','stopping','unknown'];
const observedStates=['running','stopping'];
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);
const title=(attempt,role,index)=>`ned.${createHash('sha256').update(attempt.taskId).digest('hex').slice(0,12)}.${attempt.id}.${role}.${index}`;

export async function createCoreRuntime(options={}) {
  const {store}=options;
  const gateway=options.gateway??createHermesGateway(options);
  const owner=createExecutionOwner(options);
  const activeLimit=options.limits?.active??1;
  if(!Number.isInteger(activeLimit)||activeLimit<1||activeLimit>4)throw new Error('Invalid Core execution capacity.');
  const streams=new Map(),failures=new Map(),subagentParents=new Map();
  let closing=false,closePromise,maintenancePromise,generation=0,observationCursor=0,lastError=null;
  function update(attempt,patch,event){owner.assert();return store.updateAttempt(attempt.projectId,attempt.id,patch,event);}
  function current(attempt){return store.getAttempt(attempt.projectId,attempt.id);}
  function fence(attempt,states,operation=row=>row){return store.transaction(()=>{
    if(closing)return null;owner.assert();const row=current(attempt);
    if(!states.includes(row.state)||row.gatewayIdentity!==attempt.gatewayIdentity||row.sessionId!==attempt.sessionId||row.runId!==attempt.runId)return null;
    return operation(row);
  });}
  function incomplete(attempt){return fence(attempt,observedStates,value=>{if(value.resultComplete||value.mappingComplete)return update(value,{resultComplete:false,mappingComplete:false},'observation.gap');return value;});}
  function unknown(attempt,code){return fence(attempt,['queued','preparing','dispatching',...observedStates],row=>update(row,{state:'unknown',errorCode:code,resultComplete:false,mappingComplete:false},'attempt.unknown'));}
  function acquire(){
    if(owner.held)return true;
    if(!owner.acquire())return false;
    generation=store.transaction(()=>{
      const old=store.sql.prepare("SELECT generation FROM ned_core_owner WHERE name='execution'").get();
      const next=(old?.generation??0)+1;
      store.sql.prepare("INSERT INTO ned_core_owner(name,instance_id,generation,started_at) VALUES('execution',?,?,?) ON CONFLICT(name) DO UPDATE SET instance_id=excluded.instance_id,generation=excluded.generation,started_at=excluded.started_at").run(owner.instanceId,next,store.now());return next;
    });
    for(const attempt of store.listAttempts({states:activeStates,limit:1000})){
      if(attempt.admissionSentAt&&!attempt.runId&&attempt.state!=='unknown')unknown(attempt,'admission_uncertain');
      else if(attempt.runId&&observedStates.includes(attempt.state))incomplete(attempt);
    }
    store.sql.prepare("UPDATE ned_core_tick_requests SET state='pending' WHERE state='running'").run();
    return true;
  }
  function settle(attempt,status){return fence(attempt,observedStates,row=>{
    if(status.run_id!==row.runId||status.session_id&&status.session_id!==row.sessionId){unknown(row,'run_identity_conflict');return;}
    if(status.status==='completed'){
      if(typeof status.output==='string'){
        const bytes=Buffer.from(status.output);let end=Math.min(bytes.length,1048576);while(end>0&&(bytes[end]&0xc0)===0x80)end--;
        update(row,{resultText:bytes.subarray(0,end).toString('utf8'),resultTruncated:bytes.length>1048576},'result.available');
      }
      update(row,{state:'awaiting_verification',errorCode:null},'attempt.completed');
    }else if(['failed','cancelled'].includes(status.status))update(row,{state:status.status,errorCode:status.status==='failed'?'run_failed':null},`attempt.${status.status}`);
    else if(status.status==='interrupted')unknown(row,'run_interrupted');
    else if(status.status==='waiting_for_approval')update(row,{errorCode:'waiting_for_approval'},'attempt.waiting_for_approval');
    else if(['queued','running','stopping'].includes(status.status)&&row.errorCode==='waiting_for_approval')update(row,{errorCode:null},'attempt.running');
  });}
  function child(attempt,event){return fence(attempt,observedStates,row=>{
    if(!safeId(event.child_session_id)||!safeId(event.subagent_id)||!safeId(event.delegation_id)){incomplete(attempt);return;}
    const key=`${attempt.id}:${event.subagent_id}`;
    if(subagentParents.has(key)&&subagentParents.get(key)!==event.child_session_id){incomplete(attempt);return;}
    let parentSession;
    if(event.depth===0&&!event.parent_id)parentSession=attempt.sessionId;
    else if(safeId(event.parent_id))parentSession=subagentParents.get(`${attempt.id}:${event.parent_id}`);
    if(!parentSession){incomplete(attempt);return;}
    const existing=row.bindings.find(binding=>binding.sessionId===event.child_session_id);
    if(existing){if(existing.parentSessionId!==parentSession||existing.delegationId!==event.delegation_id){incomplete(row);return;}subagentParents.set(key,event.child_session_id);return;}
    if(row.bindings.length>=256){incomplete(row);return;}
    const index=row.bindings.filter(binding=>binding.role==='child').length;
    try{
      store.bind(row.projectId,row.id,{gatewayIdentity:row.gatewayIdentity,profileIdentity:row.gatewayIdentity,sessionId:event.child_session_id,role:'child',workerIndex:index,delegationId:event.delegation_id,parentSessionId:parentSession,expectedTitle:title(row,'child',index),namingState:'pending'});
      subagentParents.set(key,event.child_session_id);
    }catch{incomplete(row);}
  });}
  function subscribe(attempt){
    if(streams.has(attempt.runId)||closing)return;
    const controller=new AbortController();
    const record={controller,promise:null};streams.set(attempt.runId,record);
    record.promise=(async()=>{
      try{
        for await(const event of gateway.events(attempt.runId,attempt.gatewayIdentity,{signal:controller.signal})){
          if(closing||controller.signal.aborted)break;
          const row=fence(attempt,observedStates);if(!row)break;
          if(event.run_id!==row.runId)throw new Error('Invalid run event.');
          if(event.event==='message.delta'&&typeof event.delta==='string')store.appendResult(row.projectId,row.id,event.delta);
          else if(['subagent.start','subagent.complete'].includes(event.event))await child(row,event);
          else if(event.event.startsWith('run.'))await settle(row,{...event,status:event.event.slice(4)});
          if(!fence(row,observedStates))break;
        }
        if(!closing)incomplete(attempt);
      }catch{if(!closing)incomplete(attempt);}
      finally{streams.delete(attempt.runId);}
    })();
  }
  async function observe(attempt){
    let row=fence(attempt,observedStates);if(!row)return;
    try{
      const identity=await gateway.identity();row=fence(row,observedStates);if(!row)return;
      if(identity!==row.gatewayIdentity){unknown(row,'gateway_identity_changed');return;}
      const status=await gateway.getRun(row.runId,row.gatewayIdentity);settle(row,status);row=fence(row,observedStates);
      if(!row){streams.get(attempt.runId)?.controller.abort();return;}failures.delete(row.id);
      if(row.stopRequested&&status.status!=='stopping'){
        if(row.state!=='stopping')row=fence(row,observedStates,value=>update(value,{state:'stopping'},'attempt.stopping'));
        if(!row)return;
        await gateway.stop(row.runId,row.gatewayIdentity);
      }
      row=fence(row,observedStates);if(row)subscribe(row);
    }catch(error){
      fence(attempt,observedStates,value=>{
        const count=(failures.get(value.id)??0)+1;failures.set(value.id,count);incomplete(value);
        if(error.code==='gateway_identity_changed'||error.status===404||error.status===401||error.status===403||count>=3){unknown(value,error.code==='gateway_identity_changed'?'gateway_identity_changed':'run_unavailable');streams.get(value.runId)?.controller.abort();}
      });
    }
  }
  async function nameBindings(attempt,budget){
    let operations=0;
    for(const binding of current(attempt).bindings){
      if(binding.namingState!=='pending')continue;
      if(operations>=budget)break;operations++;
      try{
        const states=[...observedStates,'awaiting_verification'];if(!fence(attempt,states))break;
        await gateway.setTitle(binding.sessionId,binding.expectedTitle,attempt.gatewayIdentity);
        fence(attempt,states,row=>{const bound=row.bindings.find(value=>value.id===binding.id);if(bound&&bound.sessionId===binding.sessionId&&bound.gatewayIdentity===binding.gatewayIdentity&&bound.profileIdentity===binding.profileIdentity&&bound.expectedTitle===binding.expectedTitle)store.updateBinding(binding.id,{namingState:'confirmed'});});
      }catch{break;}
    }
    return operations;
  }
  function eligible(attempt){
    const eligibility=store.runtimeEligibility(attempt);
    if(!eligibility.eligible){update(attempt,{state:'cancelled',errorCode:eligibility.reason??'readiness_changed'},'attempt.cancelled');return false;}return true;
  }
  async function admit(attempt,deadline){
    let row=current(attempt);
    if(row.stopRequested){update(row,{state:'cancelled',errorCode:'stopped_before_admission'},'attempt.cancelled');return false;}
    if(row.admissionSentAt){unknown(row,'admission_uncertain');return false;}
    if(!eligible(row)||!store.capacity({reserveResult:true,effect:true}).available)return false;
    const active=store.listAttempts({states:activeStates,limit:1000});if(active.length>=activeLimit)return false;
    row=update(row,{state:'preparing'},'attempt.preparing');
    let identity;
    try{
      identity=await gateway.identity();
      row=fence(row,['preparing']);if(!row)return false;
      if(row.gatewayIdentity&&row.gatewayIdentity!==identity){unknown(row,'gateway_identity_changed');return false;}
      const capability=await gateway.capabilities(identity,{deadline});
      row=fence(row,['preparing']);if(!row)return false;
      if(!capability.supported){fence(row,['preparing'],value=>update(value,{state:'failed',errorCode:'unsupported_gateway'},'attempt.failed'));return false;}
      const intent={id:row.sessionId??`ned_${row.id}`,title:title(row,'worker',0)};
      if(row.stopRequested)return false;
      row=fence(row,['preparing'],value=>update(value,{sessionId:intent.id,gatewayIdentity:identity},'session.intent'));if(!row)return false;
      if(Date.now()>=deadline)return false;
      if(!store.capacity({reserveResult:true,effect:true}).available||!eligible(current(row)))return false;
      let session;
      try{session=await gateway.createKnownSession(intent,identity,{deadline});}catch(error){
        row=fence(row,['preparing']);if(!row)return false;
        if([400,401,403].includes(error.status)){fence(row,['preparing'],value=>update(value,{state:'failed',errorCode:error.code==='auth_failed'?'auth_failed':'session_rejected'},'attempt.failed'));return false;}
        for(let index=0;index<3&&Date.now()<deadline;index++){
          if(!fence(row,['preparing']))return false;
          try{session=await gateway.getSession(intent.id,identity,{deadline});break;}catch{session=null;}
        }
        row=fence(row,['preparing']);if(!row)return false;
        if(!session){unknown(row,'session_uncertain');return false;}
      }
      row=fence(row,['preparing']);if(!row)return false;
      if(session.id!==intent.id||session.title!==intent.title||session.source!=='api_server'){unknown(row,'session_identity_conflict');return false;}
      fence(row,['preparing'],value=>store.bind(value.projectId,value.id,{gatewayIdentity:identity,profileIdentity:identity,sessionId:session.id,role:'worker',workerIndex:0,expectedTitle:title(value,'worker',0),namingState:'confirmed'}));
      row=fence(row,['preparing']);if(!row)return false;
      if(row.stopRequested){update(row,{state:'cancelled',errorCode:'stopped_before_admission'},'attempt.cancelled');return false;}
      if(!eligible(row)||!store.capacity({reserveResult:true,effect:true}).available)return false;
      if(Date.now()>=deadline){unknown(row,'admission_uncertain');return false;}
      const request={input:row.request.input??row.request.instructions,session_id:row.sessionId};
      owner.assert();
      if(!store.markAdmission(row.projectId,row.id,{request,admissionDeadline:new Date(deadline).toISOString(),gatewayIdentity:identity}))return false;
      const accepted=await gateway.submitRun(request,row.dispatchKey,identity,{deadline});
      row=fence(row,['dispatching','stopping']);if(!row)return true;
      if(!safeId(accepted.run_id)){unknown(row,'admission_uncertain');return true;}
      row=fence(row,['dispatching','stopping'],value=>update(value,{runId:accepted.run_id,state:value.stopRequested?'stopping':'running'},'attempt.admitted'));
      if(row)subscribe(row);return true;
    }catch(error){
      if(closing)return false;
      row=fence(row,['preparing','dispatching','stopping']);if(!row)return false;
      if(row.admissionSentAt){if([400,401,403,409,422,429].includes(error.status))fence(row,['dispatching','stopping'],value=>update(value,{state:'failed',errorCode:error.code==='auth_failed'?'auth_failed':'admission_rejected'},'attempt.failed'));else unknown(row,'admission_uncertain');}
      else fence(row,['preparing'],value=>update(value,{state:'failed',errorCode:error.code==='auth_failed'?'auth_failed':'unsupported_gateway'},'attempt.failed'));
      return !!row.admissionSentAt;
    }
  }
  async function tick(request){
    const deadline=Date.now()+10000,counts={admissions:0,observations:0,outbox:0};
    store.updateTick(request.id,{state:'running',ownerGeneration:generation});
    try{
      store.materializeDue();
      for(const attempt of store.listAttempts({states:['queued','preparing'],limit:10})){
        if(closing||Date.now()>=deadline||counts.admissions>=1)break;
        if(await admit(attempt,deadline))counts.admissions++;
        counts.outbox++;
      }
      store.updateTick(request.id,{state:'completed',counts,finishedAt:store.now()});
    }catch(error){store.updateTick(request.id,{state:'failed',counts:{...counts,errorCode:error.code??'coordinator_unavailable'},finishedAt:store.now()});}
  }
  async function performMaintenance(){
    if(closing||!acquire())return;
    owner.assert();
    for(const attempt of store.listAttempts({states:['queued','preparing','dispatching'],limit:1000})){
      if(attempt.admissionSentAt&&!attempt.runId)unknown(attempt,'admission_uncertain');
      else if(attempt.stopRequested&&!attempt.admissionSentAt)update(attempt,{state:'cancelled',errorCode:'stopped_before_admission'},'attempt.cancelled');
    }
    const active=store.listAttempts({states:observedStates,limit:1000});
    for(let offset=0;offset<Math.min(active.length,10)&&!closing;offset++)await observe(active[(observationCursor+offset)%active.length]);
    observationCursor=active.length?(observationCursor+10)%active.length:0;
    const pending=store.pendingTicks()[0];if(pending&&!closing)await tick(pending);
    let naming=0;
    for(const attempt of store.listAttempts({states:[...observedStates,'awaiting_verification'],limit:10})){
      if(naming>=10||closing)break;naming+=await nameBindings(attempt,10-naming);
    }
  }
  function maintenance(){
    if(maintenancePromise)return maintenancePromise;
    maintenancePromise=performMaintenance().catch(error=>{lastError=error.code??'coordinator_unavailable';}).finally(()=>{maintenancePromise=null;});return maintenancePromise;
  }
  try{acquire();}catch(error){try{await gateway.close?.();}finally{owner.close();}throw error;}
  const timer=setInterval(()=>{void maintenance();},1000);timer.unref();
  return {
    requestReconcile(key){if(closing)throw new Error('Core is closing.');const request=store.createTick(typeof key==='string'?key:key?.key??randomUUID());void maintenance();return request;},
    getTick:id=>store.getTick(id),
    maintenance,
    status:()=>({owner:owner.held,instanceId:owner.instanceId,generation,closing,execution:owner.held?'ready':'owner_busy',...(lastError?{errorCode:lastError}:{})}),
    close(){
      if(closePromise)return closePromise;closing=true;clearInterval(timer);
      closePromise=(async()=>{
        for(const record of streams.values())record.controller.abort();
        await gateway.close?.();await maintenancePromise;
        await Promise.allSettled([...streams.values()].map(record=>record.promise));owner.close();
      })();return closePromise;
    },
  };
}
