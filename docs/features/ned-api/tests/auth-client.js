import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCommunicatorServer as createServer} from '../../../../apps/com/src/server.js';
import {loadApiCredential} from '../../../../apps/core/src/auth.js';

const credentials=new Map();
export function authenticateInstance(url,options){credentials.set(new URL(url).origin,loadApiCredential(options));}
export function authenticatedHeaders(url,headers={}){
  const result=new Headers(headers),credential=credentials.get(new URL(url).origin);
  if(credential&&!result.has('authorization'))result.set('authorization',`Bearer ${credential}`);
  return Object.fromEntries(result);
}
export function fetch(url,options={}){
  return globalThis.fetch(url,{...options,headers:authenticatedHeaders(url,options.headers)});
}
export function createCommunicatorServer(options={}){
  const ownedHome=options.home===undefined?mkdtempSync(path.join(tmpdir(),'ned-auth-client-')):null;
  let app;
  try{app=createServer({...options,home:options.home??ownedHome});}
  catch(error){if(ownedHome)rmSync(ownedHome,{recursive:true,force:true});throw error;}
  const listen=app.listen,close=app.close;
  app.listen=async()=>{const url=await listen();credentials.set(url,app.apiCredential);return url;};
  app.close=async()=>{const url=app.url;await close();credentials.delete(url);if(ownedHome)rmSync(ownedHome,{recursive:true,force:true});};
  return app;
}
