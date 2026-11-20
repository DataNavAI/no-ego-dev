import Database from 'better-sqlite3';
import {constants,openSync,closeSync,mkdirSync,lstatSync,fstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {resolveRuntimeHome,ensureRuntimeHome} from '../../../src/runtime-home.js';

function safe(info,directory=false) {
  if(info.isSymbolicLink()||!(directory?info.isDirectory():info.isFile())||process.getuid&&info.uid!==process.getuid()||process.platform!=='win32'&&(info.mode&0o077))throw new Error('Unsafe Core ownership storage.');
}

export function createExecutionOwner(options={}) {
  const home=resolveRuntimeHome(options);
  ensureRuntimeHome(home);
  const root=path.join(home,'.ned');
  mkdirSync(root,{recursive:true,mode:0o700});
  const rootInfo=lstatSync(root);
  if(rootInfo.isSymbolicLink()||!rootInfo.isDirectory()||process.getuid&&rootInfo.uid!==process.getuid()||rootInfo.mode&0o022)throw new Error('Unsafe Core ownership storage.');
  const directory=path.join(root,'core');
  mkdirSync(directory,{mode:0o700,recursive:true});safe(lstatSync(directory),true);
  const filename=path.join(realpathSync(directory),'execution-lock.sqlite');
  const descriptor=openSync(filename,constants.O_CREAT|constants.O_RDWR|constants.O_NOFOLLOW,0o600);
  let identity;
  try{identity=fstatSync(descriptor);safe(identity);if(identity.nlink!==1)throw new Error('Unsafe Core ownership storage.');}finally{closeSync(descriptor);}
  const instanceId=randomUUID();
  let connection,held=false,closed=false;
  function stable(){const info=lstatSync(filename);safe(info);if(info.dev!==identity.dev||info.ino!==identity.ino||info.nlink!==1)throw new Error('Core ownership storage changed.');}
  return {
    instanceId,
    get held(){return held;},
    acquire(){
      if(closed)throw new Error('Core owner is closed.');
      stable();if(held)return true;
      connection ??=new Database(filename,{timeout:0});
      try{
        connection.pragma('journal_mode = DELETE');connection.pragma('synchronous = FULL');
        connection.exec('BEGIN EXCLUSIVE');stable();held=true;return true;
      }catch(error){if(connection.inTransaction)connection.exec('ROLLBACK');if(error.code==='SQLITE_BUSY'||error.code==='SQLITE_LOCKED')return false;throw error;}
    },
    assert(){if(!held||closed)throw new Error('Core owner unavailable.');stable();},
    close(){if(closed)return;closed=true;if(connection?.inTransaction)connection.exec('ROLLBACK');connection?.close();held=false;},
  };
}
