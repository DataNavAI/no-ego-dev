import {openNedDatabaseReadOnly,resolveDatabasePath} from '../../../src/database.js';
import {ProjectError} from '../../../src/project-error.js';
import {readDelivery,trackedTime} from './delivery.js';
export function readWorkspace(databasePath=resolveDatabasePath()){
  const db=openNedDatabaseReadOnly({databasePath});
  try{
    const latest=db.prepare("SELECT e.project_id AS projectId,e.sequence FROM ned_task_events e JOIN ned_work_items w ON w.project_id=e.project_id AND w.id=e.item_id WHERE w.type IN ('task','issue') ORDER BY e.sequence DESC LIMIT 1").get()||null;
    const revision=db.prepare('SELECT COALESCE(MAX(sequence),0) AS revision FROM ned_task_events').get().revision;
    const hasCoreEvents=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ned_core_events'").get();
    const coreRevision=hasCoreEvents?db.prepare('SELECT COALESCE(MAX(sequence),0) AS revision FROM ned_core_events').get().revision:0;
    const focus=db.prepare("SELECT p.id AS projectId FROM ned_feature_data f JOIN ned_projects p ON p.id=f.value WHERE f.namespace='communicator' AND f.key='focused-project'").get();
    return {latestTask:latest,revision,coreRevision,...(focus?{focusedProjectId:focus.projectId}:{})};
  }finally{db.close();}
}
export function readProjectWork(databasePath=resolveDatabasePath(),projectId){
  let db;
  try{
    db=openNedDatabaseReadOnly({databasePath});
    if(!db.prepare('SELECT id FROM ned_projects WHERE id=?').get(projectId))throw new ProjectError('project_unavailable',404,'Project is unavailable.');
    const rows=db.prepare(`SELECT w.id,w.parent_id AS parentId,w.type,w.title,w.state,w.blocker,w.assignee,w.priority,w.created_at AS createdAt,
      EXISTS(SELECT 1 FROM ned_dependencies d JOIN ned_work_items p ON p.project_id=d.project_id AND p.id=d.depends_on_id WHERE d.project_id=w.project_id AND d.item_id=w.id AND p.state<>'done') AS dependencyBlocked
      FROM ned_work_items w WHERE w.project_id=? ORDER BY w.created_at,w.id LIMIT 5001`).all(projectId);
    if(rows.length>5000)throw new Error('Too many items');
    const items=rows.map(row=>({id:row.id,parentId:row.parentId,type:row.type,title:row.title,assignee:row.assignee,priority:row.priority,createdAt:row.createdAt,dependsOn:db.prepare('SELECT depends_on_id AS id FROM ned_dependencies WHERE project_id=? AND item_id=? ORDER BY depends_on_id').all(projectId,row.id).map(dependency=>dependency.id),status:row.state==='done'?'done':row.blocker||row.dependencyBlocked?'blocked':row.state==='working'?'working':row.type==='goal'||row.type==='subgoal'?'planned':'ready'}));
    const timestamp=Date.now();
    const timing=db.prepare('SELECT item_id,type,value,created_at FROM ned_task_events WHERE project_id=? ORDER BY sequence').all(projectId);
    const histories=new Map();for(const event of timing){const list=histories.get(event.item_id)||[];list.push(event);histories.set(event.item_id,list);}
    const hasCore=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ned_core_attempts'").get();
    const responses=new Set(hasCore?db.prepare("SELECT DISTINCT task_id FROM ned_core_attempts WHERE project_id=? AND length(result_text)>0").all(projectId).map(row=>row.task_id):[]);
    const revisions=new Map(hasCore?db.prepare("SELECT a.task_id,MAX(e.sequence) AS revision FROM ned_core_attempts a LEFT JOIN ned_core_events e ON e.project_id=a.project_id AND e.entity_id=a.id AND e.entity_type='attempt' WHERE a.project_id=? GROUP BY a.task_id").all(projectId).map(row=>[row.task_id,row.revision||0]):[]);
    const results=new Map(hasCore?db.prepare('SELECT task_id,SUM(length(CAST(result_text AS BLOB))) AS bytes FROM ned_core_attempts WHERE project_id=? GROUP BY task_id').all(projectId).map(row=>[row.task_id,row.bytes]):[]);
    const deliveryRevisions=new Map(hasCore?db.prepare("SELECT entity_id,MAX(sequence) AS revision FROM ned_core_events WHERE project_id=? AND entity_type='task' GROUP BY entity_id").all(projectId).map(row=>[row.entity_id,row.revision]):[]);
    const sessions=new Map();
    if(hasCore){
      const bound=db.prepare(`
        SELECT a.task_id AS taskId,a.id AS attemptId,b.session_id AS sessionId,b.role,
          CASE WHEN b.role='child' THEN e.created_at ELSE a.admission_sent_at END AS startedAt
        FROM ned_core_attempts a JOIN ned_core_bindings b ON b.attempt_id=a.id AND b.project_id=a.project_id
        LEFT JOIN ned_core_events e ON b.role='child' AND e.sequence=(
          SELECT child.sequence FROM ned_core_events child
          WHERE child.project_id=a.project_id AND child.entity_type='attempt' AND child.entity_id=a.id
            AND child.event_type IN ('subagent.start','subagent.complete')
            AND json_extract(child.payload_json,'$.sessionId')=b.session_id
          ORDER BY child.sequence DESC LIMIT 1
        )
        WHERE a.project_id=? AND a.state IN ('running','stopping')
          AND (b.role<>'child' OR e.event_type='subagent.start')
        ORDER BY b.role,b.worker_index
      `).all(projectId);
      for(const {taskId,...session} of bound){
        const list=sessions.get(taskId)||[];list.push(session);sessions.set(taskId,list);
      }
    }
    for(const item of items){
      if(item.status==='working')item.sessions=sessions.get(item.id)||[];
      const delivery=readDelivery(db,projectId,item.id);
      item.delivery={impact:delivery?.impact||'',remainingSeconds:delivery?.remainingSeconds??null,estimatedFinish:delivery?.estimatedFinish??null,updatedAt:delivery?.updatedAt??null,trackedSeconds:trackedTime(histories.get(item.id)||[],timestamp),outputs:(delivery?.outputs||[]).map(({id,kind,title})=>({id,kind,title}))};
      item.delivery.executionRevision=`${revisions.get(item.id)||0}:${results.get(item.id)||0}`;
      item.delivery.revision=deliveryRevisions.get(item.id)||0;
      if(!item.delivery.outputs.length&&responses.has(item.id))item.delivery.outputs.push({id:'attempt-result',kind:'document',title:'Latest recorded response'});
    }
    const byId=new Map(items.map(item=>[item.id,item]));
    for(const item of items){
      const seen=new Set([item.id]);let parent=item.parentId;
      while(parent!==null){if(seen.has(parent)||!byId.has(parent))throw new Error('Invalid hierarchy');seen.add(parent);parent=byId.get(parent).parentId;}
    }
    return {projectId,items};
  }catch(error){if(error instanceof ProjectError)throw error;throw new ProjectError('work_unavailable',503,'Goals could not be loaded.');}
  finally{db?.close();}
}
