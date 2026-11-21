import {test} from 'node:test';
import {writeFile,mkdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fixture,assert} from './helpers.js';
import {createCoreServer} from '../../../../apps/core/src/index.js';
import {createTaskApiClient} from '../../../../apps/cli/src/task-api.js';
import {loadOperatorCredential} from '../../../../apps/core/src/auth.js';

async function backend(context,fixtureValue,extra={}){
  const server=await createCoreServer({home:fixtureValue.home,env:{},databasePath:fixtureValue.databaseUrl,backendOnly:true,...extra});
  context.after(()=>server.close());
  await server.listen();
  return server;
}
async function command(fixtureValue,server,args,extra={}){
  const result=await fixtureValue.cli([...args,'--api',server.url,'--json'],extra);
  return {...result,value:JSON.parse((result.code?result.stderr:result.stdout)[0])};
}

test('TC-013: CLI HTTP commands preserve ownership, graph readback, delivery and atomic request receipts',async context=>{
  const fixtureValue=await fixture(context),server=await backend(context,fixtureValue);
  const call=(args,extra)=>command(fixtureValue,server,args,extra);
  const initialized=await call(['task','init']);
  assert.equal(initialized.code,0);
  const projectId=initialized.value.projectId;
  const goal=await call(['goal','create','Customers can finish checkout','--request-id','goal-create']);
  assert.equal(goal.code,0);
  const create=['task','create','Verify checkout','--goal',goal.value.id,'--request-id','task-create'];
  const [first,duplicate]=await Promise.all([call(create),call(create)]);
  assert.equal(first.code,0);
  assert.deepEqual(duplicate.value,first.value);
  const id=first.value.id;
  const conflict=await call(['task','create','Changed title','--request-id','task-create']);
  assert.equal(conflict.value.error,'idempotency_conflict');
  assert.equal((await call(['task','start',id,'--request-id','task-create'])).value.error,'idempotency_conflict');
  assert.equal((await call(['task','get',id])).value.status,'ready');
  assert.equal((await call(['task','list'])).value.length,1);
  assert.equal((await call(['task','start',id,'--request-id','claim'])).code,0);
  const client=await createTaskApiClient({...fixtureValue.options,api:server.url,actor:'agent:other'});
  context.after(()=>client.close());
  await assert.rejects(client.completeTask(id,'not my work'),{code:'not_owner'});
  const record={impact:'Shoppers can finish checkout',remainingSeconds:90,outputs:[{id:'report',kind:'document',title:'Verification',text:'Synthetic checkout checks pass.'}]};
  const filename=path.join(fixtureValue.directory,'delivery.json');
  await writeFile(filename,JSON.stringify(record));
  assert.equal((await call(['task','delivery',id,'--file',filename,'--request-id','publish'])).code,0);
  const saved=await call(['task','delivery',id]);
  assert.equal(saved.value.impact,record.impact);
  assert.deepEqual(saved.value.outputs,record.outputs);
  for(const invalid of [5,true,[],{impact:'not saved',unexpected:true}]){
    await writeFile(filename,JSON.stringify(invalid));
    const rejected=await call(['task','delivery',id,'--file',filename]);
    assert.equal(rejected.value.error,'invalid_task_command');
    assert.deepEqual((await call(['task','delivery',id])).value,saved.value);
  }
  const work=await server.service.work(projectId);
  assert.equal(work.items.find(item=>item.id===id).delivery.impact,record.impact);
  assert.deepEqual((await call(['task','attempts',id])).value,{data:[],nextCursor:null});
  const invalid={...record,outputs:[{id:'bad',kind:'image',title:'Bad',image:'file:///secret'}]};
  await writeFile(filename,JSON.stringify(invalid));
  assert.equal((await call(['task','delivery',id,'--file',filename])).value.error,'invalid_delivery');
  assert.deepEqual((await call(['task','delivery',id])).value,saved.value);
  for(const bytes of ['{','x'.repeat(65537)]){
    await writeFile(filename,bytes);
    const rejected=await call(['task','delivery',id,'--file',filename]);
    assert.equal(rejected.value.error,'invalid_delivery_file');
    assert.ok(!rejected.value.message.includes(filename));
    assert.deepEqual((await call(['task','delivery',id])).value,saved.value);
  }
  assert.equal((await call(['task','done',id,'--reason','Verified synthetic checks','--request-id','complete'])).code,0);
  assert.deepEqual((await call(create)).value,first.value);
  assert.equal((await call(['task','get',id])).value.status,'done');
  const events=(await call(['task','history',id])).value;
  assert.equal(events.filter(event=>event.type==='created').length,1);
  assert.equal(events.filter(event=>event.type==='claimed').length,1);
  assert.equal(events.filter(event=>event.type==='completed').length,1);
  assert.ok(events.every(event=>event.actor==='agent:first'));
  const token=loadOperatorCredential({home:fixtureValue.home,env:{}});
  const post=body=>fetch(`${server.url}/api/core/v1/task-management`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':'invalid'},body:JSON.stringify(body)});
  for(const body of [
    {project:fixtureValue.project,actor:'agent:first',operation:'close',args:[]},
    {project:fixtureValue.project,actor:'agent:first',operation:'createItem',args:['task',{title:'not saved',database:'elsewhere'}]},
    {project:fixtureValue.project,actor:'agent:first',operation:'getItems',args:[],database:fixtureValue.databaseUrl},
  ])assert.equal((await post(body)).status,400);
  assert.equal((await fetch(`${server.url}/api/core/v1/context`)).status,401);
  assert.equal((await call(['task','list'])).value.length,1);
  assert.equal(server.service.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_owner').get().n,0);
});

test('TC-013: explicit server failures and context mismatches never fall back to local writes or leak arguments',async context=>{
  const fixtureValue=await fixture(context),server=await backend(context,fixtureValue);
  await command(fixtureValue,server,['task','init']);
  const wrongDatabase=path.join(fixtureValue.directory,'different.sqlite');
  const mismatch=await command(fixtureValue,server,['task','create','private-title'],{env:{NED_DATABASE_URL:wrongDatabase},taskHome:fixtureValue.home});
  assert.equal(mismatch.code,0);
  const wrongHome=path.join(fixtureValue.directory,'another-home');
  await mkdir(wrongHome);
  const tokenFile=path.join(fixtureValue.home,'.ned','core','operator-token');
  loadOperatorCredential({home:wrongHome,env:{}});
  await writeFile(path.join(wrongHome,'.ned','core','operator-token'),await readFile(tokenFile));
  const isolated=await command(fixtureValue,server,['task','create','not-saved'],{taskHome:wrongHome});
  assert.equal(isolated.value.error,'core_context_mismatch');
  const mismatchClient=()=>createTaskApiClient({...fixtureValue.options,databaseUrl:wrongDatabase,api:server.url});
  await assert.rejects(mismatchClient(),{code:'core_context_mismatch'});
  const originalUrl=server.url;
  await server.close();
  const unavailable=await command(fixtureValue,{url:originalUrl},['task','create','not-saved']);
  assert.equal(unavailable.value.error,'core_unavailable');
  assert.match(unavailable.value.message,/request ID .*--request-id/);
  const service=await fixtureValue.service();
  assert.deepEqual((await service.getItems()).map(item=>item.title),['private-title']);
  for(const url of ['https://example.com','http://127.0.0.1:1/path','http://user:secret@127.0.0.1:1','http://127.0.0.1:1/?token=secret']){
    await assert.rejects(createTaskApiClient({...fixtureValue.options,api:url}),{code:'invalid_api'});
  }
});

test('TC-013: ambiguous mutation transport failure exposes replay key without retrying',async context=>{
  const fixtureValue=await fixture(context);
  const real=await backend(context,fixtureValue);
  const core=real.service.context();
  let mutations=0;
  const server=http.createServer(async(req,res)=>{
    if(req.url.endsWith('/context')){res.setHeader('content-type','application/json');res.end(JSON.stringify({data:core}));return;}
    for await(const chunk of req)void chunk;
    mutations++;
    req.socket.destroy();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  context.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const client=await createTaskApiClient({...fixtureValue.options,api:`http://127.0.0.1:${server.address().port}`,requestId:'stable-replay'});
  context.after(()=>client.close());
  await assert.rejects(client.initialize(),error=>error.code==='core_unavailable'&&error.message.includes('--request-id stable-replay'));
  assert.equal(mutations,1);
});

test('TC-013: task-scoped pagination, API claim races and managed completion fences',async context=>{
  const fixtureValue=await fixture(context),server=await backend(context,fixtureValue);
  const client=await createTaskApiClient({...fixtureValue.options,api:server.url,actor:'agent:ned-core'});
  const competitor=await createTaskApiClient({...fixtureValue.options,api:server.url,actor:'agent:competitor'});
  context.after(async()=>{await client.close();await competitor.close();});
  const {projectId}=await client.initialize();
  const task=await client.createItem('task',{title:'Synthetic managed task'});
  const other=await client.createItem('task',{title:'Unrelated task'});
  const race=await Promise.allSettled([client.startTask(other.id),competitor.startTask(other.id)]);
  assert.equal(race.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(race.find(result=>result.status==='rejected').reason.code,'not_owner');
  await server.service.enroll(projectId,task.id,{enabled:true},'enroll');
  let latest;
  for(let number=1;number<=22;number++){
    latest=await server.service.createAttempt(projectId,task.id,{instructions:'Synthetic private instructions',role:'worker'},`attempt-${number}`);
    if(number<22)await server.service.stop(projectId,latest.id,{},`stop-${number}`);
  }
  const page=await client.getTaskAttempts(task.id);
  assert.equal(page.data.length,20);
  assert.equal(page.data[0].id,latest.id);
  assert.equal(page.data[0].state,'queued');
  assert.equal(page.data[0].number,22);
  assert.ok(page.data.every(attempt=>!Object.hasOwn(attempt,'request')&&!Object.hasOwn(attempt,'resultText')));
  const next=await client.getTaskAttempts(task.id,page.nextCursor);
  assert.deepEqual(next.data.map(attempt=>attempt.number),[2,1]);
  assert.equal(next.nextCursor,null);
  await assert.rejects(client.getTaskAttempts(other.id,page.nextCursor),{code:'invalid_cursor'});
  await assert.rejects(client.completeTask(task.id,'not verified'),{code:'verification_required'});
  assert.equal((await client.getItem(task.id)).status,'working');
  server.service.store.updateAttempt(projectId,latest.id,{state:'awaiting_verification'});
  await assert.rejects(client.completeTask(task.id,'still not verified'),{code:'verification_required'});
  await server.service.verify(projectId,latest.id,{accepted:true,evidence:[{kind:'test',reference:'synthetic test result'}]},'verify');
  assert.equal((await client.completeTask(task.id,'Verified synthetic result')).status,'done');
  assert.equal(server.service.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_bindings').get().n,0);
});

test('TC-013: default command-scoped backend replays across processes without starting coordinator',async context=>{
  const fixtureValue=await fixture(context);
  assert.equal((await fixtureValue.cli(['task','init','--json'])).code,0);
  const args=['task','create','Single persisted task','--request-id','default-create','--json'];
  const first=await fixtureValue.cli(args);
  const repeated=fixtureValue.processCli(args,{NED_AGENT_HOME:fixtureValue.home,NED_API_URL:undefined,NED_CORE_URL:undefined});
  assert.equal(repeated.status,0,repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout),JSON.parse(first.stdout[0]));
  const database=fixtureValue.database();
  assert.equal(database.connection.prepare('SELECT COUNT(*) AS n FROM ned_work_items').get().n,1);
  assert.equal(database.connection.prepare('SELECT COUNT(*) AS n FROM ned_core_owner').get().n,0);
  assert.equal(database.connection.prepare('SELECT COUNT(*) AS n FROM ned_core_attempts').get().n,0);
  const credential=path.join(fixtureValue.home,'.ned','core','operator-token');
  assert.match(await readFile(credential,'utf8'),/^[a-f0-9]{64}\n?$/);
  assert.equal((await stat(credential)).mode&0o777,0o600);
  await assert.rejects(createCoreServer({home:fixtureValue.home,env:{},operatorCredential:'a'.repeat(64)}),/backend-only/);
});
