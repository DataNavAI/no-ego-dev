import {mkdtempSync,mkdirSync,realpathSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openNedDatabase} from '../../../../src/database.js';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
export async function fixture(t,{gateway}={}) {
  const home = realpathSync(mkdtempSync(path.join(os.tmpdir(),'nedcom-projects-')));
  t.after(()=>rmSync(home,{recursive:true,force:true}));
  const roots = ['a','b'].map(name=>{const root=path.join(home,name,'shop');mkdirSync(root,{recursive:true});writeFileSync(path.join(root,'sentinel'),'keep');return root;});
  const databasePath=path.join(home,'ned.sqlite'); const writer=openNedDatabase({databaseUrl:databasePath});
  t.after(()=>writer.close());
  roots.forEach((root,index)=>writer.connection.prepare('INSERT INTO ned_projects VALUES(?,?,?)').run(`project-${index}`,root,'2026-10-12'));
  writer.connection.prepare("INSERT INTO ned_work_items(project_id,id,type,title,description,priority,state,created_by,created_at,updated_at) VALUES('project-0','task-sentinel','task','Private task','Keep private',2,'open','fixture','2026-10-12','2026-10-12')").run();
  writer.setFeatureValue('fixture','sentinel',{keep:true});
  const app=createCommunicatorServer({databasePath,home,gateway});await app.listen();t.after(()=>app.close());
  const get=async resource=>{const response=await fetch(app.url+resource);return {status:response.status,body:await response.json()};};
  return {home,roots,databasePath,writer,app,get};
}
