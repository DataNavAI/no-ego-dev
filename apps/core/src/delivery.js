import sharp from 'sharp';
import {CoreError} from './store.js';

export const deliveryNamespace=projectId=>`work-delivery:${projectId}`;
const invalid=()=>{throw new CoreError('invalid_delivery',400);};
export async function validateDelivery(input){
  if(!input||Array.isArray(input)||Object.keys(input).some(key=>!['impact','remainingSeconds','estimatedFinish','outputs'].includes(key)))invalid();
  const {impact='',remainingSeconds=null,estimatedFinish=null,outputs=[]}=input;
  if(typeof impact!=='string'||impact.length>240||/[\r\n]/.test(impact))invalid();
  if(remainingSeconds!==null&&(!Number.isSafeInteger(remainingSeconds)||remainingSeconds<0||remainingSeconds>31536000))invalid();
  if(estimatedFinish!==null&&(typeof estimatedFinish!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(estimatedFinish)||!Number.isFinite(Date.parse(estimatedFinish))||new Date(estimatedFinish).toISOString()!==estimatedFinish))invalid();
  if(!Array.isArray(outputs)||outputs.length>3)invalid();
  const sanitized=[];const ids=new Set();
  for(const output of outputs){
    if(!output||Object.keys(output).some(key=>!['id','kind','title','text','image'].includes(key))||typeof output.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(output.id)||ids.has(output.id)||typeof output.title!=='string'||!output.title.trim()||output.title.length>120)invalid();
    ids.add(output.id);
    if(output.kind==='document'){
      if(typeof output.text!=='string'||output.text.length>16384||output.image!==undefined)invalid();
      sanitized.push({id:output.id,kind:'document',title:output.title,text:output.text});
    }else if(output.kind==='image'){
      if(output.text!==undefined||typeof output.image!=='string'||output.image.length>32768||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(output.image))invalid();
      try{
        const bytes=Buffer.from(output.image.split(',')[1],'base64');
        const image=sharp(bytes,{limitInputPixels:4194304,animated:false});
        const metadata=await image.metadata();if(!['png','jpeg'].includes(metadata.format)||metadata.pages>1)invalid();
        const normalized=await image.resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png().toBuffer();
        if(normalized.length>262144)invalid();
        sanitized.push({id:output.id,kind:'image',title:output.title,image:normalized.toString('base64')});
      }catch{invalid();}
    }else invalid();
  }
  return {impact,remainingSeconds,estimatedFinish,outputs:sanitized};
}

export function readDelivery(db,projectId,itemId){
  const row=db.prepare('SELECT value FROM ned_feature_data WHERE namespace=? AND key=?').get(deliveryNamespace(projectId),itemId);
  return row?JSON.parse(row.value):null;
}

export function trackedTime(events,now){
  let start=null,total=0,recorded=false;
  for(const event of events){
    const at=Date.parse(event.created_at);if(!Number.isFinite(at)||at>now)continue;
    let state;try{state=JSON.parse(event.value).status;}catch{continue;}
    if(['claimed','unblocked'].includes(event.type)&&state==='working'){recorded=true;start??=at;}
    else if(['blocked','done'].includes(state)&&start!==null){total+=Math.max(0,at-start);start=null;}
  }
  if(start!==null)total+=Math.max(0,now-start);
  return recorded?Math.floor(total/1000):null;
}
