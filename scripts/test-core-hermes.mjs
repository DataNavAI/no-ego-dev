import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const revision='6e07eb48387044dbcaf12490931c2b8ca7ec8653';
const checksum='63de899415219adac1ce83b40980bc9526e5c448277ebf7a02d240bccebdcb1e';
const cache=process.env.NED_HERMES_TEST_CACHE;
if(!cache||!path.isAbsolute(cache))throw new Error('Set NED_HERMES_TEST_CACHE to an absolute external dependency-cache directory. See HERMES-TESTING.md.');
if(process.platform==='win32')throw new Error('Hermes acceptance currently requires POSIX process-group teardown.');
await mkdir(cache,{recursive:true});
const temporary=await mkdtemp(path.join(tmpdir(),'ned-hermes-suite-'));
const source=path.join(temporary,'source');
let active,interrupted=false;
function signal(child,name){try{process.kill(-child.pid,name);}catch(error){if(error.code!=='ESRCH')throw error;}}
const stop=()=>{interrupted=true;if(active)signal(active,'SIGTERM');};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function command(binary,args,env=process.env,timeout=600000){
  if(interrupted)throw new Error('Hermes acceptance interrupted.');
  const child=spawn(binary,args,{cwd:root,env,stdio:'inherit',detached:true});active=child;
  let forced;
  const kill=setTimeout(()=>{signal(child,'SIGTERM');forced=setTimeout(()=>signal(child,'SIGKILL'),10000);},timeout);
  try{await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${binary} failed (${code??signal}).`)));});}
  finally{clearTimeout(kill);clearTimeout(forced);active=undefined;}
}
try{
  const archive=path.join(cache,`hermes-${revision}.tar.gz`);
  let bytes;try{bytes=await readFile(archive);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!bytes){const response=await fetch(`https://codeload.github.com/NousResearch/hermes-agent/tar.gz/${revision}`,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('Hermes source download failed.');bytes=Buffer.from(await response.arrayBuffer());}
  if(createHash('sha256').update(bytes).digest('hex')!==checksum)throw new Error('Hermes source checksum mismatch.');
  await writeFile(archive,bytes,{mode:0o600});
  await mkdir(source);await command('tar',['-xzf',archive,'-C',source,'--strip-components=1']);
  const environment=path.join(temporary,'venv');
  await command('uv',['sync','--project',source,'--locked','--no-dev','--extra','messaging','--python','3.11'],{
    ...process.env,UV_CACHE_DIR:path.join(cache,'uv'),UV_PYTHON_INSTALL_DIR:path.join(cache,'python'),UV_PROJECT_ENVIRONMENT:environment,
  });
  console.log(`Hermes integration source: ${revision}; aimock: 1.48.0`);
  await command(process.execPath,['--test',path.join(root,'docs/features/core-orchestration/tests/hermes/live.test.js')],{
    ...process.env,NED_HERMES_TEST_SOURCE:source,NED_HERMES_TEST_PYTHON:path.join(environment,'bin/python'),NED_HERMES_TEST_REVISION:revision,
  },180000);
}finally{
  process.off('SIGINT',stop);process.off('SIGTERM',stop);
  await rm(temporary,{recursive:true,force:true});
}
