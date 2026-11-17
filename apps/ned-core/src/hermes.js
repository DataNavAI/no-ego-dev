import {createHash} from 'node:crypto';
import {resolveGatewaySettings} from '../../../src/gateway-settings.js';

export class HermesError extends Error {
  constructor(code='gateway_unavailable',status=0){super('Hermes operation could not be confirmed.');this.code=code;this.status=status;}
}

const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value);
const statuses=new Set(['queued','running','waiting_for_approval','stopping','completed','failed','cancelled','interrupted']);

async function jsonBody(response,maximum=2097152){
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>maximum)throw new HermesError('invalid_gateway_response');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HermesError('invalid_gateway_response');}
}

export async function* readRunEvents(body,{signal,maximum=65536}={}) {
  const decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',bytes=0,data=[];
  for await(const chunk of body){
    if(signal?.aborted)throw signal.reason;
    buffer+=decoder.decode(chunk,{stream:true});
    let newline;
    while((newline=buffer.indexOf('\n'))!==-1){
      let line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(line.endsWith('\r'))line=line.slice(0,-1);
      bytes+=Buffer.byteLength(line)+1;if(bytes>maximum)throw new HermesError('invalid_gateway_stream');
      if(!line){
        if(data.length){let event;try{event=JSON.parse(data.join('\n'));}catch{throw new HermesError('invalid_gateway_stream');}if(!event||typeof event!=='object'||Array.isArray(event)||!validId(event.run_id)||typeof event.event!=='string')throw new HermesError('invalid_gateway_stream');yield event;}
        data=[];bytes=0;
      }else if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
    }
    if(bytes+Buffer.byteLength(buffer)>maximum)throw new HermesError('invalid_gateway_stream');
  }
  buffer+=decoder.decode();if(buffer.trim()||data.length)throw new HermesError('invalid_gateway_stream');
}

export function createHermesGateway(options={}) {
  const controllers=new Set(),pending=new Set(),readers=new Set();let closing=false;
  async function configuration(){
    let value;try{value=await resolveGatewaySettings(options);}catch{throw new HermesError();}
    if(!/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(value.url)||typeof value.key!=='string'||!value.key)throw new HermesError();
    const origin=new URL(value.url).origin;
    const identity=createHash('sha256').update(JSON.stringify([origin,value.key,options.env?.HERMES_HOME??'',options.home??''])).digest('hex');
    return {origin,key:value.key,identity};
  }
  function tracked(operation){if(closing)return Promise.reject(new HermesError('closing'));const promise=operation();pending.add(promise);promise.finally(()=>pending.delete(promise)).catch(()=>{});return promise;}
  async function request(resource,{method='GET',body,key,identity,signal,stream=false,deadline}={}){
    const settings=await configuration();if(identity&&identity!==settings.identity)throw new HermesError('gateway_identity_changed');
    const maximum=method==='POST'&&resource==='/v1/runs'?10000:1000;
    const remaining=deadline===undefined?maximum:Math.min(maximum,deadline-Date.now());
    if(!stream&&remaining<=0)throw new HermesError('gateway_deadline');
    const controller=new AbortController();controllers.add(controller);let streaming=false;
    const timeout=stream?null:setTimeout(()=>controller.abort(),remaining);
    const combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    try{
      const response=await fetch(settings.origin+resource,{method,redirect:'error',signal:combined,headers:{Authorization:`Bearer ${settings.key}`,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      if(!response.ok){await response.body?.cancel();throw new HermesError(response.status===401||response.status===403?'auth_failed':'gateway_rejected',response.status);}
      if(stream){if(!response.headers.get('content-type')?.startsWith('text/event-stream')){await response.body?.cancel();throw new HermesError('invalid_gateway_stream');}streaming=true;return {body:response.body,release:()=>controllers.delete(controller)};}
      return await jsonBody(response);
    }catch(error){if(error instanceof HermesError)throw error;throw new HermesError('gateway_unavailable');}
    finally{clearTimeout(timeout);if(!streaming)controllers.delete(controller);}
  }
  function session(value,id){const entry=value?.session;if(!entry||entry.id!==id||typeof entry.title!=='string'||typeof entry.source!=='string')throw new HermesError('invalid_gateway_response');return entry;}
  function run(value,id){if(!value||!validId(value.run_id)||id&&value.run_id!==id||!statuses.has(value.status))throw new HermesError('invalid_gateway_response');return value;}
  return {
    identity:()=>tracked(async()=>(await configuration()).identity),
    capabilities:(identity,options={})=>tracked(async()=>{const value=await request('/v1/capabilities',{identity,...options});const capability=value?.features?.runs_idempotency;return {supported:capability?.supported===true&&capability?.durable===true&&Number.isFinite(capability?.retention_seconds)&&capability.retention_seconds>60};}),
    createKnownSession:(intent,identity,options={})=>tracked(async()=>session(await request('/api/sessions',{method:'POST',body:{id:intent.id,title:intent.title,source:'api_server'},identity,...options}),intent.id)),
    getSession:(id,identity,options={})=>tracked(async()=>session(await request(`/api/sessions/${encodeURIComponent(id)}`,{identity,...options}),id)),
    setTitle:(id,title,identity)=>tracked(async()=>session(await request(`/api/sessions/${encodeURIComponent(id)}`,{method:'PATCH',body:{title},identity}),id)),
    submitRun:(body,key,identity,options={})=>tracked(async()=>{
      const value=await request('/v1/runs',{method:'POST',body,key,identity,...options});
      return run(value?.status==='started'?{...value,status:'running'}:value);
    }),
    getRun:(id,identity)=>tracked(async()=>run(await request(`/v1/runs/${encodeURIComponent(id)}`,{identity}),id)),
    stop:(id,identity)=>tracked(async()=>run(await request(`/v1/runs/${encodeURIComponent(id)}/stop`,{method:'POST',body:{},identity}),id)),
    events(id,identity,{signal}={}){
      const iterator=(async function*(){
        const response=await request(`/v1/runs/${encodeURIComponent(id)}/events`,{identity,signal,stream:true});
        const reader=response.body.getReader();readers.add(reader);
        const cancel=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
        async function* chunks(){while(true){const {value,done}=await reader.read();if(done)return;yield value;}}
        try{
          if(closing||signal?.aborted)cancel();
          for await(const event of readRunEvents(chunks(),{signal})){if(event.run_id!==id)throw new HermesError('invalid_gateway_stream');yield event;}
        }finally{signal?.removeEventListener('abort',cancel);readers.delete(reader);await reader.cancel().catch(()=>{});reader.releaseLock();response.release();}
      })();return iterator;
    },
    async close(){closing=true;for(const controller of controllers)controller.abort();await Promise.allSettled([...readers].map(reader=>reader.cancel()));await Promise.allSettled([...pending]);},
  };
}
