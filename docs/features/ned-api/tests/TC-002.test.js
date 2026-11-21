import test from 'node:test';
import assert from 'node:assert/strict';
import {stat,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {createTaskService} from '../../../../src/tasks.js';
import {createNedApiServer} from '../../../../apps/core/src/index.js';
import {createNedApiHandler} from '../../../../apps/core/src/api.js';
import path from 'node:path';
import {apiFixture} from './helpers.js';
import {createTaskApiClient} from '../../../../apps/cli/src/task-api.js';

for(const kind of ['core','com'])test(`TC-002: ${kind} serves one API with compatible aliases and shared mutation receipts`,async context=>{
  const fixture=await apiFixture(context,{kind});
  const identity=await fixture.request('/api/v1');assert.equal(identity.status,200);assert.equal((await identity.json()).name,'NED API');
  const health=await fixture.request('/api/v1/health');assert.deepEqual(await health.json(),{status:'ok',service:'ned-api',version:1});
  const oldHealth=await fixture.request('/api/health');assert.deepEqual(await oldHealth.json(),{status:'ok',service:'nedcom'});
  const catalog=await fixture.request('/api/v1/projects');assert.deepEqual((await catalog.json()).projects.map(row=>row.id),[fixture.projectId]);
  const legacy=await fixture.request('/api/projects');assert.equal(legacy.status,200);assert.deepEqual((await legacy.json()).projects.map(row=>row.id),[fixture.projectId]);
  if(kind==='com')await assert.rejects(stat(path.join(fixture.home,'.ned/core/operator-token')),{code:'ENOENT'});
  const denied=await fixture.request('/api/v1/operator/projects');assert.equal(denied.status,401);await denied.body.cancel();
  const registered=await fixture.request('/api/v1/operator/projects',{operator:true});assert.equal((await registered.json()).data[0].id,fixture.projectId);
  const route=`/projects/${fixture.projectId}/tasks`,headers={'idempotency-key':'same-command'};
  const canonical=await fixture.request('/api/v1/operator'+route,{method:'POST',operator:true,body:{title:'One shared task'},headers});assert.equal(canonical.status,200);const created=await canonical.json();
  const replay=await fixture.request('/api/core/v1'+route,{method:'POST',operator:true,body:{title:'One shared task'},headers});assert.equal(replay.status,200);assert.deepEqual(await replay.json(),created);
  const conflict=await fixture.request('/api/v1/operator'+route,{method:'POST',operator:true,body:{title:'Changed'},headers});assert.equal(conflict.status,409);await conflict.body.cancel();
  assert.equal((await fixture.task.getItems()).length,1);
  assert.equal((await fixture.task.getItem(created.data.id)).title,'One shared task');
  assert.equal((await fixture.task.getActivity(created.data.id)).filter(event=>event.type==='created').length,1);
  const work=await fixture.request(`/api/v1/projects/${fixture.projectId}/work`);assert.equal(work.status,200);await work.body.cancel();
});

test('TC-002: command-scoped backend enables only authenticated operator resources',async context=>{
  const fixture=await apiFixture(context,{kind:'core',backendOnly:true});
  for(const route of ['/api/v1','/api/v1/health','/api/v1/projects','/api/chat/sessions']){const response=await fixture.request(route);assert.equal(response.status,404,route);await response.body.cancel();}
  const response=await fixture.request('/api/v1/operator/context',{operator:true});assert.equal(response.status,200);const value=await response.json();assert.match(value.data.runtime,/^[a-f0-9]{64}$/);
});

test('TC-002: CLI NED_API_URL selection is authoritative with explicit and legacy compatibility',async context=>{
  const fixture=await apiFixture(context,{kind:'core'});
  const requests=[];fixture.app.server.prependListener('request',request=>requests.push(request.url));
  const options={project:fixture.project,home:fixture.home,databaseUrl:fixture.databasePath,actor:'agent:api-test'};
  const preferred=await createTaskApiClient({...options,env:{...fixture.env,NED_API_URL:fixture.app.url,NED_CORE_URL:'https://invalid.example'}});
  context.after(()=>preferred.close());assert.equal((await preferred.initialize()).projectId,fixture.projectId);
  const explicit=await createTaskApiClient({...options,api:fixture.app.url,env:{...fixture.env,NED_API_URL:'https://invalid.example'}});
  context.after(()=>explicit.close());assert.equal((await explicit.initialize()).projectId,fixture.projectId);
  await assert.rejects(createTaskApiClient({...options,env:{...fixture.env,NED_API_URL:'https://invalid.example',NED_CORE_URL:fixture.app.url}}),{code:'invalid_api'});
  assert.deepEqual(requests,['/api/v1/operator/context','/api/v1/operator/task-management','/api/v1/operator/context','/api/v1/operator/task-management']);
});

for(const selection of ['home','env','databaseUrl'])test(`TC-002: browser work and activity retain the selected ${selection} database without an explicit path`,async context=>{
  const root=await mkdtemp(path.join(tmpdir(),'ned-api-selection-'));
  const previousDatabase=process.env.NED_DATABASE_URL,foreignDatabase=path.join(root,'process-context.sqlite');
  process.env.NED_DATABASE_URL=foreignDatabase;
  context.after(()=>{if(previousDatabase===undefined)delete process.env.NED_DATABASE_URL;else process.env.NED_DATABASE_URL=previousDatabase;});
  let task,app,handler,server;
  context.after(async()=>{await app?.close();await handler?.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}task?.close();await rm(root,{recursive:true,force:true});});
  const home=path.join(root,'home'),project=path.join(root,'project');await mkdir(home,{mode:0o700});await mkdir(project);
  const databasePath=selection==='home'?path.join(home,'.ned','ned.sqlite'):path.join(root,'selected.sqlite');
  task=await createTaskService({project,databaseUrl:databasePath,actor:'agent:selection-test'});await task.initialize();
  let url;
  if(selection==='databaseUrl'){
    handler=createNedApiHandler({home,env:{},databaseUrl:databasePath,boundOrigin:()=>url});
    server=http.createServer((req,res)=>{void handler(req,res);});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
  }else{
    app=await createNedApiServer({home,env:selection==='env'?{NED_DATABASE_URL:databasePath}:{}});url=await app.listen();
    assert.equal(app.service.database.filename,databasePath);
  }
  const response=await fetch(`${url}/api/v1/projects/${task.project.id}/work`,{signal:AbortSignal.timeout(5000)});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{projectId:task.project.id,items:[]});
  const stream=await fetch(`${url}/api/v1/activity/events?project=${task.project.id}`,{signal:AbortSignal.timeout(5000)});
  const reader=stream.body.getReader();
  try{const frame=await reader.read();assert.equal(new TextDecoder().decode(frame.value),`data: ${JSON.stringify({projectId:task.project.id,updates:[]})}\n\n`);}
  finally{await reader.cancel();}
  await assert.rejects(stat(foreignDatabase),{code:'ENOENT'});
});
