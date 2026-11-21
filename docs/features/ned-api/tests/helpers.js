import {configuredModelSetup} from '../../communicator/tests/model-fixture.js';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createTaskService} from '../../../../src/tasks.js';
import {createCoreServer} from '../../../../apps/core/src/index.js';
import {loadOperatorCredential} from '../../../../apps/core/src/auth.js';
import {createCommunicatorServer} from '../../../../apps/com/src/server.js';

export async function apiFixture(context,{kind='com',chatGateway,backendOnly=false,secretsEnabled=true}={}){
  const root=await mkdtemp(path.join(tmpdir(),'ned-api-case-'));
  const project=path.join(root,'project'),home=path.join(root,'home');
  await mkdir(project);await mkdir(home,{mode:0o700});
  const databasePath=path.join(root,'ned.sqlite'),env={NED_AGENT_HOME:home,HERMES_HOME:home};
  let app,task;
  context.after(async()=>{await app?.close();task?.close();await rm(root,{recursive:true,force:true});});
  task=await createTaskService({project,databaseUrl:databasePath,actor:'agent:api-test'});await task.initialize();
  app=kind==='core'?await createCoreServer({modelSetup:configuredModelSetup(),home,env,databasePath,chatGateway,backendOnly}):createCommunicatorServer({modelSetup:configuredModelSetup(),home,env,databasePath,gateway:chatGateway,secretsEnabled});
  await app.listen();
  const credential=()=>loadOperatorCredential({home,env});
  const request=(route,{method='GET',body,headers={},operator=false}={})=>fetch(app.url+route,{method,headers:{...(operator?{authorization:'Bearer '+credential()}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual',signal:AbortSignal.timeout(10000)});
  return {root,project,home,env,databasePath,app,task,projectId:task.project.id,credential,request};
}
