import http from 'node:http';
import {createCoreService as createDomainService} from './service.js';
import {createCoreService} from './runtime-service.js';
import {createNedApiHandler} from './api.js';
import {loadOperatorCredential} from './auth.js';
export {createCoreService} from './runtime-service.js';
export {createNedApiHandler} from './api.js';

export async function createCoreServer({port=0,home,env=process.env,databasePath,backendOnly=false,operatorCredential,...options}={}){
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid Core port.');
  if(operatorCredential!==undefined&&(!backendOnly||typeof operatorCredential!=='string'||!/^[a-f0-9]{64}$/.test(operatorCredential)))throw new Error('Private transient credentials require backend-only mode.');
  const credential=operatorCredential??loadOperatorCredential({home,env});
  const service=await (backendOnly?createDomainService:createCoreService)({...options,home,env,databasePath});
  let url;
  let handler;
  try{handler=createNedApiHandler({...options,home,env,databasePath,operatorService:service,operatorCredential:credential,browserEnabled:!backendOnly,boundOrigin:()=>url});}
  catch(error){await service.close();throw error;}
  const server=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
  return {server,service,get url(){return url;},async listen(){
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
    url=`http://127.0.0.1:${server.address().port}`;return url;
  },async close(){await handler.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await service.close();}};
}

export const createNedApiServer=createCoreServer;
