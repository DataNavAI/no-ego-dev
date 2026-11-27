import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {apiFixture,appFixture,mutate} from '../../web-app-previews/tests/helpers.js';
import {createTaskService} from '../../../../src/tasks.js';

test('TC-001: dashboard publication is authenticated, project-scoped, persistent and independent of Preview',{timeout:30000},async t=>{
  const f=await apiFixture(t,{kind:'core',backendOnly:true}),app=await appFixture(t);
  const route='/api/v1/dashboards/'+f.projectId;
  const call=async(method='GET',body,extra={})=>{const r=await f.request(route,{method,body,headers:{origin:f.app.url,...extra.headers},...extra});return {status:r.status,body:await r.json()};};
  assert.equal((await call('GET',undefined,{authenticated:false})).status,401);
  assert.deepEqual((await call()).body,{revision:0,dashboard:null,delivery:{mode:'local-link',remoteAvailable:false}});
  for(const method of ['PUT','DELETE'])assert.equal((await f.request(route,{method,body:{expectedRevision:0},authenticated:false,headers:{origin:f.app.url}})).status,401);
  assert.equal((await f.request(route+'/access',{method:'POST',body:{mode:'frame'},authenticated:false,headers:{origin:f.app.url}})).status,401);
  for(const method of ['HEAD','PATCH'])assert.equal((await f.request(route,{method})).status,405);
  const input={port:app.port,name:'Product metrics',expectedRevision:0};
  const first=await call('PUT',input);assert.equal(first.status,200);assert.equal(first.body.dashboard.project.id,f.projectId);assert.equal(first.body.dashboard.status,'available');
  assert.equal((await call('PUT',input)).body.dashboard.id,first.body.dashboard.id);
  assert.equal((await f.request(route,{method:'PUT',body:{...input,name:'Denied'},headers:{origin:'https://foreign.invalid'}})).status,403);
  const invalid=body=>fetch(f.app.url+route,{method:'PUT',headers:{authorization:'Bearer '+f.credential(),origin:f.app.url,'content-type':'application/json'},body});
  assert.equal((await invalid('{')).status,400);assert.equal((await invalid(' '.repeat(4097))).status,413);
  assert.equal((await call('DELETE',{expectedRevision:1,extra:true})).status,400);
  assert.equal((await call()).body.dashboard.id,first.body.dashboard.id);
  const preview=await mutate(f,'PUT',{project:f.project,port:app.port,expectedRevision:0});assert.equal(preview.status,200);
  const projectB=path.join(f.root,'other-product');await mkdir(projectB);const b=await createTaskService({project:projectB,databaseUrl:f.databasePath,actor:'agent:dashboard-test'});t.after(()=>b.close());await b.initialize();
  const r=await f.request('/api/v1/dashboards/'+b.project.id,{method:'PUT',body:input,headers:{origin:f.app.url}});assert.equal(r.status,200);const second=await r.json();assert.notEqual(second.dashboard.id,first.body.dashboard.id);
  for(const body of [{...input,port:8642},{...input,port:app.port,url:'http://example.invalid/'},{...input,port:'4000'}])assert.equal((await call('PUT',body)).status,400);
  assert.equal((await call('PUT',{...input,name:'Changed'})).status,409);
  assert.equal((await call('DELETE',{expectedRevision:0})).status,409);
  assert.equal((await call('DELETE',{expectedRevision:1})).body.dashboard,null);
  assert.equal((await call('DELETE',{expectedRevision:1})).status,200);
  assert.equal((await(await f.request('/api/v1/dashboards/'+b.project.id)).json()).dashboard.id,second.dashboard.id);
  assert.equal((await(await f.request('/api/v1/preview')).json()).preview.id,preview.body.preview.id);
  assert.equal((await f.request(route+'?ignored=1')).status,400);
  assert.equal((await f.request('/api/v1/dashboards/missing-project')).status,404);
  const projectC=path.join(f.root,'concurrent-product');await mkdir(projectC);const c=await createTaskService({project:projectC,databaseUrl:f.databasePath,actor:'agent:dashboard-race'});t.after(()=>c.close());await c.initialize();
  const race=await Promise.all(['First','Second'].map(name=>f.request('/api/v1/dashboards/'+c.project.id,{method:'PUT',headers:{origin:f.app.url},body:{port:app.port,name,expectedRevision:0}})));
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.deepEqual(await f.task.getItems(),[]);
});

test('TC-001: dashboard state survives listener recreation, stays home-private, and enforces the32-app bound atomically',{timeout:30000},async t=>{
  const {createCoreServer}=await import('../../../../apps/core/src/index.js');
  const {loadOperatorCredential,loadApiInstanceId}=await import('../../../../apps/core/src/auth.js');
  const {openNedDatabase}=await import('../../../../src/database.js');
  const {randomUUID}=await import('node:crypto');
  const f=await apiFixture(t,{kind:'core',backendOnly:true}),app=await appFixture(t),route='/api/v1/dashboards/'+f.projectId;
  const first=await f.request(route,{method:'PUT',headers:{origin:f.app.url},body:{port:app.port,expectedRevision:0}});assert.equal(first.status,200);const initial=await first.json();
  for(const foreign of [false,true]){
    const home=foreign?path.join(f.root,'foreign-home'):f.home;if(foreign)await mkdir(home,{mode:0o700});
    const env={NED_AGENT_HOME:home,HERMES_HOME:home},listener=await createCoreServer({home,env,databasePath:f.databasePath,backendOnly:true});t.after(()=>listener.close());await listener.listen();
    const response=await fetch(listener.url+route,{headers:{authorization:'Bearer '+loadOperatorCredential({home,env})}});assert.equal(response.status,200);const state=await response.json();
    assert.equal(state.dashboard?.id??null,foreign?null:initial.dashboard.id);
  }
  // Seed valid synthetic persisted registrations to exercise the capacity boundary
  // without starting32 unrelated processes. All mutations under test use HTTP.
  const db=openNedDatabase({databaseUrl:f.databasePath});t.after(()=>db.close());
  const prefix='dashboard:v1:'+loadApiInstanceId({home:f.home,env:f.env})+':';
  const existing=db.getFeatureValue(prefix+f.projectId,'active');
  for(let i=0;i<31;i++){
    const id='capacity-'+i,folder=path.join(f.root,id);await mkdir(folder);
    db.connection.prepare('INSERT INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)').run(id,folder,new Date().toISOString());
    db.setFeatureValue(prefix+id,'active',{revision:1,preview:{...existing.preview,id:randomUUID(),projectId:id,project:folder}});
  }
  const target='capacity-extra',folder=path.join(f.root,target);await mkdir(folder);db.connection.prepare('INSERT INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)').run(target,folder,new Date().toISOString());
  const publish=()=>f.request('/api/v1/dashboards/'+target,{method:'PUT',headers:{origin:f.app.url},body:{port:app.port,expectedRevision:0}});
  const denied=await publish();assert.equal(denied.status,409);assert.equal((await denied.json()).error.code,'dashboard_capacity');
  assert.equal((await(await f.request('/api/v1/dashboards/'+target)).json()).dashboard,null);
  assert.equal((await f.request(route,{method:'DELETE',headers:{origin:f.app.url},body:{expectedRevision:1}})).status,200);
  assert.equal((await publish()).status,200);
});
