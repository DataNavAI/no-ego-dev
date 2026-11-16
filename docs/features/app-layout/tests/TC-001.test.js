import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const execute=promisify(execFile);
const root=fileURLToPath(new URL('../../../../',import.meta.url));

test('TC-001: app-only runtime changes select both native container acceptance architectures',async()=>{
  const workflow=parse(await readFile(path.join(root,'.github/workflows/container-image.yml'),'utf8'));
  const paths=workflow.on.pull_request.paths;
  for(const changedFile of ['apps/ned-core/src/service.js','apps/ned-cli/src/cli.js','apps/ned-com/src/server.js']){
    assert.ok(paths.includes('apps/**'),`${changedFile} must select native container acceptance`);
  }
  assert.equal(paths.some(pattern=>pattern.startsWith('!')),false,'app inclusion must not be negated');
  assert.equal(Object.hasOwn(workflow.on.pull_request,'paths-ignore'),false);
  const job=workflow.jobs.image;
  assert.deepEqual(job.strategy.matrix.include.map(entry=>entry.architecture).sort(),['amd64','arm64']);
  assert.equal(job['runs-on'],'${{ matrix.runner }}');
  const acceptance=job.steps.find(step=>step.run?.includes('docs/features/standalone-container/tests/container_acceptance.py'));
  assert.ok(acceptance,'selected job must execute native container acceptance');
  assert.equal(acceptance.env.EXPECTED_ARCHITECTURE,'${{ matrix.architecture }}');
});

test('TC-001: app-owned entrypoints and packaged assets work outside the checkout CWD',async t=>{
  const home=await mkdtemp(path.join(tmpdir(),'ned-app-layout-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const env={...process.env,NED_AGENT_HOME:home,NED_DATABASE_URL:path.join(home,'ned.sqlite')};
  for(const [name,entry] of [['ned-core','index.js'],['ned-cli','cli.js'],['ned-com','server.js']]){
    const metadata=JSON.parse(await readFile(path.join(root,'apps',name,'package.json'),'utf8'));
    assert.equal(metadata.name,`@ned/${name.slice(4)}`);
    assert.equal(metadata.private,true);
    assert.equal(metadata.type,'module');
    await import(new URL(`../../../../apps/${name}/src/${entry}`,import.meta.url));
  }
  for(const args of [['--help'],['core','serve','--help']]){
    const result=await execute(process.execPath,[path.join(root,'bin/ned.js'),...args],{cwd:home,env,timeout:15000});
    assert.match(result.stdout,/Usage:/);
    assert.equal(result.stderr,'');
  }
  const appModule=await import('../../../../apps/ned-com/src/server.js');
  const legacy=await import('../../../../src/communicator/server.js');
  assert.equal(legacy.createCommunicatorServer,appModule.createCommunicatorServer);
  const serverSource=`
    import {createCommunicatorServer} from ${JSON.stringify(new URL('../../../../apps/ned-com/src/server.js',import.meta.url).href)};
    const app=createCommunicatorServer({home:process.env.NED_AGENT_HOME,env:process.env,initializeDatabase:true});
    const results=[];
    try {
      await app.listen();
      for(const resource of ['/','/app.js','/styles.css','/vendor/webawesome.js','/missing-module.js']){
        const response=await fetch(app.url+resource);
        results.push({resource,status:response.status,type:response.headers.get('content-type'),size:(await response.text()).length});
      }
      console.log(JSON.stringify(results));
    } finally {await app.close();}
  `;
  const served=await execute(process.execPath,['--input-type=module','--eval',serverSource],{cwd:home,env,timeout:15000});
  const responses=new Map(JSON.parse(served.stdout).map(response=>[response.resource,response]));
  for(const [resource,type] of [['/','text/html'],['/app.js','text/javascript'],['/styles.css','text/css'],['/vendor/webawesome.js','text/javascript']]){
    const response=responses.get(resource);
    assert.equal(response.status,200,resource);
    assert.ok(response.type.startsWith(type),resource);
    assert.ok(response.size>0,resource);
  }
  const missing=responses.get('/missing-module.js');
  assert.equal(missing.status,404);
  assert.ok(missing.type.startsWith('application/json'));
  const packed=await execute(process.platform==='win32'?'npm.cmd':'npm',['pack','--dry-run','--json','--ignore-scripts'],{cwd:root,env,timeout:30000,maxBuffer:8*1024*1024});
  const files=new Set(JSON.parse(packed.stdout)[0].files.map(file=>file.path));
  for(const file of ['apps/ned-core/src/index.js','apps/ned-cli/src/cli.js','apps/ned-com/src/server.js','apps/ned-com/src/attachment-worker.js','apps/ned-com/src/public/app.js','apps/ned-com/src/public/vendor/webawesome.js','src/communicator/server.js'])assert.ok(files.has(file),file);
  assert.equal([...files].some(file=>/\.(sqlite|db)(-|$)|\/tests\//.test(file)),false);
});
