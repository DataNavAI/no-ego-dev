import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fixture,A,B,C} from './fixtures.js';
import {createStagingController,mainChecks} from '../../../../src/staging/controller.js';

test('TC-002: exact-main update preserves user files and refreshes native owned payload',async t=>{
 const f=await fixture(t);assert.equal((await f.controller.setup()).sha,A);
 for(const name of ['.env','auth.json','session.txt','memory.txt'])await fs.writeFile(path.join(f.profile,name),'synthetic '+name);
 const config=JSON.parse(await fs.readFile(path.join(f.profile,'config.yaml')));config.user_override='retain';await fs.writeFile(path.join(f.profile,'config.yaml'),JSON.stringify(config));
 assert.equal((await f.controller.update()).result,'unchanged');f.setMain(B);assert.equal((await f.controller.update()).sha,B);
 assert.equal((await fs.readFile(path.join(f.profile,'SOUL.md'),'utf8')),'soul '+B);
 for(const name of ['.env','auth.json','session.txt','memory.txt'])assert.equal(await fs.readFile(path.join(f.profile,name),'utf8'),'synthetic '+name);
 assert.equal(JSON.parse(await fs.readFile(path.join(f.profile,'config.yaml'))).user_override,'retain');assert.equal(f.task(),'Stage task');
 let prepared=0;const noChange=createStagingController(f.options,{...f.dependencies,prepare:async()=>{prepared++;}});await noChange.update();assert.equal(prepared,0);
});
test('TC-002: missing failed pending stale and ambiguous CI hold prior immutable release',async t=>{
 const f=await fixture(t);await f.controller.setup();
 for(const jobs of [[],[{name:'test (20)',conclusion:'failure'}],[{name:'test (20)',conclusion:'success'},{name:'test (22)',conclusion:null}],[{name:'test (20)',conclusion:'success'},{name:'test (20)',conclusion:'success'},{name:'test (22)',conclusion:'success'}]]){
  const c=createStagingController(f.options,{...f.dependencies,main:async()=>({sha:B,event:'push',branch:'main',jobs})});await assert.rejects(c.update(),/CI/);assert.equal((await f.controller.status()).active.sha,A);assert.equal(f.task(),'Stage task');
 }
 const stale=createStagingController(f.options,{...f.dependencies,main:async()=>({sha:B,event:'pull_request',branch:'main',jobs:[{name:'test (20)',conclusion:'success'}]})});await assert.rejects(stale.update(),/CI/);
 f.setMain(B);const superseded=createStagingController(f.options,{...f.dependencies,prepare:async sha=>{await f.prepare(sha);f.setMain(C);}});assert.equal((await superseded.update()).result,'superseded');assert.equal((await f.controller.status()).active.sha,A);
});
test('TC-002: GitHub adapter binds workflow events and exact run identities',async()=>{
 const options={repository:'owner/repo',requiredWorkflows:['NED CLI'],requiredJobs:['test (20)']};
 const run=async(_cmd,args)=>{const endpoint=args[1];if(endpoint.endsWith('/branches/main'))return {stdout:JSON.stringify({commit:{sha:A}})};if(endpoint.includes('/jobs'))return {stdout:JSON.stringify({jobs:[{name:'test (20)',status:'completed',conclusion:'success'}]})};return {stdout:JSON.stringify({workflow_runs:[{id:1,name:'NED CLI',head_sha:A,head_branch:'main',event:'push',status:'completed',conclusion:'success'},{id:2,name:'NED CLI',head_sha:B,head_branch:'main',event:'push',status:'completed',conclusion:'success'}]})};};
 const main=await mainChecks(options,run);assert.equal(main.sha,A);assert.deepEqual(main.jobs,[{name:'test (20)',conclusion:'success'}]);
});
test('TC-002: generated staging context loads source revision and rejects edits without overwrite',async t=>{
 const f=await fixture(t);await f.controller.setup();const context=path.join(f.root,'projects/AGENTS.md');assert.equal(await fs.readFile(context,'utf8'),'agents '+A);await fs.writeFile(context,'owner edit to preserve');f.setMain(B);await assert.rejects(f.controller.update(),/context/);assert.equal(await fs.readFile(context,'utf8'),'owner edit to preserve');assert.equal(await fs.readFile(path.join(f.profile,'SOUL.md'),'utf8'),'soul '+A);
});
test('TC-002: STAGE-R1-007 failed check is persisted independently of verified active health',async t=>{
 const f=await fixture(t);await f.controller.setup();const c=createStagingController(f.options,{...f.dependencies,main:async()=>({sha:B,event:'push',branch:'main',jobs:[]})});await assert.rejects(c.update(),/CI/);const s=await f.controller.status();assert.equal(s.last_result,'check_failed');assert.equal(s.error,'ci_incomplete');assert.equal(s.active.sha,A);assert.equal(s.health,'ready');
});
test('TC-002: STAGE-R1-007 tampered status identities are unavailable and public parser errors omit private snippets',async t=>{
 const f=await fixture(t);await f.controller.setup();const original=await f.read('transaction.json');const bad=structuredClone(original);bad.target.sha=B;await fs.writeFile(path.join(f.root,'transaction.json'),JSON.stringify(bad));assert.equal((await f.controller.status()).health,'unavailable');await fs.writeFile(path.join(f.root,'transaction.json'),JSON.stringify(original));await fs.writeFile(path.join(f.root,'settings.json'),'SYNTHETIC_PRIVATE_MARKER');
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{fileURLToPath}=await import('node:url');const source=fileURLToPath(new URL('../../../../src/staging/controller.js',import.meta.url));let result;try{await promisify(execFile)(process.execPath,['--input-type=module','-e',`import {runInstalled} from ${JSON.stringify(source)};await runInstalled(process.argv[1],'control',[]);`,f.root]);}catch(error){result=error;}assert.equal(result.code,2);assert.equal(result.stderr.includes('SYNTHETIC'),false);assert.match(result.stderr,/Staging action refused/);
});
