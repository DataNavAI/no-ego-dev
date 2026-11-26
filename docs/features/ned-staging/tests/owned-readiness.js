import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {setImmediate} from 'node:timers/promises';

export async function waitForRunningOwner(root,{deadline=Date.now()+10000,onPending=()=>{}}={}) {
 const directory=path.join(root,'processes');
 while(Date.now()<deadline){
  const files=await fs.readdir(directory),owners=files.filter(name=>name.endsWith('.json'));
  assert.equal(owners.length,1);
  const record=JSON.parse(await fs.readFile(path.join(directory,owners[0]),'utf8'));
  if(files.length===1&&record.state==='running'&&Number.isSafeInteger(record.child_pid)&&record.child_pid>0&&typeof record.child_start==='string'&&record.child_start.length>0)return record;
  await onPending(record);
  await setImmediate();
 }
 throw new Error('Owned child did not commit its running record before readiness deadline');
}
