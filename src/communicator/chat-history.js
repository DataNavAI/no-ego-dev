import {secretShareRow} from './public/secret-share.js';
import {validateMessagePage} from './public/history.js';
// Match the renderer's supported call/block forms before any raw/data fallback.
function withoutNativeInputs(value,calls=false){
  let parsed=value;
  if(typeof value==='string'){try{parsed=JSON.parse(value);}catch{return value;}}
  const native=block=>block&&typeof block==='object'&&(block.name==='ned'||block.function?.name==='ned')&&(calls||['tool_use','tool_call','function','tool_result'].includes(block.type));
  if(native(parsed))return '';
  if(!Array.isArray(parsed))return value;
  const result=[],pending=[{source:parsed,target:result}];let changed=false;
  // Iterative traversal preserves even deeply nested generic arrays without stack growth.
  while(pending.length){const {source,target}=pending.pop();for(const block of source){
    if(native(block)){changed=true;continue;}
    if(Array.isArray(block)){const children=[];target.push(children);pending.push({source:block,target:children});}
    else target.push(block);
  }}
  return changed?(typeof value==='string'?JSON.stringify(result):result):value;
}
export function projectHistoryMessage(row){
  if(row.role==='tool'&&(row.tool_name??row.name)==='ned'){const share=secretShareRow(row);return {id:row.id,role:'tool',tool_name:'ned',content:share?JSON.stringify(share):''};}
  const content=withoutNativeInputs(row.content ?? '');
  return {id:row.id,role:row.role,content,...(row.tool_name!==undefined?{tool_name:row.tool_name}:{}),...(typeof row.name==='string'?{name:row.name}:{}),...(row.tool_calls!==undefined?{tool_calls:withoutNativeInputs(row.tool_calls,true)}:{}),...(row.tool_call_id!==undefined?{tool_call_id:row.tool_call_id}:{})};
}
export async function readHistoryPage({origin,session,offset,key,signal}){
  let limit=50,calls=0,rows=[];
  while(rows.length<50){
    if(++calls>64)throw new Error('History read limit exceeded.');
    const response=await fetch(`${origin}/api/sessions/${session}/messages?order=latest&limit=${Math.min(limit,50-rows.length)}&offset=${offset+rows.length}`,{headers:{Authorization:`Bearer ${key}`},redirect:'error',signal});
    if(!response.ok){await response.body?.cancel();throw new Error('History unavailable.');}
    const reader=response.body.getReader();let bytes=0;const chunks=[];
    try{
      while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4194304){await reader.cancel();break;}chunks.push(value);}
    }finally{reader.releaseLock();}
    if(bytes>4194304){if(limit===1)throw new Error('History row exceeds limit.');limit=Math.max(1,Math.floor(limit/2));continue;}
    const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));validateMessagePage(data.data);
    const requested=Math.min(limit,50-rows.length);
    if(data.data.length>requested)throw new Error('Invalid page.');
    rows=[...data.data.map(projectHistoryMessage),...rows];
    if(data.data.length<requested)break;
  }
  validateMessagePage(rows);
  const result={data:rows};
  if(Buffer.byteLength(JSON.stringify(result))>4194304)throw new Error('History response exceeds limit.');
  return result;
}
