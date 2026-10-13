import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {constants} from 'node:fs';
import {open,lstat,realpath,stat} from 'node:fs/promises';
import {openNedDatabaseReadOnly,resolveDatabasePath} from '../database.js';
export class ProjectError extends Error {
  constructor(code,status,message) {super(message);this.code=code;this.status=status;}
}
const folderError = () => new ProjectError('project_folder_unavailable',404,'Project folder is unavailable.');
export function validatePreviewUrl(value) {
  if(typeof value !== 'string' || /[\s\\?#]/.test(value) || [...value].some(character=>character.charCodeAt(0)<32 || character.charCodeAt(0)===127)) return null;
  const match=/^http:\/\/127\.0\.0\.1:([0-9]+)(\/[^?#]*)?$/.exec(value);
  if(!match || Number(match[1])<1 || Number(match[1])>65535) return null;
  try {new URL(value);return value;} catch {return null;}
}
export function createProjectReader({databasePath=resolveDatabasePath(),home=os.homedir()} = {}) {
  const probes=new Set();let closed=false;
  function registry(id) {
    let db;
    try {
      db=openNedDatabaseReadOnly({databasePath});
      return id === undefined ? db.prepare('SELECT id,path FROM ned_projects ORDER BY path,id').all() : db.prepare('SELECT id,path FROM ned_projects WHERE id=?').get(id);
    } catch {throw new ProjectError('database_unavailable',503,'Project data could not be loaded.');}
    finally {db?.close();}
  }
  function metadata(row) {
    const relative=path.relative(home,row.path);
    return {id:row.id,name:path.basename(row.path),displayPath:relative === '' ? '~' : !relative.startsWith('..'+path.sep) && relative !== '..' && !path.isAbsolute(relative) ? '~/'+relative : row.path};
  }
  async function rootIdentity(root) {
    try {if(await realpath(root) !== root)throw new Error();const info=await stat(root);if(!info.isDirectory())throw new Error();return info;}
    catch {throw folderError();}
  }
  const sameFile=(a,b)=>a.dev===b.dev && a.ino===b.ino;
  async function config(root,identity) {
    const filename=path.join(root,'.nedcom.json');let handle;
    try {
      const before=await lstat(filename);
      if(!before.isFile() || before.isSymbolicLink() || before.size>4096) return {status:'invalid'};
      if(await realpath(filename)!==filename) return {status:'invalid'};
      // NONBLOCK prevents a raced FIFO replacement from hanging the server.
      handle=await open(filename,constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const opened=await handle.stat();if(!opened.isFile() || !sameFile(before,opened) || opened.size>4096)return {status:'invalid'};
      const buffer=Buffer.alloc(4097);let length=0;
      while(length<buffer.length){const read=await handle.read(buffer,length,buffer.length-length,length);if(!read.bytesRead)break;length+=read.bytesRead;}
      const after=await handle.stat();
      if(length>4096)return {status:'invalid'};
      if(!sameFile(after,await lstat(filename)) || after.size!==opened.size || after.mtimeMs!==opened.mtimeMs || !sameFile(identity,await rootIdentity(root)))return {status:'unavailable'};
      const data=JSON.parse(buffer.subarray(0,length).toString('utf8'));
      if(!data || Array.isArray(data) || typeof data!=='object' || Object.keys(data).sort().join(',')!=='previewUrl,version' || data.version!==1)return {status:'invalid'};
      const url=validatePreviewUrl(data.previewUrl);return url ? {url} : {status:'invalid'};
    } catch(error) {
      if(error instanceof SyntaxError || error.code==='ELOOP')return {status:'invalid'};
      if(error.code==='ENOENT' && !handle)return {status:'unconfigured'};
      return {status:'unavailable'};
    } finally {await handle?.close();}
  }
  function probe(url,signal) {
    if(closed || signal?.aborted)return Promise.resolve({status:'stopped'});
    return new Promise(resolve=>{
      let timer;let request;let finished=false;
      const finish=available=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);probes.delete(abort);request?.destroy();resolve(available ? {status:'available',url} : {status:'stopped'});};
      const abort=()=>finish(false);probes.add(abort);signal?.addEventListener('abort',abort,{once:true});
      request=http.request(url,{method:'HEAD',agent:false},response=>{const available=response.statusCode>=200 && response.statusCode<300;response.destroy();finish(available);});
      request.on('error',abort);timer=setTimeout(abort,1000);request.end();
    });
  }
  return {
    list:()=>({projects:registry().map(metadata)}),
    async detail(id,signal) {
      if(typeof id!=='string' || !/^[A-Za-z0-9_-]{1,256}$/.test(id))throw new ProjectError('project_unavailable',404,'Project is unavailable.');
      const row=registry(id);if(!row)throw new ProjectError('project_unavailable',404,'Project is unavailable.');
      const identity=await rootIdentity(row.path);const configured=await config(row.path,identity);
      const preview=configured.url ? await probe(configured.url,signal) : configured;
      if(!sameFile(identity,await rootIdentity(row.path)))throw folderError();
      return {project:metadata(row),preview};
    },
    close(){closed=true;for(const abort of [...probes])abort();}
  };
}
