import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
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
