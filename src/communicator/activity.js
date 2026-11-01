import {readWorkspace} from './work.js';
import {createProjectReader} from './projects.js';
import {openNedDatabaseReadOnly,resolveDatabasePath} from '../database.js';
const statuses=new Set(['planned','ready','working','blocked','done']);
export function readActivity(databasePath=resolveDatabasePath(),projectId){
  let database;
  try{
    database=openNedDatabaseReadOnly({databasePath});
    if(!database.prepare('SELECT id FROM ned_projects WHERE id=?').get(projectId))throw new Error('Unavailable');
    const updates=[];
    for(const types of [['goal','subgoal'],['task','issue']]){
      const row=database.prepare('SELECT e.item_id,e.sequence,e.created_at,CASE WHEN length(e.value)<=65536 THEN e.value END AS value FROM ned_task_events e JOIN ned_work_items w ON w.project_id=e.project_id AND w.id=e.item_id WHERE e.project_id=? AND w.type IN (?,?) ORDER BY e.sequence DESC LIMIT 1').get(projectId,...types);
      if(!row)continue;
      const value=JSON.parse(row.value);
      if(!value||value.projectId!==projectId||value.id!==row.item_id||!types.includes(value.type)||typeof value.title!=='string'||!value.title.trim()||value.title.length>1000||!statuses.has(value.status)||!Number.isFinite(Date.parse(row.created_at)))throw new Error('Unavailable');
      updates.push({kind:types[0],title:value.title,status:value.status,time:row.created_at,sequence:row.sequence});
    }
    return {projectId,updates};
  }finally{database?.close();}
}
export function createActivityStreams(databasePath){
  const connections=new Set();
  return {
    handle(req,res,projectId){
      res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-accel-buffering':'no'});
      let previous='';let closed=false;
      const close=()=>{if(closed)return;closed=true;clearInterval(timer);connections.delete(close);res.end();};
      const publish=()=>{
        let snapshot;
        try{snapshot=projectId===null?{...readWorkspace(databasePath),...createProjectReader({databasePath}).list()}:readActivity(databasePath,projectId);}catch{snapshot={projectId,error:'unavailable'};}
        const data=JSON.stringify(snapshot);
        if(data!==previous){previous=data;if(!res.write(`data: ${data}\n\n`))close();}
        else if(!res.write(': heartbeat\n\n'))close();
      };
      const timer=setInterval(publish,1000);timer.unref();connections.add(close);res.once('close',close);publish();
    },
    close(){for(const close of [...connections])close();},
  };
}
