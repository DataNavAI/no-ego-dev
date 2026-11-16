import {createExecutionOwner} from '../../../../apps/ned-core/src/owner.js';
const owner=createExecutionOwner({home:process.argv[2],env:{}});
process.send({held:owner.acquire()});
process.on('message',message=>{if(message==='acquire')process.send({held:owner.acquire()});if(message==='close'){owner.close();process.exit();}});
