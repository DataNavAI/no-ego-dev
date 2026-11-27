import {randomUUID} from 'node:crypto';
import {createPreviewService} from './preview.js';
import {createPreviewDelivery} from './preview-delivery.js';
import {openNedDatabase} from '../../../src/database.js';
import {loadApiInstanceId} from './auth.js';

const fail=(status,code)=>Object.assign(new Error(code),{status,code,isTaskError:true});
const projectId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const jsonType=value=>/^application\/json(?:;.*)?$/.test(value??'');

// Registrations share Preview's admission/CAS/listener checks, but never its slot.
export function createDashboardHandler(options){
  let closed=false,remoteAvailable=false;const generation=randomUUID();
  const deliveries=new Map(),pending=new Set();
  const enabled=options.previewDelivery??options.browserEnabled??true;
  const prefix=()=>`dashboard:v1:${loadApiInstanceId(options)}:`;
  function dbCall(operation){
    if(closed||options.databasePath===':memory:')throw fail(503,'dashboard_unavailable');
    const db=openNedDatabase({databaseUrl:options.databasePath,home:options.home,env:options.env});
    try{return operation(db);}finally{db.close();}
  }
  function project(id){
    if(!projectId(id))throw fail(400,'invalid_dashboard_project');
    const row=dbCall(db=>db.connection.prepare('SELECT id,path FROM ned_projects WHERE id=?').get(id));
    if(!row)throw fail(404,'project_not_found');return row;
  }
  function service(id){
    return createPreviewService({...options,resourceNamespace:prefix()+id,beforePublish:(db,current)=>{
      if(current.preview)return;
      const count=db.connection.prepare("SELECT count(*) AS total FROM ned_feature_data WHERE namespace LIKE ? AND key='active' AND json_extract(value,'$.preview') IS NOT NULL").get(prefix()+'%').total;
      if(count>=32)throw fail(409,'dashboard_capacity');
    }});
  }
  const present=state=>({revision:state.revision,dashboard:state.preview,delivery:enabled?{mode:'private-relay',remoteAvailable,generation}: {mode:'local-link',remoteAvailable:false}});
  function snapshots(){
    return dbCall(db=>db.connection.prepare("SELECT value FROM ned_feature_data WHERE namespace LIKE ? AND key='active' AND json_extract(value,'$.preview') IS NOT NULL ORDER BY namespace LIMIT 33").all(prefix()+'%').map(row=>JSON.parse(row.value)));
  }
  async function delivery(id){
    if(!enabled||closed)throw fail(503,'dashboard_delivery_unavailable');
    // Another API listener may clear a registration in the shared database.
    // Reclaim only inactive slots before enforcing the live-delivery bound.
    const retired=[];
    for(const [key,item] of deliveries){
      if(!item.source.snapshot().preview){deliveries.delete(key);item.source.close();retired.push(item.transport.close());}
    }
    if(retired.length)await Promise.all(retired);
    if(closed)throw fail(503,'dashboard_delivery_unavailable');
    if(!deliveries.has(id)){
      project(id);const source=service(id);
      if(!source.snapshot().preview){source.close();throw fail(404,'dashboard_not_found');}
      if(deliveries.size>=32){source.close();throw fail(503,'dashboard_delivery_unavailable');}
      const transport=createPreviewDelivery({service:source,boundOrigin:options.boundOrigin,localAppOrigin:options.localAppOrigin,isControlAuthorization:options.isControlAuthorization});
      deliveries.set(id,{source,transport});
    }
    return deliveries.get(id);
  }
  async function body(req){
    if(!jsonType(req.headers['content-type']))throw fail(400,'invalid_dashboard');
    let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>4096)throw fail(413,'request_too_large');text+=chunk;}
    try{return JSON.parse(text);}catch{throw fail(400,'invalid_dashboard');}
  }
  const handler=async(req,res,send,origin,authorized)=>{
    const match=/^\/api\/v1\/dashboards\/([A-Za-z0-9_-]{1,128})(\/access)?$/.exec(req.url);
    const error=(status,code)=>send(status,{error:{code,message:status===409?'Dashboard changed. Read status before retrying.':status===404?'Dashboard project not found.':'Dashboard request could not be completed.'}});
    if(!match)return error(400,'invalid_dashboard_path');
    const [,id,access]=match;
    if(!(access?['POST']:['GET','PUT','DELETE']).includes(req.method))return error(405,'method_not_allowed');
    if(req.method!=='GET'&&req.headers.origin!==origin)return error(403,'forbidden');
    const controller=new AbortController(),abort=()=>controller.abort();res.once('close',abort);pending.add(abort);
    let source;
    try{
      const row=project(id);source=service(id);
      const input=req.method==='GET'?undefined:await body(req);
      if(controller.signal.aborted||!authorized())throw fail(401,'unauthorized');
      if(access){
        if(!input||Array.isArray(input)||Object.keys(input).join(',')!=='mode'||!['frame','tab'].includes(input.mode))throw fail(400,'invalid_dashboard');
        const item=await delivery(id),result=await item.transport.access(input.mode,()=>!closed&&authorized());
        if(!authorized())throw fail(401,'unauthorized');return send(200,result);
      }
      let result;
      if(req.method==='GET')result=await source.status({signal:controller.signal});
      else if(req.method==='PUT'){
        if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(key=>!['port','name','expectedRevision','replace'].includes(key)))throw fail(400,'invalid_dashboard');
        result=await source.register({...input,project:row.path},{signal:controller.signal,authorized,blockedPorts:[Number(new URL(origin).port)]});
      }else{
        result=source.clear(input);const cached=deliveries.get(id);deliveries.delete(id);cached?.source.close();await cached?.transport.close();
      }
      if(!authorized())throw fail(401,'unauthorized');send(200,present(result));
    }catch(e){if(!res.headersSent&&!res.destroyed)error(e.status??503,String(e.code??'dashboard_unavailable').replaceAll('preview','dashboard'));}
    finally{source?.close();pending.delete(abort);res.removeListener('close',abort);}
  };
  handler.remote=value=>{remoteAvailable=value===true;};
  handler.snapshots=snapshots;
  handler.privateApp=async(req,res,head)=>{if(!options.localAppOrigin||closed)return false;for(const item of deliveries.values())if(item.transport.matches(req)){await item.transport.handle(req,res,head);return true;}return false;};
  handler.relay=async(req,target,head,context)=>{
    if(!projectId(context.projectId))throw fail(403,'invalid_dashboard_target');
    const item=await delivery(context.projectId),state=item.source.snapshot();
    if(state.preview?.id!==context.id||state.revision!==context.revision)throw fail(403,'dashboard_changed');
    return item.transport.relay(req,target,head,context);
  };
  handler.close=async()=>{closed=true;for(const abort of pending)abort();for(const item of deliveries.values())item.source.close();await Promise.all([...deliveries.values()].map(item=>item.transport.close()));deliveries.clear();};
  return handler;
}
