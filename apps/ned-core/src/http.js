import {authorized,coreNamespace} from './auth.js';

const prefix='/api/core/v1';
const fail=(status,code,message)=>Object.assign(new Error(message),{status,code});
const schemas={createGoal:['title','description','priority','parentId'],createTask:['title','description','priority','parentId'],enroll:['enabled'],createAttempt:['instructions','role'],complete:['evidence'],stop:[],verify:['accepted','evidence'],resolve:['outcome','acknowledgeUncertainSideEffects','evidence'],retry:['instructions'],createAutomation:['kind','intervalSeconds','target','overlapPolicy'],updateAutomation:['revision','enabled','intervalSeconds','target','overlapPolicy'],trigger:[],requestReconcile:[]};
async function body(req,operation){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))throw fail(400,'invalid_request','JSON content type required.');
  let bytes=0;const chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw fail(413,'request_too_large','Request exceeds limit.');chunks.push(chunk);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'invalid_request','Invalid JSON.');}
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!schemas[operation].includes(key)))throw fail(400,'invalid_request','Invalid request fields.');
  const key=req.headers['idempotency-key'];
  if(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key))throw fail(400,'invalid_idempotency_key','Idempotency-Key required.');
  return {value,key};
}

export function createCoreHandler({service,credential,boundOrigin,timers={setInterval,clearInterval}}){
  const streams=new Set();
  const handler=async(req,res)=>{
    const namespace=coreNamespace(req.url);
    if(!namespace.blocked)return false;
    const send=(status,payload)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(payload));};
    try{
      const origin=typeof boundOrigin==='function'?boundOrigin():boundOrigin;
      if(!origin||req.headers.host!==new URL(origin).host||(req.headers.origin!==undefined&&req.headers.origin!==origin))throw fail(403,'forbidden','Access forbidden.');
      if(!namespace.valid)throw fail(400,'invalid_request','Invalid request path.');
      if(!authorized(req.headers.authorization,credential))throw fail(401,'unauthorized','Operator authorization required.');
      const url=new URL(req.url,origin),pathname=url.pathname;
      if(!pathname.startsWith(prefix+'/'))throw fail(404,'not_found','Not found.');
      const segments=pathname.slice(prefix.length+1).split('/');
      if(segments.some(segment=>!segment||segment.length>256))throw fail(400,'invalid_request','Invalid identifier.');
      const query={};
      const collection=req.method==='GET'&&segments[0]==='projects'&&(segments.length===1||segments.length===3&&['attempts','automations'].includes(segments[2])||segments.length===5&&segments[2]==='automations'&&segments[4]==='occurrences');
      const eventCollection=req.method==='GET'&&segments[0]==='projects'&&segments[2]==='events'&&(segments.length===3||segments.length===4&&segments[3]==='stream');
      const allowedQuery=eventCollection?['after','limit']:collection?['cursor','limit']:[];
      for(const [key,value] of url.searchParams){if(!allowedQuery.includes(key)||query[key]!==undefined)throw fail(400,'invalid_request','Invalid query.');query[key]=value;}
      if(query.limit!==undefined){if(!/^[1-9]\d?$|^100$/.test(query.limit))throw fail(400,'invalid_request','Invalid page limit.');query.limit=Number(query.limit);}
      let operation,args=[],status=200,paged=false;
      const method=req.method;
      if(method==='GET'&&segments.length===1&&['health','capabilities'].includes(segments[0])){
        const value=segments[0]==='health'?{status:'ok',service:'ned-core',version:1}:await service.capabilities?.()||{version:1,dispatchEnabled:false};
        send(200,{data:value});return true;
      }
      if(segments[0]==='coordinator'&&segments[1]==='reconcile'){
        if(method==='POST'&&segments.length===2){operation='requestReconcile';status=202;}
        else if(method==='GET'&&segments.length===3){operation='getTick';args=[segments[2]];}
      }
      if(segments[0]==='projects'){
        const project=segments[1],entity=segments[2],id=segments[3],action=segments[4];
        if(method==='GET'&&segments.length===1){operation='listProjects';args=[query];paged=true;}
        if(project&&segments.length===3){
          const reads={work:'work',attempts:'listAttempts',automations:'listAutomations',events:'events',metrics:'metrics'};
          if(method==='GET'&&reads[entity]){operation=reads[entity];args=[project,...(['attempts','automations','events'].includes(entity)?[query]:[])];paged=['attempts','automations','events'].includes(entity);}
          if(method==='POST'&&['goals','tasks','automations'].includes(entity))operation={goals:'createGoal',tasks:'createTask',automations:'createAutomation'}[entity],args=[project];
        }
        if(project&&id&&entity==='tasks'&&segments.length===5){
          if(method==='PUT'&&action==='enrollment')operation='enroll';
          if(method==='POST'&&['attempts','complete'].includes(action))operation=action==='attempts'?'createAttempt':'complete';
          if(operation)args=[project,id];
        }
        if(project&&id&&entity==='attempts'){
          if(method==='GET'&&segments.length===4)operation='getAttempt',args=[project,id];
          if(method==='GET'&&segments.length===5&&action==='result')operation='result',args=[project,id];
          if(method==='POST'&&segments.length===5&&['stop','verify','resolve','retry'].includes(action))operation=action,args=[project,id],status=action==='stop'?202:200;
        }
        if(project&&id&&entity==='automations'){
          if(method==='GET'&&segments.length===4)operation='getAutomation',args=[project,id];
          if(method==='PATCH'&&segments.length===4)operation='updateAutomation',args=[project,id];
          if(method==='POST'&&segments.length===5&&action==='trigger')operation='trigger',args=[project,id];
          if(method==='GET'&&segments.length===5&&action==='occurrences')operation='listOccurrences',args=[project,id,query],paged=true;
        }
        if(method==='GET'&&entity==='events'&&id==='stream'&&segments.length===4){
          const first=await service.events(project,{...query,after:req.headers['last-event-id']||query.after});
          res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.flushHeaders();
          let cursor=req.headers['last-event-id']||query.after,closed=false,busy=false;
          const write=frame=>{if(closed)return false;res.write(frame);if(res.writableLength>262144){res.destroy();return false;}return true;};
          const emit=page=>{for(const event of page.data){const eventCursor=event.cursor||event.id||event.sequence;if(eventCursor===undefined)throw new Error();if(!write(`id: ${eventCursor}\ndata: ${JSON.stringify(event)}\n\n`))return;}cursor=page.nextCursor||cursor;};
          const close=()=>{closed=true;timers.clearInterval(timer);timers.clearInterval(heartbeat);streams.delete(close);};
          const timer=timers.setInterval(async()=>{if(closed||busy)return;busy=true;try{emit(await service.events(project,{after:cursor,limit:100}));}catch{res.destroy();}finally{busy=false;}},250);timer.unref();
          const heartbeat=timers.setInterval(()=>write(': heartbeat\n\n'),15000);heartbeat.unref();
          streams.add(close);res.once('close',close);emit(first);return true;
        }
      }
      if(!operation)throw fail(404,'not_found','Not found.');
      if(!['GET'].includes(method)){const input=await body(req,operation);args.push(input.value,input.key);}
      const result=await service[operation](...args);
      send(status,paged&&result&&Array.isArray(result.data)?result:{data:result,...(paged?{nextCursor:null}:{})});
    }catch(error){
      if(res.headersSent){res.destroy();return true;}
      const taskStatus=error.isTaskError?['not_found','not_initialized'].includes(error.code)?404:error.code?.startsWith('invalid')&&error.code!=='invalid_transition'?400:409:503;
      const status=[400,401,403,404,409,413,503].includes(error.status)?error.status:taskStatus;
      send(status,{error:{code:typeof error.code==='string'&&/^[a-z_]{1,64}$/.test(error.code)?error.code:'core_unavailable',message:status===503?'Core service unavailable.':status===404?'Resource unavailable.':status===409?'Operation conflicts with current state.':'Request rejected.'}});
    }
    return true;
  };
  handler.close=()=>{for(const close of streams)close();};
  return handler;
}
