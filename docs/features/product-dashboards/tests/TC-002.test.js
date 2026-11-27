import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {access} from 'node:fs/promises';
import {apiFixture,ownedApp,relayRequest,cli} from './helpers.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url));

test('TC-002: API-backed CLI publishes a project-owned app with isolated grants, credential stripping and revocation',{timeout:30000},async t=>{
  const f=await apiFixture(t),app=await ownedApp(t,f.project);
  const args=['--project',f.project,'--database',f.databasePath,'--api',f.app.url,'--json'];
  const run=async(...flags)=>JSON.parse((await cli(process.execPath,['bin/ned.js','dashboard',...flags,...args],{cwd:root,env:{...process.env,...f.env},timeout:15000})).stdout);
  const first=await run('register','--port',String(app.port),'--name','Product analytics');
  assert.equal(first.dashboard.project.id,f.projectId);assert.equal(first.dashboard.status,'available');assert.equal((await run('status')).dashboard.id,first.dashboard.id);
  const route='/api/v1/dashboards/'+f.projectId;
  const response=await f.request(route+'/access',{method:'POST',body:{mode:'frame'},headers:{origin:f.app.url}});assert.equal(response.status,200);const ticket=await response.json();
  assert.equal(JSON.stringify(ticket).includes(f.credential()),false);assert.notEqual(new URL(ticket.origin).origin,f.app.url);
  const bootstrap=()=>relayRequest(ticket.origin,{path:ticket.bootstrapPath,method:'POST',headers:{origin:f.app.url,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant:ticket.grant}).toString()});
  const granted=await bootstrap();assert.equal(granted.status,303);assert.equal((await bootstrap()).status,403);
  const cookie=granted.headers['set-cookie'][0].split(';')[0];
  assert.equal((await relayRequest(ticket.origin)).status,401);
  const inspected=await relayRequest(ticket.origin,{path:'/inspect',headers:{cookie:cookie+'; ned_session=synthetic',authorization:'Bearer '+f.credential()}});
  assert.equal(inspected.status,200);assert.deepEqual(JSON.parse(inspected.body),{controlAuth:false,controlCookie:false});
  assert.match((await relayRequest(ticket.origin,{headers:{cookie}})).body,/Fixture daily users/);
  const wrong=path.join(f.root,'wrong.sqlite');
  await assert.rejects(cli(process.execPath,['bin/ned.js','dashboard','status','--project',f.project,'--database',wrong,'--api',f.app.url,'--json'],{cwd:root,env:{...process.env,...f.env},timeout:15000}),e=>e.code===2&&/core_context_mismatch/.test(e.stderr));
  await assert.rejects(access(wrong),{code:'ENOENT'});
  assert.equal((await run('clear')).dashboard,null);
  const revoked=await relayRequest(ticket.origin,{headers:{cookie}}).catch(()=>({status:503}));assert.notEqual(revoked.status,200);
  assert.deepEqual(await f.task.getItems(),[]);
});

test('TC-002: Dashboard CLI reuses the project identity already registered by Preview',{timeout:15000},async t=>{
  const f=await apiFixture(t);
  const {mkdir}=await import('node:fs/promises');
  const project=path.join(f.root,'preview-first');await mkdir(project);const app=await ownedApp(t,project);
  const response=await f.request('/api/v1/preview',{method:'PUT',headers:{origin:f.app.url},body:{project,port:app.port,expectedRevision:0}});assert.equal(response.status,200);const preview=await response.json();
  const result=await cli(process.execPath,['bin/ned.js','dashboard','register','--port',String(app.port),'--project',project,'--database',f.databasePath,'--api',f.app.url,'--json'],{cwd:root,env:{...process.env,...f.env},timeout:10000});
  assert.equal(JSON.parse(result.stdout).dashboard.project.id,preview.preview.project.id);
});

test('TC-002: delivery capacity is reclaimed after another listener clears a dashboard',{timeout:30000},async t=>{
  const {mkdir}=await import('node:fs/promises');
  const {openNedDatabase}=await import('../../../../src/database.js');
  const {loadApiInstanceId,loadOperatorCredential}=await import('../../../../apps/core/src/auth.js');
  const {createCoreServer}=await import('../../../../apps/core/src/index.js');
  const {randomUUID}=await import('node:crypto');
  const f=await apiFixture(t),app=await ownedApp(t,f.project),route='/api/v1/dashboards/'+f.projectId;
  const first=await f.request(route,{method:'PUT',headers:{origin:f.app.url},body:{port:app.port,expectedRevision:0}});assert.equal(first.status,200);
  const db=openNedDatabase({databaseUrl:f.databasePath});t.after(()=>db.close());
  const prefix='dashboard:v1:'+loadApiInstanceId({home:f.home,env:f.env})+':',existing=db.getFeatureValue(prefix+f.projectId,'active');
  const ids=[f.projectId];
  for(let i=0;i<31;i++){
    const id='historical-'+i,folder=path.join(f.root,id);await mkdir(folder);ids.push(id);
    db.connection.prepare('INSERT INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)').run(id,folder,new Date().toISOString());
    db.setFeatureValue(prefix+id,'active',{revision:1,preview:{...existing.preview,id:randomUUID(),projectId:id,project:folder}});
  }
  for(const id of ids)await f.request('/api/v1/dashboards/'+id+'/access',{method:'POST',headers:{origin:f.app.url},body:{mode:'frame'}});
  const backend=await createCoreServer({home:f.home,env:f.env,databasePath:f.databasePath,backendOnly:true});t.after(()=>backend.close());await backend.listen();
  const cleared=await fetch(backend.url+route,{method:'DELETE',headers:{authorization:'Bearer '+loadOperatorCredential({home:f.home,env:f.env}),origin:backend.url,'content-type':'application/json'},body:JSON.stringify({expectedRevision:1})});assert.equal(cleared.status,200);
  const id='next-dashboard',folder=path.join(f.root,id);await mkdir(folder);const next=await ownedApp(t,folder);
  db.connection.prepare('INSERT INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)').run(id,folder,new Date().toISOString());
  const target='/api/v1/dashboards/'+id;
  assert.equal((await f.request(target,{method:'PUT',headers:{origin:f.app.url},body:{port:next.port,expectedRevision:0}})).status,200);
  const response=await f.request(target+'/access',{method:'POST',headers:{origin:f.app.url},body:{mode:'frame'}});
  assert.equal(response.status,200,JSON.stringify(await response.json()));
});
