import {openNedDatabaseReadOnly} from '../../../src/database.js';
import {readDelivery} from './delivery.js';
import {createHermesGateway} from './hermes.js';
import {resolveGatewaySettings} from '../../../src/gateway-settings.js';
import {ProjectError} from '../../../src/project-error.js';
import {readHistoryPage} from './chat-history.js';

const unavailable=()=>new ProjectError('execution_unavailable',404,'Execution is unavailable.');
export async function readTaskDelivery({databasePath,home,env,gateway={},projectId,taskId,attemptId,sessionId,offset=0,signal}){
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new ProjectError('invalid_page',400,'Invalid page.');
  const db=openNedDatabaseReadOnly({databasePath});
  try{
    const item=db.prepare('SELECT id,description FROM ned_work_items WHERE project_id=? AND id=?').get(projectId,taskId);if(!item)throw unavailable();
    const delivery=readDelivery(db,projectId,taskId);
    const hasCore=Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ned_core_attempts'").get());
    let outputs=delivery?.outputs||[];
    if(hasCore&&!outputs.length){const latest=db.prepare("SELECT result_text AS text FROM ned_core_attempts WHERE project_id=? AND task_id=? AND length(result_text)>0 ORDER BY number DESC LIMIT 1").get(projectId,taskId);if(latest)outputs=[{id:'attempt-result',kind:'document',title:'Latest recorded response',text:latest.text.slice(0,16384)+(latest.text.length>16384?'\n\n[Preview truncated. Open the execution attempt for the captured response.]':'')}];}
    const attempts=hasCore?db.prepare('SELECT id,number,state,created_at AS createdAt,updated_at AS updatedAt FROM ned_core_attempts WHERE project_id=? AND task_id=? ORDER BY number DESC LIMIT 21 OFFSET ?').all(projectId,taskId,offset):[];
    if(!attemptId)return {projectId,taskId,description:item.description,impact:delivery?.impact||'',outputs,attempts:attempts.slice(0,20),nextOffset:attempts.length>20?offset+20:null};
    if(!hasCore)throw unavailable();
    const attempt=db.prepare('SELECT id,number,state,result_text AS resultText,result_complete AS resultComplete,result_truncated AS resultTruncated FROM ned_core_attempts WHERE project_id=? AND task_id=? AND id=?').get(projectId,taskId,attemptId);if(!attempt)throw unavailable();
    const bindings=db.prepare('SELECT session_id AS sessionId,role,worker_index AS workerIndex,gateway_identity AS gatewayIdentity FROM ned_core_bindings WHERE project_id=? AND attempt_id=? ORDER BY worker_index LIMIT 100').all(projectId,attemptId);
    if(!sessionId)return {projectId,taskId,attempt:{...attempt,sessions:bindings.map(({sessionId,role,workerIndex})=>({sessionId,role,workerIndex}))}};
    const binding=bindings.find(row=>row.sessionId===sessionId);if(!binding||!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId))throw unavailable();
    const settings=await resolveGatewaySettings({home,env,...gateway});
    const adapter=createHermesGateway({home,env,...gateway,url:settings.url,key:settings.key});
    try{if(await adapter.identity()!==binding.gatewayIdentity)throw unavailable();}finally{await adapter.close();}
    const controller=AbortSignal.timeout(5000);const combined=signal?AbortSignal.any([signal,controller]):controller;
    try{return {projectId,taskId,attemptId,sessionId,...await readHistoryPage({origin:settings.url.replace(/\/$/,''),key:settings.key,session:sessionId,offset,signal:combined})};}
    catch{throw new ProjectError('session_unavailable',503,'Session log is unavailable.');}
  }finally{db.close();}
}
