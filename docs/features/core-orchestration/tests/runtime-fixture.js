import http from 'node:http';
import {EventEmitter,once} from 'node:events';
import {domainFixture} from './domain-fixture.js';
import {createCoreRuntime} from '../../../../apps/ned-core/src/coordinator.js';
import {createHermesGateway} from '../../../../apps/ned-core/src/hermes.js';

export async function runtimeFixture(test,{gatewayOptions={},wrapGateway=gateway=>gateway,...options}={}) {
  const cleanup=[];
  const fixture=await domainFixture({after:callback=>cleanup.push(callback)},options);
  const sessions=new Map(),runs=new Map(),streams=new Map(),requests=[],events=new EventEmitter();
  const behavior={capability:{supported:true,durable:true,retention_seconds:3600},admissionStatus:202,admissionState:'queued',loseAdmission:false,conflictSession:false,loseSession:false,namingStatus:200,statusCode:200};
  const server=http.createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
    requests.push({method:req.method,url:req.url,body,key:req.headers['idempotency-key']});events.emit('request');
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    if(req.headers.authorization!=='Bearer synthetic-core-key')return send(401,{});
    if(req.url==='/v1/capabilities')return send(200,{features:{runs_idempotency:behavior.capability}});
    if(req.url==='/api/sessions'&&req.method==='POST'){
      if(sessions.has(body.id))return send(409,{});
      const session={...body,...(behavior.conflictSession?{title:'unrelated title'}:{})};sessions.set(body.id,session);
      if(behavior.loseSession){res.destroy();return;}return send(201,{session});
    }
    const sessionMatch=req.url.match(/^\/api\/sessions\/([^/]+)$/);
    if(sessionMatch){const session=sessions.get(sessionMatch[1]);if(!session)return send(404,{});if(req.method==='PATCH'){if(behavior.namingStatus!==200)return send(behavior.namingStatus,{});session.title=body.title;}return send(200,{session});}
    if(req.url==='/v1/runs'&&req.method==='POST'){
      if(behavior.admissionStatus!==202)return send(behavior.admissionStatus,{});
      const id=`run_${runs.size+1}`,run={run_id:id,session_id:body.session_id,status:'running'};runs.set(id,run);
      if(behavior.loseAdmission){res.destroy();return;}return send(202,{run_id:id,status:behavior.admissionState,replayed:false});
    }
    const match=req.url.match(/^\/v1\/runs\/([^/]+)(\/(?:events|stop))?$/);
    if(match){const run=runs.get(match[1]);if(!run||behavior.statusCode!==200)return send(behavior.statusCode===200?404:behavior.statusCode,{});
      if(match[2]==='/events'){
        res.writeHead(200,{'Content-Type':'text/event-stream'});res.flushHeaders();
        const set=streams.get(run.run_id)??new Set();set.add(res);streams.set(run.run_id,set);events.emit('subscriber');
        res.on('close',()=>{set.delete(res);events.emit('subscriberClosed');});return;
      }
      if(match[2]==='/stop'){run.stopRequested=true;return send(200,{run_id:run.run_id,status:'stopping'});}
      return send(200,run);
    }
    send(404,{});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const gateway=wrapGateway(createHermesGateway({url:`http://127.0.0.1:${server.address().port}`,key:'synthetic-core-key',home:fixture.root,env:{},...gatewayOptions}));
  let runtime=await createCoreRuntime({store:fixture.core.store,home:fixture.root,env:{},gateway,...options});
  test.after(async()=>{await runtime.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const callback of cleanup)await callback();});
  const waitSubscriber=async(id)=>{if(!streams.get(id)?.size)await once(events,'subscriber');};
  async function attempt(name='Synthetic runtime task'){
    const key=name.replace(/ /g,'-');
    const item=await fixture.core.createTask(fixture.projectId,{title:name},`task-${key}`);
    await fixture.core.enroll(fixture.projectId,item.id,{enabled:true},`enroll-${key}`);
    return fixture.core.createAttempt(fixture.projectId,item.id,{instructions:'Execute synthetic acceptance only.'},`attempt-${key}`);
  }
  async function tick(key=`tick-${requests.length}`){const row=fixture.core.requestReconcile({},key);await runtime.maintenance();return fixture.core.getTick(row.id);}
  async function reopen(){await runtime.close();const replacement=wrapGateway(createHermesGateway({url:`http://127.0.0.1:${server.address().port}`,key:'synthetic-core-key',home:fixture.root,env:{},...gatewayOptions}));runtime=await createCoreRuntime({store:fixture.core.store,home:fixture.root,env:{},gateway:replacement,...options});return runtime;}
  function emit(id,event,{fragment=false}={}){const frame=`data: ${JSON.stringify({run_id:id,...event})}\n\n`;for(const response of streams.get(id)??[]){if(fragment){const buffer=Buffer.from(frame);for(let index=0;index<buffer.length;index+=3)response.write(buffer.subarray(index,index+3));}else response.write(frame);}}
  return {...fixture,requests,sessions,runs,streams,events,behavior,gateway,gatewayUrl:`http://127.0.0.1:${server.address().port}`,get runtime(){return runtime;},attempt,tick,reopen,emit,waitSubscriber};
}
