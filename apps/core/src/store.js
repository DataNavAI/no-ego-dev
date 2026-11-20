import {createHash,randomUUID} from 'node:crypto';
import {statSync,statfsSync} from 'node:fs';
import {openNedDatabase} from '../../../src/database.js';

export class CoreError extends Error {
  constructor(code,status=409,message='Core operation could not be completed.') {super(message);this.code=code;this.status=status;this.isTaskError=true;}
}
export const fail=(code,status,message)=>{throw new CoreError(code,status,message);};
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const snake=key=>key.replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`);
const camel=key=>key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase());
export function decode(row) {
  if(!row)return null;
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[camel(key.endsWith('_json')?key.slice(0,-5):key),key.endsWith('_json')&&value!==null?JSON.parse(value):value]));
}
const schema=`
CREATE TABLE IF NOT EXISTS ned_core_schema(version INTEGER PRIMARY KEY CHECK(version=1));
INSERT OR IGNORE INTO ned_core_schema VALUES(1);
CREATE TABLE IF NOT EXISTS ned_core_enrollments(project_id TEXT,task_id TEXT,enabled INTEGER NOT NULL,created_at TEXT,updated_at TEXT,PRIMARY KEY(project_id,task_id),FOREIGN KEY(project_id,task_id) REFERENCES ned_work_items(project_id,id));
CREATE TABLE IF NOT EXISTS ned_core_attempts(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,task_id TEXT NOT NULL,number INTEGER NOT NULL,role TEXT NOT NULL,state TEXT NOT NULL,dispatch_key TEXT NOT NULL UNIQUE,request_json TEXT NOT NULL,request_hash TEXT NOT NULL,gateway_identity TEXT,session_id TEXT,run_id TEXT,admission_sent_at TEXT,admission_deadline TEXT,stop_requested INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,error_code TEXT,result_text TEXT NOT NULL DEFAULT '',result_complete INTEGER NOT NULL DEFAULT 1,result_truncated INTEGER NOT NULL DEFAULT 0,mapping_complete INTEGER NOT NULL DEFAULT 1,evidence_json TEXT,UNIQUE(project_id,task_id,number),FOREIGN KEY(project_id,task_id) REFERENCES ned_work_items(project_id,id));
CREATE UNIQUE INDEX IF NOT EXISTS ned_core_active_task ON ned_core_attempts(project_id,task_id) WHERE state NOT IN ('succeeded','failed','cancelled');
CREATE TABLE IF NOT EXISTS ned_core_bindings(id TEXT PRIMARY KEY,attempt_id TEXT NOT NULL REFERENCES ned_core_attempts(id),project_id TEXT NOT NULL,gateway_identity TEXT NOT NULL,profile_identity TEXT NOT NULL,session_id TEXT NOT NULL,role TEXT NOT NULL,worker_index INTEGER NOT NULL,delegation_id TEXT,parent_session_id TEXT,expected_title TEXT NOT NULL,naming_state TEXT NOT NULL,UNIQUE(gateway_identity,profile_identity,session_id),UNIQUE(attempt_id,role,worker_index));
CREATE TABLE IF NOT EXISTS ned_core_automations(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES ned_projects(id),kind TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,interval_seconds INTEGER,next_due_at TEXT,target_json TEXT NOT NULL,overlap_policy TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ned_core_occurrences(id TEXT PRIMARY KEY,automation_id TEXT NOT NULL REFERENCES ned_core_automations(id),scheduled_at TEXT NOT NULL,state TEXT NOT NULL,attempt_id TEXT REFERENCES ned_core_attempts(id),task_id TEXT,reason TEXT,UNIQUE(automation_id,scheduled_at));
CREATE TABLE IF NOT EXISTS ned_core_owner(name TEXT PRIMARY KEY,instance_id TEXT,generation INTEGER,started_at TEXT);
CREATE TABLE IF NOT EXISTS ned_core_tick_requests(id TEXT PRIMARY KEY,idempotency_scope TEXT UNIQUE,state TEXT NOT NULL,counts_json TEXT,created_at TEXT NOT NULL,finished_at TEXT,owner_generation INTEGER);
CREATE TABLE IF NOT EXISTS ned_core_outbox(id TEXT PRIMARY KEY,attempt_id TEXT REFERENCES ned_core_attempts(id),kind TEXT NOT NULL,state TEXT NOT NULL,owner_generation INTEGER,attempt_count INTEGER NOT NULL DEFAULT 0,next_at TEXT,payload_hash TEXT,UNIQUE(attempt_id,kind));
CREATE TABLE IF NOT EXISTS ned_core_idempotency(scope TEXT NOT NULL,key TEXT NOT NULL,request_hash TEXT NOT NULL,status INTEGER NOT NULL,response_json TEXT NOT NULL,PRIMARY KEY(scope,key));
CREATE TABLE IF NOT EXISTS ned_core_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,project_id TEXT NOT NULL REFERENCES ned_projects(id),entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,event_type TEXT NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL);
`;
export function createCoreStore({database,databasePath,home,env,clock=()=>new Date(),limits={},storageProbe}={}) {
  const db=database||openNedDatabase({databaseUrl:databasePath,home,env}),sql=db.connection;
  try{db.write(()=>{
    sql.exec(schema);if(sql.prepare('SELECT version FROM ned_core_schema WHERE version<>1 LIMIT 1').get())fail('unsupported_schema',503);
    const columns=new Set(sql.prepare('PRAGMA table_info(ned_core_occurrences)').all().map(row=>row.name));
    for(const [name,type] of [['target_json','TEXT'],['input_text','TEXT'],['definition_revision','INTEGER'],['snapshot_error','TEXT']])if(!columns.has(name))sql.exec(`ALTER TABLE ned_core_occurrences ADD COLUMN ${name} ${type}`);
    for(const row of sql.prepare("SELECT o.id,o.automation_id,a.project_id FROM ned_core_occurrences o JOIN ned_core_automations a ON a.id=o.automation_id WHERE o.state='pending' AND (o.target_json IS NULL OR o.definition_revision IS NULL)").all()){
      sql.prepare("UPDATE ned_core_occurrences SET state='skipped',reason='snapshot_unavailable' WHERE id=?").run(row.id);
      sql.prepare("INSERT INTO ned_core_events(project_id,entity_type,entity_id,event_type,payload_json,created_at) VALUES(?,'automation',?,'occurrence.skipped',?,?)").run(row.project_id,row.automation_id,JSON.stringify({reason:'snapshot_unavailable'}),new Date(clock()).toISOString());
    }
  });}
  catch(error){if(!database)db.close();throw error;}
  const now=()=>new Date(clock()).toISOString();
  const bounds={definitions:100,pending:32,attempts:1000,events:50000,resultBytes:256*1024*1024,fileBytes:1024**3,freeBytes:512*1024*1024,...limits};
  const transaction=fn=>db.write(fn);
  function project(id){if(!sql.prepare('SELECT id FROM ned_projects WHERE id=?').get(id))fail('not_found',404);return id;}
  function event(projectId,entityType,entityId,eventType,payload={}) {
    const allowed=Object.fromEntries(Object.entries(payload).filter(([key])=>['state','errorCode','reason','attemptId','taskId','number','enabled','revision','runId','sessionId','role','workerIndex'].includes(key)));
    sql.prepare('INSERT INTO ned_core_events(project_id,entity_type,entity_id,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(projectId,entityType,entityId,eventType,JSON.stringify(allowed),now());
  }
  function capacity({reserveResult=false,definition=false,effect=false,consumePending=false}={}) {
    let disk;
    try {
      disk=storageProbe?storageProbe():db.filename===':memory:'?{fileBytes:0,freeBytes:Number.MAX_SAFE_INTEGER}:{fileBytes:['','-wal','-shm'].reduce((sum,suffix)=>{try{return sum+statSync(db.filename+suffix).size;}catch(error){if(error.code==='ENOENT')return sum;throw error;}},0),freeBytes:(()=>{const fs=statfsSync(db.filename);return fs.bavail*fs.bsize;})()};
    }catch{fail('storage_unavailable',503);}
    const counts={definitions:sql.prepare('SELECT COUNT(*) AS n FROM ned_core_automations').get().n,pending:sql.prepare("SELECT COUNT(*) AS n FROM ned_core_attempts WHERE state IN ('queued','preparing')").get().n+sql.prepare("SELECT COUNT(*) AS n FROM ned_core_occurrences WHERE state='pending'").get().n,attempts:sql.prepare('SELECT COUNT(*) AS n FROM ned_core_attempts').get().n,events:sql.prepare('SELECT COUNT(*) AS n FROM ned_core_events').get().n,resultBytes:sql.prepare("SELECT COALESCE(SUM(length(CAST(result_text AS BLOB))),0) AS n FROM ned_core_attempts").get().n,...disk};
    const active=sql.prepare("SELECT COUNT(*) AS n FROM ned_core_attempts WHERE state IN ('dispatching','running','stopping','unknown')").get().n;
    const reason=(definition&&counts.definitions>=bounds.definitions)?'definitions':!effect&&counts.pending-(consumePending?1:0)>=bounds.pending?'pending':!effect&&counts.attempts>=bounds.attempts?'attempts':counts.events>=bounds.events?'events':counts.resultBytes+(active+(reserveResult?1:0))*1048576>bounds.resultBytes?'resultBytes':counts.fileBytes>=bounds.fileBytes?'fileBytes':counts.freeBytes<bounds.freeBytes?'freeBytes':null;
    return {available:!reason,reason,counts,limits:bounds};
  }
  function requireCapacity(options){const state=capacity(options);if(!state.available)fail('capacity_exhausted',503);return state;}
  function getAttempt(projectId,id){project(projectId);const value=decode(sql.prepare('SELECT * FROM ned_core_attempts WHERE project_id=? AND id=?').get(projectId,id));if(!value)fail('not_found',404);value.bindings=sql.prepare('SELECT * FROM ned_core_bindings WHERE project_id=? AND attempt_id=? ORDER BY role,worker_index').all(projectId,id).map(decode);return value;}
  function updateAttempt(projectId,id,patch,eventType='attempt.updated') {
    return transaction(()=>{
      const before=getAttempt(projectId,id);
      const allowed=['state','gatewayIdentity','sessionId','runId','admissionSentAt','admissionDeadline','stopRequested','errorCode','resultText','resultComplete','resultTruncated','mappingComplete','evidence','request','requestHash'];
      for(const key of Object.keys(patch))if(!allowed.includes(key))fail('invalid_patch',400);
      const entries=Object.entries({...patch,updatedAt:now()});
      sql.prepare(`UPDATE ned_core_attempts SET ${entries.map(([key])=>`${snake(key)}${['evidence','request'].includes(key)?'_json':''}=?`).join(',')} WHERE project_id=? AND id=?`).run(...entries.map(([key,value])=>['evidence','request'].includes(key)?JSON.stringify(value):typeof value==='boolean'?Number(value):value),projectId,id);
      if(patch.state){
        const operationState={queued:'pending',preparing:'preparing',dispatching:'sent',running:'admitted',stopping:'admitted',awaiting_verification:'finished',succeeded:'settled',failed:'settled',cancelled:'settled',unknown:'uncertain'}[patch.state];
        if(!operationState)fail('invalid_state',400);
        sql.prepare("UPDATE ned_core_outbox SET state=?,owner_generation=(SELECT generation FROM ned_core_owner WHERE name='execution'),attempt_count=CASE WHEN ? AND ? IS NULL THEN 1 ELSE attempt_count END WHERE attempt_id=? AND kind='dispatch'").run(operationState,Number(Boolean(patch.admissionSentAt)),before.admissionSentAt,id);
      }
      if(Object.keys(patch).some(key=>JSON.stringify(before[key])!==JSON.stringify(patch[key])))event(projectId,'attempt',id,eventType,patch);
      return getAttempt(projectId,id);
    });
  }
  function bind(projectId,attemptId,binding){return transaction(()=>{getAttempt(projectId,attemptId);const value={id:randomUUID(),attemptId,projectId,...binding};if(binding.parentSessionId&&!sql.prepare('SELECT 1 FROM ned_core_bindings WHERE project_id=? AND attempt_id=? AND gateway_identity=? AND profile_identity=? AND session_id=?').get(projectId,attemptId,binding.gatewayIdentity,binding.profileIdentity,binding.parentSessionId))fail('binding_conflict',409);try{sql.prepare('INSERT INTO ned_core_bindings(id,attempt_id,project_id,gateway_identity,profile_identity,session_id,role,worker_index,delegation_id,parent_session_id,expected_title,naming_state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(value.id,attemptId,projectId,binding.gatewayIdentity,binding.profileIdentity,binding.sessionId,binding.role,binding.workerIndex,binding.delegationId||null,binding.parentSessionId||null,binding.expectedTitle,binding.namingState||'pending');}catch{const existing=decode(sql.prepare('SELECT * FROM ned_core_bindings WHERE attempt_id=? AND role=? AND worker_index=?').get(attemptId,binding.role,binding.workerIndex));if(existing&&existing.sessionId===binding.sessionId&&existing.gatewayIdentity===binding.gatewayIdentity&&existing.profileIdentity===binding.profileIdentity)return existing;fail('binding_conflict',409);}event(projectId,'attempt',attemptId,'binding.created',{sessionId:binding.sessionId,role:binding.role,workerIndex:binding.workerIndex});return value;});}
  function createTick(key){return transaction(()=>{if(typeof key!=='string'||!key.length||key.length>128)fail('invalid_idempotency_key',400);const old=sql.prepare('SELECT * FROM ned_core_tick_requests WHERE idempotency_scope=?').get(key);if(old)return decode(old);const id=randomUUID();sql.prepare("INSERT INTO ned_core_tick_requests(id,idempotency_scope,state,created_at) VALUES(?,?,'pending',?)").run(id,key,now());return getTick(id);});}
  function getTick(id){const row=decode(sql.prepare('SELECT * FROM ned_core_tick_requests WHERE id=?').get(id));if(!row)fail('not_found',404);return row;}
  const store={db,sql,now,transaction,project,event,capacity,requireCapacity,getAttempt,updateAttempt,bind,
    listAttempts({states,projectId,limit=100}={}){const clauses=[],args=[];if(projectId){project(projectId);clauses.push('project_id=?');args.push(projectId);}if(states?.length){clauses.push(`state IN (${states.map(()=>'?').join(',')})`);args.push(...states);}return sql.prepare(`SELECT * FROM ned_core_attempts ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY created_at,id LIMIT ?`).all(...args,limit).map(decode);},
    markAdmission(projectId,id,{request,admissionDeadline,gatewayIdentity}){return transaction(()=>{const row=getAttempt(projectId,id);if(row.admissionSentAt)return false;updateAttempt(projectId,id,{request,requestHash:hash(request),admissionSentAt:now(),admissionDeadline,gatewayIdentity,state:'dispatching'},'admission.marked');return true;});},
    updateBinding(id,{namingState}){if(!['pending','confirmed','failed'].includes(namingState))fail('invalid_patch',400);sql.prepare('UPDATE ned_core_bindings SET naming_state=? WHERE id=?').run(namingState,id);return decode(sql.prepare('SELECT * FROM ned_core_bindings WHERE id=?').get(id));},
    appendResult(projectId,id,text){return transaction(()=>{const row=getAttempt(projectId,id);const bytes=Buffer.from(row.resultText+text);let end=Math.min(bytes.length,1048576);while(end>0&&(bytes[end]&0xc0)===0x80)end--;sql.prepare('UPDATE ned_core_attempts SET result_text=?,result_truncated=?,updated_at=? WHERE project_id=? AND id=?').run(bytes.subarray(0,end).toString('utf8'),Number(row.resultTruncated||bytes.length>1048576),now(),projectId,id);return getAttempt(projectId,id);});},
    createTick,getTick,pendingTicks(){return sql.prepare("SELECT * FROM ned_core_tick_requests WHERE state='pending' ORDER BY created_at,id LIMIT 100").all().map(decode);},
    updateTick(id,patch){const allowed=['state','counts','finishedAt','ownerGeneration'];for(const key of Object.keys(patch))if(!allowed.includes(key))fail('invalid_patch',400);const entries=Object.entries(patch);sql.prepare(`UPDATE ned_core_tick_requests SET ${entries.map(([key])=>`${snake(key)}${key==='counts'?'_json':''}=?`).join(',')} WHERE id=?`).run(...entries.map(([key,value])=>key==='counts'?JSON.stringify(value):value),id);return getTick(id);},
    close(){if(!database)db.close();}
  };
  return store;
}
