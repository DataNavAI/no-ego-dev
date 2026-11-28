import {createHermesGateway} from './hermes.js';
import {readProjectWork} from './work.js';

const active=new Set(['running','stopping','waiting_for_approval']);
const maxConcurrent=4;
const validRun=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);

export function createVerifiedWorkReader({databasePath,home,env,gateway}={}){
  const adapter=createHermesGateway({home,env,...gateway});
  const pending=new Map();
  async function verify(binding){
    if(!binding)return 'unbound';
    if(!binding.identity||!validRun(binding.runId)||!validRun(binding.sessionId))return 'unverified';
    const key=JSON.stringify([binding.identity,binding.runId,binding.sessionId]);
    if(pending.has(key))return pending.get(key);
    if(pending.size>=maxConcurrent)return 'unverified';
    const result=adapter.getRun(binding.runId,binding.identity).then(run=>{
      if(run.session_id!==binding.sessionId)return 'unverified';
      if(active.has(run.status))return run.status;
      return run.status==='queued'?'queued':'inactive';
    },()=> 'unverified').finally(()=>pending.delete(key));
    pending.set(key,result);
    return result;
  }
  async function read(projects){
    const snapshots=projects.map(project=>readProjectWork(databasePath,project.id,{includeRunBindings:true}));
    await Promise.all(snapshots.flatMap(project=>project.items.filter(item=>item.status==='working').map(async item=>{
      const binding=item.runBinding;
      delete item.runBinding;
      const execution=await verify(binding);
      item.claimStatus='working';
      item.executionState=execution;
      if(!active.has(execution)){item.status='claimed';item.sessions=[];return;}
      item.sessions=item.sessions.filter(session=>session.attemptId===binding.attemptId);
    })));
    return snapshots;
  }
  return {read,close:()=>adapter.close()};
}
