import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import http from 'node:http';
import {createRequire} from 'node:module';
export {apiFixture} from '../../ned-api/tests/helpers.js';
export const cli=promisify(execFile);
export async function ownedApp(t,project){
  const source=`const http=require('node:http');const server=http.createServer((req,res)=>{if(req.url==='/inspect'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({controlAuth:!!req.headers.authorization,controlCookie:/ned_session|__Host-ned_preview/.test(req.headers.cookie||'')}));}res.setHeader('content-type',req.url==='/app.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/app.js'?'document.body.dataset.ready="yes"':'<!doctype html><title>Fixture metrics</title><h1>Fixture daily users</h1><p>DAU 12 · Conversions 3</p><script src="/app.js"></script>');});const {WebSocketServer}=require(${JSON.stringify(createRequire(import.meta.url).resolve('ws'))});const ws=new WebSocketServer({server});ws.on('connection',socket=>socket.on('message',value=>socket.send(value.toString())));server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port));`;
  const child=spawn(process.execPath,['-e',source],{cwd:project,stdio:['ignore','pipe','pipe']});
  t.after(()=>new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);child.kill('SIGTERM');}));
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture app start timed out')),5000);child.once('error',reject);child.once('exit',()=>reject(Error('Fixture app exited')));child.stdout.once('data',data=>{clearTimeout(timer);resolve(Number(/PORT=(\d+)/.exec(data.toString())?.[1]));});});
  return {port,child};
}
export function relayRequest(origin,{path='/',method='GET',headers={},body}={}){
  const url=new URL(origin);
  return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:url.port,path,method,headers:{host:url.host,...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',s=>text+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:text}));});req.setTimeout(5000,()=>req.destroy(Error('Fixture request timed out')));req.on('error',reject);req.end(body);});
}
