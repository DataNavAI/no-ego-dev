import {parentPort,workerData} from 'node:worker_threads';
import {createManagedMaintenance} from '../../../../../apps/core/src/maintenance.js';
const clock=new Int32Array(workerData.clock);
const guard=createManagedMaintenance({databasePath:workerData.databasePath,env:workerData.env,clock:()=>Atomics.load(clock,0),inspectProcesses:()=>({idle:true})});
parentPort.postMessage({ready:true});Atomics.wait(clock,1,0,10000);
let release;
try {
  if(workerData.role==='work'){
    try {release=guard.enter('chat');parentPort.postMessage({entered:true});Atomics.wait(clock,2,0,10000);}catch(error){parentPort.postMessage({entered:false,code:error.code});}
  } else {const result=guard.commit(workerData.intent);parentPort.postMessage({committed:result.ready===true&&result.state==='committed'});}
}finally{release?.();guard.close();}
