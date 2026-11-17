import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,stat,utimes,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {cachedArchive,runCommand} from '../../../../scripts/core-hermes-support.mjs';

test('TC-008: verified archive cache is immutable when warm and atomically shared when cold',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-hermes-cache-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const file=path.join(root,'archive'),bytes=Buffer.from('synthetic verified archive');
  const checksum=createHash('sha256').update(bytes).digest('hex');
  let release;const gate=new Promise(resolve=>{release=resolve;});let downloads=0;
  const download=async()=>{downloads++;if(downloads===2)release();await gate;return bytes;};
  const results=await Promise.all([cachedArchive(file,checksum,download),cachedArchive(file,checksum,download)]);
  assert.deepEqual(results,[bytes,bytes]);assert.deepEqual(await readFile(file),bytes);
  await utimes(file,12345,12345);
  const before=await stat(file);let fetched=false;
  await cachedArchive(file,checksum,async()=>{fetched=true;throw new Error('warm cache downloaded');});
  const after=await stat(file);assert.equal(fetched,false);assert.equal(after.ino,before.ino);assert.equal(after.mtimeMs,before.mtimeMs);
  assert.deepEqual(await readdir(root),['archive']);
  await writeFile(file,'corrupt');
  await assert.rejects(cachedArchive(file,checksum,async()=>bytes),/checksum mismatch/);
  assert.equal(await readFile(file,'utf8'),'corrupt');
});

test('TC-008: command timeout and interruption fail even when TERM cleanup exits zero',{timeout:15000},async t=>{
  const script="process.on('SIGTERM',()=>process.exit(0));process.stdout.write('READY');setInterval(()=>{},1000)";
  for(const kind of ['timeout','interrupted'])await t.test(kind,async()=>{
    const controller=new AbortController();let ready=false,child;
    const result=runCommand(process.execPath,['-e',script],{timeout:kind==='timeout'?2000:10000,grace:1000,signal:controller.signal,stdio:['ignore','pipe','pipe'],onSpawn:process=>{
      child=process;process.stdout.once('data',()=>{ready=true;if(kind==='interrupted')controller.abort();});
    }});
    await assert.rejects(result,new RegExp(kind));assert.equal(ready,true,'child must install its zero-exit TERM handler before the failure');
    assert.equal(child.exitCode,0);assert.equal(child.signalCode,null);
  });
  await runCommand(process.execPath,['-e','process.exit(0)']);
  await assert.rejects(runCommand(process.execPath,['-e','process.exit(7)']),/failed \(7\)/);
});
