import {spawnOwned} from '../../../../src/staging/controller.js';
const handle=await spawnOwned(process.argv[2],process.execPath,process.execPath,['-e',"console.log('CHILD_READY');setInterval(()=>{},1000)"],{env:process.env});
handle.worker.stdout.on('data',bytes=>process.stdout.write(bytes));
await handle.done;
