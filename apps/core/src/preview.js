import http from 'node:http';
import path from 'node:path';
import {realpath,lstat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openNedDatabase} from '../../../src/database.js';
import {resolveRuntimeHome} from '../../../src/runtime-home.js';
import {resolveGatewaySettings} from '../../../src/gateway-settings.js';
import {loadApiInstanceId} from './auth.js';

const fail=(status,code)=>Object.assign(new Error(code),{status,code,isTaskError:true});
const revision=value=>Number.isSafeInteger(value)&&value>=0;
const empty=()=>({revision:0,preview:null});
const delivery={mode:'local-link',remoteAvailable:false};

export function createPreviewService(options={}){
  const pending=new Set();let closed=false;
  const database=()=>{if(options.databasePath===':memory:')throw fail(503,'preview_database_unavailable');return openNedDatabase({databaseUrl:options.databasePath,home:options.home,env:options.env});};
  const namespace=()=>`preview:v1:${loadApiInstanceId(options)}`;
  function access(operation){
    const db=database();
    try{return operation(db,namespace());}finally{db.close();}
  }
  const read=()=>access((db,key)=>db.getFeatureValue(key,'active')??empty());
  const safe=()=>{if(closed)throw fail(503,'preview_unavailable');};
  async function projectRoot(value){
    if(typeof value!=='string'||value.length>4096||!path.isAbsolute(value)||value.includes('\0'))throw fail(400,'invalid_preview_project');
    const root=path.resolve(value);
    try{const info=await lstat(root);if(info.isSymbolicLink()||!info.isDirectory())throw new Error();return await realpath(root);}catch{throw fail(400,'invalid_preview_project');}
  }
  function probe(port,signal){
    safe();
    return new Promise(resolve=>{
      let request,timer,done=false;
      const finish=status=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);pending.delete(abort);request?.destroy();resolve(status);};
      const abort=()=>finish('stopped');
      if(signal?.aborted)return abort();
      pending.add(abort);signal?.addEventListener('abort',abort,{once:true});
      request=http.request({hostname:'127.0.0.1',port,path:'/',method:'HEAD',agent:false,maxHeaderSize:32768},response=>{const status=response.statusCode>=500?'app_error':'available';response.destroy();finish(status);});
      request.on('error',abort);timer=setTimeout(abort,1000);request.end();
    });
  }
  function present(state,status){
    return {revision:state.revision,preview:state.preview?{id:state.preview.id,name:state.preview.name,project:{id:state.preview.projectId,name:path.basename(state.preview.project)},port:state.preview.port,status,localUrl:`http://127.0.0.1:${state.preview.port}/`}:null,delivery};
  }
  async function observe(state,signal){
    if(!state.preview)return present(state);
    let status;
    try{await projectRoot(state.preview.project);status=await probe(state.preview.port,signal);}catch{status='unavailable';}
    safe();
    // Never attach an observation of an old target to the new singleton.
    if(read().revision!==state.revision)throw fail(409,'preview_changed');
    return present(state,status);
  }
  return {
    async status({signal}={}){safe();return observe(read(),signal);},
    async register(input,{signal,authorized=()=>true,blockedPorts=[]}={}){
      safe();
      if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(key=>!['project','port','name','expectedRevision','replace'].includes(key))||!revision(input.expectedRevision)||input.replace!==undefined&&typeof input.replace!=='boolean')throw fail(400,'invalid_preview');
      if(!Number.isInteger(input.port)||input.port<1024||input.port>65535||[8642,18789,18790,18791,...blockedPorts].includes(input.port))throw fail(400,'invalid_preview_port');
      const settings=await resolveGatewaySettings({url:options.chatGateway?.url,home:options.home,env:{...(options.env??process.env),HERMES_HOME:resolveRuntimeHome(options)}});
      if(Number(new URL(settings.url).port||80)===input.port)throw fail(400,'invalid_preview_port');
      const project=await projectRoot(input.project),name=input.name??path.basename(project);
      if(typeof name!=='string'||!name.trim()||name.length>80||/[\p{Cc}\p{Cf}]/u.test(name))throw fail(400,'invalid_preview_name');
      const matches=state=>state.preview?.project===project&&state.preview?.port===input.port&&state.preview?.name===name;
      const before=read();
      if(before.revision!==input.expectedRevision&&!matches(before))throw fail(409,'preview_changed');
      if(before.preview&&!matches(before)&&input.replace!==true)throw fail(409,'preview_replace_required');
      if(signal?.aborted||!authorized())throw fail(401,'unauthorized');
      const status=await probe(input.port,signal);
      safe();if(signal?.aborted||!authorized())throw fail(401,'unauthorized');
      if(status==='stopped')throw fail(503,'preview_not_running');
      // A folder removed during readiness must not be registered or recreated.
      await projectRoot(project);
      safe();if(signal?.aborted||!authorized())throw fail(401,'unauthorized');
      const state=access((db,key)=>db.write(()=>{
        const current=db.getFeatureValue(key,'active')??empty();
        if(matches(current))return current;
        if(current.revision!==input.expectedRevision)throw fail(409,'preview_changed');
        if(current.preview&&input.replace!==true)throw fail(409,'preview_replace_required');
        if(current.revision===Number.MAX_SAFE_INTEGER)throw fail(409,'preview_revision_exhausted');
        let row=db.connection.prepare('SELECT id FROM ned_projects WHERE path=?').get(project);
        if(!row){row={id:randomUUID()};db.connection.prepare('INSERT INTO ned_projects(id,path,initialized_at) VALUES(?,?,?)').run(row.id,project,new Date().toISOString());}
        const next={revision:current.revision+1,preview:{id:randomUUID(),projectId:row.id,project,port:input.port,name}};
        db.setFeatureValue(key,'active',next);return next;
      }));
      return present(state,status);
    },
    clear(input){
      safe();if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).join(',')!=='expectedRevision'||!revision(input.expectedRevision))throw fail(400,'invalid_preview');
      return access((db,key)=>db.write(()=>{
        const current=db.getFeatureValue(key,'active')??empty();
        if(!current.preview&&(input.expectedRevision===current.revision||input.expectedRevision===current.clearedRevision))return present(current);
        if(current.revision!==input.expectedRevision)throw fail(409,'preview_changed');
        if(current.revision===Number.MAX_SAFE_INTEGER)throw fail(409,'preview_revision_exhausted');
        const next={revision:current.revision+1,preview:null,clearedRevision:current.revision};db.setFeatureValue(key,'active',next);return present(next);
      }));
    },
    close(){closed=true;for(const abort of [...pending])abort();}
  };
}

