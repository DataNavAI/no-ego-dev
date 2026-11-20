const phases=new Set(['fixed_session','history','turn_stream']);
const types=new Set(['Error','TypeError','SyntaxError','AbortError','TimeoutError']);
const codes=new Set(['ECONNRESET','ECONNREFUSED','ECONNABORTED','EPIPE','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET']);
const failures=new Set(['hub_com_unavailable','hub_proxy_unavailable','hub_tunnel_unavailable','html_bad_gateway','other']);
export function classifyFailureBody(text){
  const body=typeof text==='string'?text.trim():'';
  if(body==='COM server unavailable')return 'hub_com_unavailable';
  if(body==='Proxy unavailable')return 'hub_proxy_unavailable';
  if(body==='Tunnel unavailable')return 'hub_tunnel_unavailable';
  if(/^<!doctype html|^<html/i.test(body)&&/\b502 Bad Gateway\b/.test(body))return 'html_bad_gateway';
  return 'other';
}
export async function readFailureBody(response){
  const reader=response.body?.getReader();if(!reader)return '';
  const chunks=[];let bytes=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1024){await reader.cancel();return '';}chunks.push(value);}}
  finally{reader.releaseLock();}
  const result=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(result);
}
export function requestDiagnostic(phase,{status=0,durationMs=0,error,reusedSocket,failure}={}){
  if(!phases.has(phase))return null;
  const result={phase,status:Number.isInteger(status)&&status>=100&&status<=599?status:0,durationMs:Number.isFinite(durationMs)?Math.max(0,Math.min(610000,Math.floor(durationMs))):0};
  if(error){result.type=types.has(error.name)?error.name:'Error';const code=error.code ?? error.cause?.code;if(codes.has(code))result.code=code;}
  if(typeof reusedSocket==='boolean')result.reusedSocket=reusedSocket;
  if(failures.has(failure))result.failure=failure;
  return result;
}
export function requestPhase(path){
  if(path==='/api/chat/sessions/fixed')return 'fixed_session';
  if(/^\/api\/chat\/sessions\/[^/]+\/messages(?:\?|$)/.test(path))return 'history';
  if(/^\/api\/chat\/sessions\/[^/]+\/(?:chat|turns(?:\/|$))/.test(path))return 'turn_stream';
  return null;
}
