import {validateMessagePage} from './public/history.js';
export function projectHistoryMessage(row){
  let content=row.content ?? '';
  if(row.role==='user'){
    let parts=content;
    if(typeof content==='string'&&content.startsWith('[')){try{parts=JSON.parse(content);}catch{parts=content;}}
    const image=part=>part&&typeof part==='object'&&['image_url','input_image'].includes(part.type)&&(typeof part.image_url==='string'||typeof part.image_url?.url==='string');
    if(Array.isArray(parts)&&parts.some(image)){
      const simple=parts.every(part=>image(part)?Object.keys(part).every(key=>['type','image_url'].includes(key))&&(typeof part.image_url==='string'||Object.keys(part.image_url).every(key=>key==='url')):part?.type==='text'&&typeof part.text==='string'&&Object.keys(part).every(key=>['type','text'].includes(key)));
      content=simple?parts.map(part=>image(part)?'Image attachment':part.text).join('\n\n'):JSON.stringify(parts.map(part=>image(part)?{...part,image_url:typeof part.image_url==='string'?'Image attachment':{...part.image_url,url:'Image attachment'}}:part));
    }
  }
  return {id:row.id,role:row.role,content,...(row.tool_name!==undefined?{tool_name:row.tool_name}:{}),...(typeof row.name==='string'?{name:row.name}:{}),...(row.tool_calls!==undefined?{tool_calls:row.tool_calls}:{}),...(row.tool_call_id!==undefined?{tool_call_id:row.tool_call_id}:{})};
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
