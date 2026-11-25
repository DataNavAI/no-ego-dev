export function createApiClient({request=(...args)=>globalThis.fetch(...args),storage=()=>globalThis.localStorage,origin=globalThis.location?.origin??''}={}){
  const key='ned.instance-access.v1',controllers=new Set(),listeners=new Set();
  let token=null,authVersion=0,hubAccess=false;
  const read=()=>{try{const value=JSON.parse(storage()?.getItem(key)??'null');return value?.origin===origin&&/^[a-f0-9]{64}$/.test(value.token)&&/^[a-f0-9]{64}$/.test(value.instanceId)?value:null;}catch{return null;}};
  const clear=()=>{try{const target=storage();target?.removeItem(key);return !target?.getItem(key);}catch{return false;}};
  function forget(reason='forgotten'){
    authVersion++;token=null;const cleared=clear();for(const controller of controllers)controller.abort();controllers.clear();for(const listener of listeners)listener(reason);return cleared;
  }
  async function fetchApi(resource,options={}){
    if(typeof resource!=='string'||!resource.startsWith('/api/')||resource.includes('\\')||/[\r\n]/.test(resource))throw new Error('Invalid API resource.');
    const version=authVersion,controller=new AbortController(),headers=new Headers(options.headers);
    if(token)headers.set('Authorization',`Bearer ${token}`);
    controllers.add(controller);const cleanup=()=>controllers.delete(controller);
    try{
      const response=await request(resource,{...options,redirect:'error',headers:Object.fromEntries(headers),signal:options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal});
      if(version!==authVersion){cleanup();await response.body?.cancel();throw new DOMException('Access changed.','AbortError');}
      if(response.headers.get('x-ned-hub-access')==='1')hubAccess=true;
      if(response.status===401){cleanup();forget(hubAccess?'hub-expired':'expired');return response;}
      if(!response.body){cleanup();return response;}
      const reader=response.body.getReader();
      const body=new ReadableStream({async pull(stream){try{const result=await reader.read();if(result.done){cleanup();stream.close();}else stream.enqueue(result.value);}catch(error){cleanup();stream.error(error);}},async cancel(reason){cleanup();await reader.cancel(reason);}});
      return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
    }catch(error){cleanup();throw error;}
  }
  async function validate(candidate,persist=true,expectedId){
    if(candidate!==null&&(typeof candidate!=='string'||!/^[a-f0-9]{64}$/.test(candidate)))throw Object.assign(new Error('Enter a valid access token.'),{code:'invalid_token'});
    const version=++authVersion;token=candidate;
    let response;
    try{response=await fetchApi('/api/v1/auth/context',{signal:AbortSignal.timeout(10000)});}
    catch{if(version===authVersion)token=null;throw Object.assign(new Error('Could not reach NED. Try again.'),{retryable:true});}
    if(!response.ok){await response.body?.cancel();if(version===authVersion)token=null;throw Object.assign(new Error(response.status===401?'Access token was not accepted.':'Could not verify NED. Try again.'),{code:response.status===401?'unauthorized':'unavailable',retryable:[502,503,504].includes(response.status)});}
    let data;
    try{data=await response.json();}
    catch(error){
      const retryable=['TypeError','TimeoutError'].includes(error.name);
      if(version===authVersion){
        if(retryable)token=null;
        else forget('invalid');
      }
      throw Object.assign(new Error('Could not verify NED. Try again.'),{retryable});
    }
    if(version!==authVersion)throw new Error('Access changed. Reconnect to NED.');
    if(!/^[a-f0-9]{64}$/.test(data?.instanceId)||!hubAccess&&expectedId&&data.instanceId!==expectedId){forget('changed');throw new Error('This NED instance has changed. Enter its access token.');}
    let remembered=true;
    if(hubAccess){token=null;clear();}
    if(!hubAccess&&candidate&&persist){try{const target=storage();if(!target)throw new Error();target.setItem(key,JSON.stringify({origin,instanceId:data.instanceId,token:candidate}));}catch{remembered=false;}}
    return {instanceId:data.instanceId,remembered,delegated:hubAccess||candidate===null};
  }
  return {get delegated(){return hubAccess;},fetch:fetchApi,validate,async restore(){const saved=read();return validate(saved?.token??null,false,saved?.instanceId);},forget,onLost(listener){listeners.add(listener);return()=>listeners.delete(listener);}};
}

export const apiClient=createApiClient();
export const apiFetch=(...args)=>apiClient.fetch(...args);

