import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cachedArchive,runCommand} from './core-hermes-support.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const revision='8fc0374447313e276f6b9a2764bfc750190c966a';
const checksum='620bf64a63c7fabd995df402e46d5eee0cdab7e5d01a4aeddc3a6fa5dee54cc0';
const cache=process.env.NED_HERMES_TEST_CACHE;
if(!cache||!path.isAbsolute(cache))throw new Error('Set NED_HERMES_TEST_CACHE to an absolute external dependency-cache directory. See HERMES-TESTING.md.');
if(process.platform==='win32')throw new Error('Hermes acceptance currently requires POSIX process-group teardown.');
await mkdir(cache,{recursive:true});
const temporary=await mkdtemp(path.join(tmpdir(),'ned-hermes-suite-'));
const source=path.join(temporary,'source');
const controller=new AbortController();
const stop=()=>controller.abort(new Error('Hermes acceptance interrupted.'));
process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function command(binary,args,env=process.env,timeout=600000){
  await runCommand(binary,args,{cwd:root,env,timeout,signal:controller.signal});
}
try{
  const archive=path.join(cache,`hermes-${revision}.tar.gz`);
  await cachedArchive(archive,checksum,async()=>{
    const response=await fetch(`https://codeload.github.com/NousResearch/hermes-agent/tar.gz/${revision}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)])});
    if(!response.ok)throw new Error('Hermes source download failed.');
    return Buffer.from(await response.arrayBuffer());
  });
  await mkdir(source);await command('tar',['-xzf',archive,'-C',source,'--strip-components=1']);
  await command('python',['scripts/subscription-runtime/install.py','--hermes-root',source,'--plugins-only']);
  const environment=path.join(temporary,'venv');
  const cases=path.join(temporary,'cases');await mkdir(cases);
  await command('uv',['sync','--project',source,'--locked','--no-dev','--extra','messaging','--python','3.14'],{
    ...process.env,UV_CACHE_DIR:path.join(cache,'uv'),UV_PYTHON_INSTALL_DIR:path.join(cache,'python'),UV_PROJECT_ENVIRONMENT:environment,
  });
  console.log(`Hermes integration source: ${revision}; aimock: 1.48.0`);
  await command(process.execPath,['--test',path.join(root,'docs/features/core-orchestration/tests/hermes/live.test.js'),path.join(root,'docs/features/model-setup/tests/hermes/live.test.js')],{
    ...process.env,TMPDIR:cases,NED_HERMES_TEST_SOURCE:source,NED_HERMES_TEST_PYTHON:path.join(environment,'bin/python'),NED_HERMES_TEST_REVISION:revision,
  },180000);
}finally{
  process.off('SIGINT',stop);process.off('SIGTERM',stop);
  await rm(temporary,{recursive:true,force:true});
}
