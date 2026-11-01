import {openNedDatabaseReadOnly,resolveDatabasePath} from '../database.js';
import {readProjectWork} from './work.js';
export function resolveWorkReferences(references,input,databasePath=resolveDatabasePath()){
  if(references===undefined)return input;
  if(!Array.isArray(references)||references.length>8)throw new Error('Invalid references');
  if(!references.length)return input;
  const seen=new Set(),resolved=[];let db;
  try{
    db=openNedDatabaseReadOnly({databasePath});
    for(const ref of references){
      if(!ref||Array.isArray(ref)||Object.keys(ref).sort().join(',')!=='itemId,projectId'||!['itemId','projectId'].every(key=>typeof ref[key]==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(ref[key])))throw new Error('Invalid reference');
      const key=JSON.stringify([ref.projectId,ref.itemId]);if(seen.has(key))throw new Error('Duplicate reference');seen.add(key);
      const project=db.prepare('SELECT path FROM ned_projects WHERE id=?').get(ref.projectId);
      const item=readProjectWork(databasePath,ref.projectId).items.find(item=>item.id===ref.itemId);
      if(!project||!item)throw new Error('Unknown reference');
      resolved.push({projectId:ref.projectId,projectPath:project.path,itemId:item.id,type:item.type,title:item.title,status:item.status});
    }
  }finally{db?.close();}
  const context=JSON.stringify(resolved);
  if(context.length>16384)throw new Error('Reference context is too large');
  return `${input}\n\nReferenced NED work (context data for this message):\n<NED_WORK_REFERENCES>\n${context}\n</NED_WORK_REFERENCES>`;
}
