import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {apiFixture,appFixture,status} from './helpers.js';
const execute=promisify(execFile),root=fileURLToPath(new URL('../../../../',import.meta.url));
async function cli(f,args,overrides={}){
  try{const out=await execute(process.execPath,['bin/ned.js','preview',...args,'--database',f.databasePath,'--json'],{cwd:root,env:{...process.env,...f.env,...overrides},timeout:20000});return {code:0,...out};}
  catch(error){return {code:error.code,stdout:error.stdout,stderr:error.stderr};}
}

test('TC-003: CLI uses configured NED API and ephemeral listeners for the same persistent singleton',{timeout:30000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true}),app=await appFixture(context);
  const first=await cli(f,['register','--project',f.project,'--port',String(app.port),'--name','Shop','--api',f.app.url]);assert.equal(first.code,0,first.stderr);const state=JSON.parse(first.stdout);assert.equal(state.preview.name,'Shop');assert.deepEqual(await status(f),state);
  const ephemeral=await cli(f,['status']);assert.equal(ephemeral.code,0,ephemeral.stderr);assert.deepEqual(JSON.parse(ephemeral.stdout),state);
  const retry=await cli(f,['register','--project',f.project,'--port',String(app.port),'--name','Shop']);assert.equal(retry.code,0,retry.stderr);assert.equal(JSON.parse(retry.stdout).revision,1);
  const cleared=await cli(f,['clear','--expected-revision','1']);assert.equal(cleared.code,0,cleared.stderr);assert.equal(JSON.parse(cleared.stdout).preview,null);assert.equal((await status(f)).revision,2);
});

test('TC-003: invalid flags, wrong API context and configured failures do not create a fallback registration',{timeout:30000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true}),app=await appFixture(context);
  const command=['register','--project',f.project,'--port',String(app.port)];
  for(const flags of [['--port','5000'],['--no-such-option'],['--expected-revision','NaN'],['--api','https://example.test'],['--api',f.app.url+'/bad']]){const result=await cli(f,[...command,...flags]);assert.equal(result.code,2);assert.equal((await status(f)).preview,null);}
  const foreign=path.join(f.root,'wrong-home');await mkdir(foreign,{mode:0o700});
  const wrong=await cli(f,[...command,'--api',f.app.url],{NED_AGENT_HOME:foreign});assert.equal(wrong.code,2);assert.match(wrong.stderr,/unauthorized/);
  // Same credential, different DB still must fail the context handshake before a mutation.
  const mismatch=await execute(process.execPath,['bin/ned.js','preview',...command,'--api',f.app.url,'--database',path.join(f.root,'other.sqlite'),'--json'],{cwd:root,env:{...process.env,...f.env},timeout:20000}).catch(error=>error);assert.equal(mismatch.code,2);assert.match(mismatch.stderr,/core_context_mismatch/);
  const offline=await appFixture(context);await new Promise(resolve=>offline.server.close(resolve));const absent=await cli(f,[...command,'--api',`http://127.0.0.1:${offline.port}`]);assert.equal(absent.code,2);assert.match(absent.stderr,/core_unavailable/);assert.equal((await status(f)).preview,null);
});