export function createPreviewHandler(options){
  const service=createPreviewService(options);
  const handler=async(req,res,send,origin,authorized)=>{
    const error=(status,code)=>send(status,{error:{code,message:status===409?'Preview changed. Read status before retrying.':status===503?'Preview app is unavailable.':'Preview request rejected.'}});
    if(req.url!=='/api/v1/preview')return error(404,'not_found');
    if(!['GET','PUT','DELETE'].includes(req.method))return error(405,'method_not_allowed');
    const controller=new AbortController(),abort=()=>controller.abort();res.once('close',abort);
    try{
      if(req.method==='GET'){const result=await service.status({signal:controller.signal});if(!authorized())throw fail(401,'unauthorized');return send(200,result);}
      if(req.headers.origin!==origin)throw fail(403,'forbidden');
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))throw fail(400,'invalid_preview');
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>4096)throw fail(413,'request_too_large');chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'invalid_preview');}
      if(!authorized()||controller.signal.aborted)throw fail(401,'unauthorized');
      const blockedPorts=[new URL(origin).port,options.chatGateway?.url&&new URL(options.chatGateway.url).port].filter(Boolean).map(Number);
      const result=req.method==='PUT'?await service.register(input,{signal:controller.signal,authorized,blockedPorts}):service.clear(input);
      return send(200,result);
    }catch(failure){return error([400,401,403,404,409,413,503].includes(failure.status)?failure.status:503,failure.code&&/^[a-z_]{1,64}$/.test(failure.code)?failure.code:'preview_unavailable');}
    finally{res.off('close',abort);}
  };
  handler.close=()=>service.close();return handler;
}
