import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createCoreHandler} from '../../../../apps/ned-core/src/http.js';
import {domainFixture} from './domain-fixture.js';

class BufferedResponse extends EventEmitter {
  constructor(){super();this.frames=[];this.writableLength=0;this.destroyed=false;}
  writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;}
  flushHeaders(){}
  write(frame){this.frames.push(frame);this.writableLength+=Buffer.byteLength(frame);return false;}
  destroy(){this.destroyed=true;this.emit('close');}
  end(frame){if(frame)this.write(frame);this.emit('close');}
}

export async function verifyStream(t){
  const {core,projectId}=await domainFixture(t);
  const scheduled=new Map(),cleared=new Set();
  const timers={setInterval(callback,milliseconds){const timer={callback,milliseconds,unref(){}};scheduled.set(milliseconds,timer);return timer;},clearInterval(timer){cleared.add(timer);}};
  const credential='b'.repeat(64),origin='http://127.0.0.1:12345';
  const handler=createCoreHandler({service:core,credential,boundOrigin:origin,timers});t.after(()=>handler.close());
  core.store.event(projectId,'task','synthetic-1','task.notice',{state:'queued'});
  const request={method:'GET',url:`/api/core/v1/projects/${projectId}/events/stream`,headers:{host:'127.0.0.1:12345',authorization:`Bearer ${credential}`}};
  const response=new BufferedResponse();await handler(request,response);
  assert.equal(response.status,200);assert.deepEqual([...scheduled.keys()],[250,15000]);
  const first=core.events(projectId).data[0];assert.equal(response.frames.length,1);assert.match(response.frames[0],new RegExp(`^id: ${first.cursor}\\n`));
  const before=core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_events').get().n;
  scheduled.get(15000).callback();assert.equal(response.frames.at(-1),': heartbeat\n\n');
  assert.equal(core.store.sql.prepare('SELECT COUNT(*) AS n FROM ned_core_events').get().n,before);
  response.writableLength=262144-Buffer.byteLength(': heartbeat\n\n');
  scheduled.get(15000).callback();assert.equal(response.destroyed,false,'exactly256KiB is allowed');
  scheduled.get(15000).callback();assert.equal(response.destroyed,true,'queue over256KiB disconnects');
  assert.equal(cleared.size,2);
  const frames=response.frames.length;await scheduled.get(250).callback();scheduled.get(15000).callback();assert.equal(response.frames.length,frames,'closed subscriber gets no subsequent writes');
  core.store.event(projectId,'task','synthetic-2','task.notice',{state:'running'});
  const resumed=new BufferedResponse();await handler({...request,headers:{...request.headers,'last-event-id':first.cursor}},resumed);
  assert.equal(resumed.frames.length,1);assert.match(resumed.frames[0],/synthetic-2/);assert.doesNotMatch(resumed.frames[0],/synthetic-1/);
  resumed.destroy();
}
