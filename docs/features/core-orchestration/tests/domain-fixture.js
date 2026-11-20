import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createTaskService} from '../../../../src/tasks.js';
import {createCoreService} from '../../../../apps/core/src/service.js';
export async function domainFixture(test,options={}) {
  const root=await mkdtemp(path.join(os.tmpdir(),'ned-core-domain-'));
  const project=path.join(root,'project');await mkdir(project);
  const databasePath=path.join(root,'ned.sqlite');
  const task=await createTaskService({project,databaseUrl:databasePath,actor:'agent:ned-core'});
  await task.initialize();
  const core=await createCoreService({databasePath,...options});
  test.after(async()=>{await core.close();task.close();await rm(root,{recursive:true,force:true});});
  return {root,project,databasePath,task,core,projectId:task.project.id};
}
