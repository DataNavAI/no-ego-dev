import {createCoreService} from '../../../../apps/ned-core/src/service.js';
const [databasePath,projectId,taskId,key]=process.argv.slice(2);
const core=await createCoreService({databasePath});
process.send({ready:true});
process.once('message',async()=>{
  try{const attempt=await core.createAttempt(projectId,taskId,{instructions:'Synthetic simultaneous claim'},key);process.send({ok:true,id:attempt.id});}
  catch(error){process.send({ok:false,code:error.code});}
  finally{await core.close();process.disconnect();}
});
