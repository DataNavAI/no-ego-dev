import {createIdentityHandler} from './provider-identity.js';
import {nativeIdentityAllowed} from '../../../src/identity-store.js';
import {createModelSetup,ModelSetupError} from './model-setup.js';
import {createVerifiedWorkReader} from './work-execution.js';
import {readTaskDelivery} from './task-delivery.js';
import {createSecretsHandler} from './secrets.js';
import {createActivityStreams} from './activity.js';
import {createChatGateway} from './chat.js';
import {createProjectReader,ProjectError} from './projects.js';

const capabilities={service:'nedcom',readOnly:false,capabilities:{projects:true,tasks:true,artifacts:false,preview:true,dashboards:true,chat:true}};

export function createBrowserApi({databasePath,home,env=process.env,chatGateway,logger,secretsEnabled=true,modelSetup,maintenance,identityOptions,identityEnabled=false,hubAwsIdentity=false,apiAuthenticated=()=>true}={}){
  const secrets=createSecretsHandler({home,env,enabled:secretsEnabled});
  const identity=createIdentityHandler({githubClientId:env.NED_GITHUB_APP_CLIENT_ID,...identityOptions,home,env,enabled:secretsEnabled&&(hubAwsIdentity||identityEnabled&&nativeIdentityAllowed(env)),allowedProviders:hubAwsIdentity?['aws','github']:undefined,awsChatShortcut:hubAwsIdentity});
  const projects=createProjectReader({databasePath,home,env});
  const models=modelSetup??createModelSetup({home,env,enabled:secretsEnabled});
  const live=(req,res)=>{try{return !res.destroyed&&apiAuthenticated(req);}catch{return false;}};
  const chat=createChatGateway({home,env,maintenance,...chatGateway,databasePath,logger,beforeChat:async(req,res)=>{const result=await models.prepare(()=>live(req,res));if(!live(req,res))throw new ModelSetupError(401,'model_setup_unauthorized');return result;}});
  const activity=createActivityStreams(databasePath);
  const work=createVerifiedWorkReader({databasePath,home,env,gateway:chatGateway});
  const removeBusySource=maintenance?.addBusySource(()=>models.isBusy?.()===true||identity.isBusy());
  const handler=async(req,res,send,origin)=>{
    const error=(status,code,message,extra)=>send(status,{error:{code,message}},extra);
    if(req.url==='/api/model-setup'||req.url.startsWith('/api/model-setup?')||req.url.startsWith('/api/model-setup/'))return models.handle(req,res,send,origin,()=>live(req,res),()=>{try{return apiAuthenticated(req);}catch{return false;}});
    if(/^\/api\/identity(?:[/?]|$)/.test(req.url))return identity(req,send,origin);
    if(req.url.startsWith('/api/chat/'))return chat(req,res,send);
    if(req.url==='/api/secrets'||req.url.startsWith('/api/secrets/')||req.url.startsWith('/api/secrets?'))return secrets(req,res,send,origin);
    if(!['GET','HEAD'].includes(req.method))return error(405,'method_not_allowed','Method not allowed.',{Allow:'GET, HEAD'});
    const pathname=req.url.split('?')[0];
    if(pathname==='/api/workspace/events'&&req.method==='GET')return activity.handle(req,res,null);
    if(pathname==='/api/activity/events'&&req.method==='GET'){
      const id=new URL(req.url,origin).searchParams.get('project');
      if(!id||!/^[A-Za-z0-9_-]{1,256}$/.test(id))return error(400,'invalid_project','Project is unavailable.');
      return activity.handle(req,res,id);
    }
    if(pathname==='/api/health')return send(200,{status:'ok',service:'nedcom'});
    if(pathname==='/api/capabilities')return send(200,{...capabilities,capabilities:{...capabilities.capabilities,modelSetup:secretsEnabled}});
    if(pathname==='/api/projects'||pathname.startsWith('/api/projects/')){
      const controller=new AbortController(),abort=()=>controller.abort();res.once('close',abort);
      try{
        const outputRoute=/^\/api\/projects\/([A-Za-z0-9_-]{1,256})\/tasks\/([A-Za-z0-9_-]{1,256})\/outputs\/([A-Za-z0-9_-]{1,64})$/.exec(pathname);
        if(outputRoute){
          const data=await readTaskDelivery({databasePath,home,env,gateway:chatGateway,projectId:outputRoute[1],taskId:outputRoute[2],signal:controller.signal});
          const output=data.outputs.find(row=>row.id===outputRoute[3]);if(!output)return error(404,'output_unavailable','Output unavailable.');
          return send(200,output.kind==='image'?Buffer.from(output.image,'base64'):output.text,{},output.kind==='image'?'image/png':'text/plain');
        }
        const taskRoute=/^\/api\/projects\/([A-Za-z0-9_-]{1,256})\/tasks\/([A-Za-z0-9_-]{1,256})(?:\/attempts\/([A-Za-z0-9_-]{1,256})(?:\/sessions\/([A-Za-z0-9_-]{1,200})\/messages)?)?$/.exec(pathname);
        if(taskRoute){
          const query=new URL(req.url,origin).searchParams;
          if([...query.keys()].some(key=>key!=='offset')||query.getAll('offset').length>1||query.has('offset')&&!/^(0|[1-9]\d{0,5})$/.test(query.get('offset')))return error(400,'invalid_page','Invalid page.');
          const result=await readTaskDelivery({databasePath,home,env,gateway:chatGateway,projectId:taskRoute[1],taskId:taskRoute[2],attemptId:taskRoute[3],sessionId:taskRoute[4],offset:Number(query.get('offset')||0),signal:controller.signal});
          if(result.outputs)result.outputs=result.outputs.map(output=>({id:output.id,kind:output.kind,title:output.title,...(output.kind==='document'?{text:output.text}:{})}));
          return send(200,result);
        }
        if(pathname==='/api/projects/work'){
          const {projects:registered}=projects.list();
          const workspaces=await work.read(registered);
          return send(200,{projects:registered.map((project,index)=>({...project,items:workspaces[index].items}))});
        }
        const match=/^\/api\/projects\/([^/]+)\/work$/.exec(pathname);
        return send(200,match?(await work.read([{id:decodeURIComponent(match[1])}]))[0]:pathname==='/api/projects'?projects.list():await projects.detail(decodeURIComponent(pathname.slice('/api/projects/'.length)),controller.signal));
      }catch(failure){
        if(failure instanceof ProjectError)return error(failure.status,failure.code,failure.message);
        if(failure instanceof URIError)return error(404,'project_unavailable','Project is unavailable.');
        return error(500,'internal_error','Unable to read project data.');
      }finally{res.off('close',abort);}
    }
    return error(404,'not_found','Not found.');
  };
  handler.setHubRegistration=input=>models.register(input);
  handler.close=async()=>{removeBusySource?.();await identity.close();chat.close();projects.close();activity.close();await work.close();await models.close();};
  return handler;
}
