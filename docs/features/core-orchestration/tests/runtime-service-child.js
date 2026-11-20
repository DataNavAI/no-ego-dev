import {createCoreService} from '../../../../apps/core/src/service.js';
import {createCoreRuntime} from '../../../../apps/core/src/coordinator.js';
import {createHermesGateway} from '../../../../apps/core/src/hermes.js';

const [home,databasePath,url]=process.argv.slice(2);
const core=await createCoreService({home,databasePath,env:{}});
const gateway=createHermesGateway({home,env:{},url,key:'synthetic-core-key'});
const runtime=await createCoreRuntime({store:core.store,home,env:{},gateway});
process.send({ready:true,...runtime.status()});
process.on('message',async message=>{
  try{
    if(message.action==='maintenance'){await runtime.maintenance();process.send({ok:true,...runtime.status()});}
    else if(message.action==='tick')process.send({ok:true,tick:core.requestReconcile({},message.key)});
    else if(message.action==='stop')process.send({ok:true,attempt:core.stop(message.projectId,message.id,{},message.key)});
    else if(message.action==='close'){await runtime.close();await core.close();process.send({ok:true});process.exit();}
  }catch(error){process.send({ok:false,error:error.code??error.message});}
});
