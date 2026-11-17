import {hermesFixture} from './fixture.js';

const fixture=await hermesFixture();
fixture.mock.onMessage('NED_INTERRUPT_CASE',{content:'Held until interrupted.'});
const barrier=fixture.barrier('NED_INTERRUPT_CASE','hold');
await fixture.attempt('NED_INTERRUPT_CASE');await barrier.reached.promise;
console.log('NED_INTERRUPT_READY '+JSON.stringify({root:fixture.root,pid:fixture.pid,url:fixture.url}));
