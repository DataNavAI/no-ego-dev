import http from 'node:http';
import {createCoreService as createDomainService} from './service.js';
import {createCoreRuntime} from './coordinator.js';
import {createCoreHandler} from './http.js';
import {loadOperatorCredential} from './auth.js';

export async function createCoreService(options={}){
  const service=await createDomainService(options);
  try{
    const runtime=await createCoreRuntime({...options,store:service.store});
    const close=service.close.bind(service);
    service.runtime=runtime;
    service.capabilities=()=>({version:1,operatorOnly:true,dispatchAutomatic:false,owner:runtime.status(),capacity:service.store.capacity()});
    let closePromise;
    service.close=()=>closePromise??=(async()=>{await runtime.close();await close();})();
    return service;
  }catch(error){await service.close();throw error;}
}

export async function createCoreServer({port=0,home,env=process.env,databasePath,backendOnly=false,operatorCredential,...options}={}){
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid Core port.');
  if(operatorCredential!==undefined&&(!backendOnly||typeof operatorCredential!=='string'||!/^[a-f0-9]{64}$/.test(operatorCredential)))throw new Error('Private transient credentials require backend-only mode.');
  const credential=operatorCredential??loadOperatorCredential({home,env});
  const service=await (backendOnly?createDomainService:createCoreService)({...options,home,env,databasePath});
  let url;
  const handler=createCoreHandler({service,credential,boundOrigin:()=>url});
  const server=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
  return {server,service,get url(){return url;},async listen(){
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
    url=`http://127.0.0.1:${server.address().port}`;return url;
  },async close(){handler.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await service.close();}};
}
