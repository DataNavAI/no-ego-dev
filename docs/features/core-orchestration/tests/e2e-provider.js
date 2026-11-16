import http from 'node:http';
import {EventEmitter} from 'node:events';

export async function syntheticProvider(test) {
  const events=new EventEmitter(),sessions=new Map(),runs=new Map(),streams=new Map(),requests=[];
  const server=http.createServer(async(request,response)=>{
    const chunks=[];
    for await(const chunk of request)chunks.push(chunk);
    const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):null;
    requests.push({method:request.method,path:request.url,body,key:request.headers['idempotency-key']});
    const send=(status,value)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value));};
    if(request.headers.authorization!=='Bearer synthetic-e2e-provider-key')return send(401,{});
    if(request.url==='/v1/capabilities')return send(200,{features:{runs_idempotency:{supported:true,durable:true,retention_seconds:3600}}});
    if(request.url==='/api/sessions'&&request.method==='POST'){
      if(sessions.has(body.id))return send(409,{});
      sessions.set(body.id,body);return send(201,{session:body});
    }
    const sessionMatch=request.url.match(/^\/api\/sessions\/([^/]+)$/);
    if(sessionMatch){
      const session=sessions.get(sessionMatch[1]);
      if(!session)return send(404,{});
      if(request.method==='PATCH')session.title=body.title;
      return send(200,{session});
    }
    if(request.url==='/v1/runs'&&request.method==='POST'){
      const id=`run_e2e_${runs.size+1}`;
      const run={run_id:id,session_id:body.session_id,status:'running'};
      runs.set(id,run);send(202,{run_id:id,status:'queued',replayed:false});events.emit('admitted',run);return;
    }
    const runMatch=request.url.match(/^\/v1\/runs\/([^/]+)(\/events)?$/);
    if(runMatch){
      const run=runs.get(runMatch[1]);
      if(!run)return send(404,{});
      if(runMatch[2]){
        response.writeHead(200,{'content-type':'text/event-stream'});response.flushHeaders();
        streams.set(run.run_id,response);response.once('close',()=>streams.delete(run.run_id));events.emit('subscribed',run);return;
      }
      return send(200,run);
    }
    send(404,{});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  test.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  return {events,sessions,runs,streams,requests,url:`http://127.0.0.1:${server.address().port}`,
    complete(id,text){const run=runs.get(id);run.status='completed';run.output=text;const stream=streams.get(id);stream?.end(`data: ${JSON.stringify({run_id:id,event:'run.completed',session_id:run.session_id,output:text})}\n\n`);},
  };
}
