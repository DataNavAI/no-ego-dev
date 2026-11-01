import {openNedDatabaseReadOnly,resolveDatabasePath} from '../database.js';
import {ProjectError} from './projects.js';
export function readWorkspace(databasePath=resolveDatabasePath()){
  const db=openNedDatabaseReadOnly({databasePath});
  try{
    const latest=db.prepare("SELECT e.project_id AS projectId,e.sequence FROM ned_task_events e JOIN ned_work_items w ON w.project_id=e.project_id AND w.id=e.item_id WHERE w.type IN ('task','issue') ORDER BY e.sequence DESC LIMIT 1").get()||null;
    const revision=db.prepare('SELECT COALESCE(MAX(sequence),0) AS revision FROM ned_task_events').get().revision;
    return {latestTask:latest,revision};
  }finally{db.close();}
}
export function readProjectWork(databasePath=resolveDatabasePath(),projectId){
  let db;
  try{
    db=openNedDatabaseReadOnly({databasePath});
    if(!db.prepare('SELECT id FROM ned_projects WHERE id=?').get(projectId))throw new ProjectError('project_unavailable',404,'Project is unavailable.');
    const rows=db.prepare(`SELECT w.id,w.parent_id AS parentId,w.type,w.title,w.state,w.blocker,w.priority,w.created_at AS createdAt,
      EXISTS(SELECT 1 FROM ned_dependencies d JOIN ned_work_items p ON p.project_id=d.project_id AND p.id=d.depends_on_id WHERE d.project_id=w.project_id AND d.item_id=w.id AND p.state<>'done') AS dependencyBlocked
      FROM ned_work_items w WHERE w.project_id=? ORDER BY w.created_at,w.id LIMIT 5001`).all(projectId);
    if(rows.length>5000)throw new Error('Too many items');
    const items=rows.map(row=>({id:row.id,parentId:row.parentId,type:row.type,title:row.title,priority:row.priority,createdAt:row.createdAt,dependsOn:db.prepare('SELECT depends_on_id AS id FROM ned_dependencies WHERE project_id=? AND item_id=? ORDER BY depends_on_id').all(projectId,row.id).map(dependency=>dependency.id),status:row.state==='done'?'done':row.blocker||row.dependencyBlocked?'blocked':row.state==='working'?'working':row.type==='goal'||row.type==='subgoal'?'planned':'ready'}));
    const byId=new Map(items.map(item=>[item.id,item]));
    for(const item of items){
      const seen=new Set([item.id]);let parent=item.parentId;
      while(parent!==null){if(seen.has(parent)||!byId.has(parent))throw new Error('Invalid hierarchy');seen.add(parent);parent=byId.get(parent).parentId;}
    }
    return {projectId,items};
  }catch(error){if(error instanceof ProjectError)throw error;throw new ProjectError('work_unavailable',503,'Goals could not be loaded.');}
  finally{db?.close();}
}
