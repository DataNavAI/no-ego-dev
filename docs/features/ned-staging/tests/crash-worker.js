import {fixture,B} from './fixtures.js';
const f=await fixture({after(){}},{},process.argv[2]);f.setMain(B);
f.setBoundary(async phase=>{if(phase===process.argv[3]){process.stdout.write('BOUNDARY\n');await new Promise(()=>{});}});
await f.controller.update();
