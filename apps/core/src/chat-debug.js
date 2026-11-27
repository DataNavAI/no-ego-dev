import {existsSync} from 'node:fs';
import {openNedDatabase,openNedDatabaseReadOnly} from '../../../src/database.js';

const namespace='communicator-chat';
export const defaultChatId='nedcom-main';
export const validChatId=id=>typeof id==='string'&&/^(?:nedcom-main|nedcom-main-[a-f0-9-]{36})$/.test(id);

export function chatSelection(databasePath,identity,change){
  if(!databasePath||databasePath===':memory:'){if(change)throw new Error('Chat storage unavailable');return defaultChatId;}
  if(!change){
    if(!existsSync(databasePath))return defaultChatId;
    const db=openNedDatabaseReadOnly({databasePath});
    try{
      const row=db.prepare('SELECT value FROM ned_feature_data WHERE namespace=? AND key=?').get(namespace,identity);
      const id=row?JSON.parse(row.value):defaultChatId;
      if(!validChatId(id))throw new Error('Invalid chat selection');
      return id;
    }finally{db.close();}
  }
  const db=openNedDatabase({databaseUrl:databasePath});
  try{
    const read=()=>{
      const id=db.getFeatureValue(namespace,identity)??defaultChatId;
      if(!validChatId(id))throw new Error('Invalid chat selection');
      return id;
    };
    return db.write(()=>{
      if(read()!==change.expected)return false;
      db.setFeatureValue(namespace,identity,change.next);
      return true;
    });
  }finally{db.close();}
}

export function coreAgentActivity(databasePath){
  if(!databasePath||!existsSync(databasePath))return {agents:[],events:[]};
  const db=openNedDatabaseReadOnly({databasePath});
  try{
    const exists=table=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
    const agents=exists('ned_core_attempts')?db.prepare(`
      SELECT id,project_id AS projectId,task_id AS taskId,role,state,updated_at AS time
      FROM ned_core_attempts
      WHERE state IN ('dispatching','running','stopping','unknown')
      ORDER BY updated_at DESC,id
    `).all():[];
    const hasEvents=exists('ned_core_events');
    if(agents.length&&hasEvents&&exists('ned_core_bindings')){
      agents.push(...db.prepare(`
        SELECT b.id,a.project_id AS projectId,a.task_id AS taskId,'subagent' AS role,
          CASE WHEN a.state='unknown' THEN 'unknown' ELSE 'running' END AS state,
          e.created_at AS time
        FROM ned_core_attempts a
        JOIN ned_core_bindings b ON b.attempt_id=a.id AND b.role='child'
        JOIN ned_core_events e ON e.sequence=(
          SELECT c.sequence FROM ned_core_events c
          WHERE c.project_id=a.project_id AND c.entity_type='attempt' AND c.entity_id=a.id
            AND c.event_type IN ('subagent.start','subagent.complete')
            AND json_extract(c.payload_json,'$.sessionId')=b.session_id
          ORDER BY c.sequence DESC LIMIT 1
        )
        WHERE a.state IN ('running','stopping','unknown') AND e.event_type='subagent.start'
        ORDER BY e.sequence DESC
      `).all());
    }
    const events=hasEvents?db.prepare(`
      SELECT entity_id AS id, project_id AS projectId,event_type AS event,created_at AS time
      FROM ned_core_events
      WHERE entity_type='attempt'
        AND event_type IN ('admission.marked','attempt.preparing','attempt.running','attempt.stopping',
          'attempt.completed','attempt.failed','attempt.cancelled','attempt.succeeded','attempt.unknown',
          'attempt.waiting_for_approval','binding.created','subagent.start','subagent.complete')
      ORDER BY sequence DESC LIMIT 40
    `).all():[];
    return {agents,events};
  }finally{db.close();}
}
