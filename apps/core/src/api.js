import {nedApiPath} from './api-paths.js';
import {resolveDatabasePath} from '../../../src/database.js';
import {createBrowserApi} from './browser-api.js';
import {createCoreService} from './runtime-service.js';
import {createCoreHandler} from './http.js';
import {authorized,loadOperatorCredential} from './auth.js';
import {requestDiagnostic,requestPhase} from './protocol/request-diagnostic.js';

export function createNedApiHandler({boundOrigin,operatorService,operatorCredential,browserEnabled=true,legacyInvalidStatus=400,...options}={}){
  options.databasePath=operatorService?.database?.filename??options.databasePath??resolveDatabasePath(options);
  let operatorPending,operatorHandler,ownedService,closing=false,closePromise;
  const browser=browserEnabled?createBrowserApi(options):null;
  const operator=()=>operatorPending??=(async()=>{
    const credential=operatorCredential??loadOperatorCredential(options);
    const service=operatorService??await createCoreService(options);
    if(!operatorService)ownedService=service;
    operatorHandler=createCoreHandler({service,credential,boundOrigin});
    return operatorHandler;
  })();
  const handler=async(req,res)=>{
    const route=nedApiPath(req.url);
    if(!route.api)return false;
    const send=(status,payload,extra={},type='application/json')=>{
      const body=type==='application/json'?JSON.stringify(payload):payload;
      res.writeHead(status,{'content-type':`${type}; charset=utf-8`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",...extra});res.end(req.method==='HEAD'?undefined:body);
    };
    const error=(status,code,message)=>send(status,{error:{code,message}});
    if(closing)return error(503,'api_unavailable','API is stopping.'),true;
    const origin=typeof boundOrigin==='function'?boundOrigin():boundOrigin;
    if(!origin||req.headers.host!==new URL(origin).host||(req.headers.origin!==undefined&&req.headers.origin!==origin))return error(403,'forbidden','Access forbidden.'),true;
    if(!route.valid){const status=req.url.startsWith('/api/v1')?400:legacyInvalidStatus;error(status,status===404?'not_found':'invalid_request',status===404?'Not found.':'Invalid request path.');return true;}
    if(route.kind==='unknown')return error(404,'not_found','Not found.'),true;
    if(route.kind==='operator'){
      try{
        if(!authorized(req.headers.authorization,operatorCredential??loadOperatorCredential(options)))return error(401,'unauthorized','Operator authorization required.'),true;
        const original=req.url;req.url=route.target;
        try{await(await operator())(req,res);}finally{req.url=original;}
      }catch{if(!res.headersSent)error(503,'core_unavailable','Core service unavailable.');else res.destroy();}
      return true;
    }
    if(!browser)return error(404,'not_found','Not found.'),true;
    if(route.kind==='discovery'){
      if(!['GET','HEAD'].includes(req.method))return error(405,'method_not_allowed','Method not allowed.'),true;
      send(200,{name:'NED API',version:1,basePath:'/api/v1',operatorPath:'/api/v1/operator',legacyAliases:true});return true;
    }
    const phase=requestPhase(req.url),started=Date.now();
    if(phase){let recorded=false;const record=()=>{if(recorded)return;recorded=true;options.logger?.event('chat_request',requestDiagnostic(phase,{status:res.headersSent?res.statusCode:0,durationMs:Date.now()-started}));};res.once('finish',record);res.once('close',record);}
    const original=req.url;req.url=route.target;
    try{
      await browser(req,res,(status,payload,extra,type)=>{
        if(!route.legacy&&route.family==='health'&&status===200)payload={status:'ok',service:'ned-api',version:1};
        if(!route.legacy&&route.family==='capabilities'&&status===200)payload={...payload,service:'ned-api',version:1};
        send(status,payload,extra,type);
      },origin);
    }catch{if(!res.headersSent)error(500,'internal_error','Unable to process API request.');else res.destroy();}
    finally{req.url=original;}
    return true;
  };
  handler.close=()=>closePromise??=(async()=>{closing=true;browser?.close();operatorHandler?.close();await operatorPending?.catch(()=>{});operatorHandler?.close();await ownedService?.close();})();
  return handler;
}