export function createApiEventSource(request=apiFetch,onLost=listener=>apiClient.onLost(listener)){
  return class ApiEventSource{
    constructor(url){this.url=url;this.readyState=0;this.lastEventId='';this.listeners=new Map();this.controller=new AbortController();this.retry=1000;this.stopped=false;this.timer=null;this.unsubscribe=onLost(()=>this.close());void this.connect();}
    addEventListener(type,listener){const values=this.listeners.get(type)??new Set();values.add(listener);this.listeners.set(type,values);}
    removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
    emit(type,data=''){const event=type==='message'||data?new MessageEvent(type,{data,lastEventId:this.lastEventId}):new Event(type);this['on'+type]?.(event);for(const listener of this.listeners.get(type)??[])listener(event);}
    async connect(){
      if(this.stopped)return;
      let reader;
      try{
        const response=await request(this.url,{headers:{Accept:'text/event-stream',...(this.lastEventId?{'Last-Event-ID':this.lastEventId}:{})},signal:this.controller.signal});
        if(response.status===401){await response.body?.cancel();this.close();this.emit('error');return;}
        if(!response.ok||!/^text\/event-stream(?:;|$)/i.test(response.headers.get('content-type')??'')||!response.body)throw new Error();
        this.readyState=1;this.emit('open');reader=response.body.getReader();
        const decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',data=[],event='message';
        const line=value=>{
          if(!value){if(data.length)this.emit(event,data.join('\n'));data=[];event='message';return;}
          if(value.startsWith(':'))return;
          const separator=value.indexOf(':'),name=separator<0?value:value.slice(0,separator),content=separator<0?'':value.slice(separator+1).replace(/^ /,'');
          if(name==='data')data.push(content);else if(name==='event')event=content;else if(name==='id'&&!content.includes('\0')&&content.length<=256)this.lastEventId=content;else if(name==='retry'&&/^\d+$/.test(content))this.retry=Math.max(100,Math.min(30000,Number(content)));
          if(data.join('\n').length>1048576)throw new Error();
        };
        while(!this.stopped){const next=await reader.read();if(next.done)break;buffer+=decoder.decode(next.value,{stream:true});if(buffer.length>1048576)throw new Error();let newline;while((newline=buffer.indexOf('\n'))>=0){line(buffer.slice(0,newline).replace(/\r$/,''));buffer=buffer.slice(newline+1);}}
      }catch{if(!this.stopped)this.emit('error');}
      finally{await reader?.cancel().catch(()=>{});}
      if(!this.stopped){this.readyState=0;this.timer=setTimeout(()=>void this.connect(),this.retry);}
    }
    close(){this.stopped=true;this.readyState=2;clearTimeout(this.timer);this.controller.abort();this.unsubscribe?.();}
  };
}
export const ApiEventSource=createApiEventSource();

const outputUrls=new Map(),outputObservers=new Map();
function cleanOutputs(){for(const [element,url] of outputUrls)if(!element.isConnected){URL.revokeObjectURL(url);outputUrls.delete(element);}for(const [element,observer] of outputObservers)if(!element.isConnected){observer.disconnect();outputObservers.delete(element);}}
if(typeof MutationObserver==='function'&&typeof document!=='undefined')new MutationObserver(cleanOutputs).observe(document.documentElement,{childList:true,subtree:true});
apiClient.onLost(()=>{for(const url of outputUrls.values())URL.revokeObjectURL(url);outputUrls.clear();for(const observer of outputObservers.values())observer.disconnect();outputObservers.clear();});
async function outputBlob(resource){
  const response=await apiFetch(resource);if(!response.ok)throw new Error('Output unavailable.');
  const type=response.headers.get('content-type')??'';if(!/^(image\/png|text\/plain)(?:;|$)/i.test(type)){await response.body?.cancel();throw new Error('Output unavailable.');}
  const blob=await response.blob();if(blob.size>1048576)throw new Error('Output unavailable.');return blob;
}
export function hydrateOutput(image,resource){
  if(typeof IntersectionObserver!=='function')return;
  const observer=new IntersectionObserver(entries=>{if(!entries.some(entry=>entry.isIntersecting))return;observer.disconnect();outputObservers.delete(image);cleanOutputs();
    void outputBlob(resource).then(blob=>{if(!image.isConnected)return;const url=URL.createObjectURL(blob);outputUrls.set(image,url);image.src=url;}).catch(()=>{image.alt='Screenshot unavailable';});
  });outputObservers.set(image,observer);observer.observe(image);
}
export async function openOutput(event,resource){
  event.preventDefault();const link=event.currentTarget,view=globalThis.open?.('about:blank','_blank');if(view)view.opener=null;
  try{const blob=await outputBlob(resource),url=URL.createObjectURL(blob);if(!view){URL.revokeObjectURL(url);throw new Error();}view.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),60000);}
  catch{view?.close();if(link)link.textContent='Output unavailable. Try again.';}
}
