export function secretRequestRow(row){
  if(row?.role!=='tool'||(row.tool_name??row.name)!=='ned')return null;
  try{
    let value=row.content;if(typeof value==='string'){if(value.length>2048)return null;value=JSON.parse(value);}
    const keys=['success','action','request_id','key','expires_at'];
    if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key))||value.success!==true||value.action!=='request_secret'||typeof value.request_id!=='string'||!/^[a-f0-9]{64}$/.test(value.request_id)||typeof value.key!=='string'||!/^[A-Z][A-Z0-9_]{0,127}$/.test(value.key)||typeof value.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expires_at)||!Number.isFinite(Date.parse(value.expires_at)))return null;
    return Object.fromEntries(keys.map(key=>[key,value[key]]));
  }catch{return null;}
}
export function secretShare(value){
  try{
    if(typeof value==='string'){if(value.length>2048)return null;value=JSON.parse(value);}
    if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==4||!['success','action','share_id','expires_at'].every(key=>Object.hasOwn(value,key))||value.success!==true||value.action!=='secure_share_secret'||typeof value.share_id!=='string'||!/^[a-f0-9]{64}$/.test(value.share_id)||typeof value.expires_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expires_at)||!Number.isFinite(Date.parse(value.expires_at)))return null;
    return {success:true,action:'secure_share_secret',share_id:value.share_id,expires_at:value.expires_at};
  }catch{return null;}
}
export function secretShareRow(row){return row?.role==='tool'&&(row.tool_name??row.name)==='ned'?secretShare(row.content):null;}

export function providerAuthRow(row){
  if(row?.role!=='tool'||(row.tool_name??row.name)!=='ned')return null;
  try{
    let value=row.content;
    if(typeof value==='string'){if(value.length>2048)return null;value=JSON.parse(value);}
    if(value&&typeof value==='object'&&!Array.isArray(value)&&value.success===false){
      const keys=['success','action','provider','error'];
      if(Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key))||value.action!=='request_provider_auth'||!['aws','github','godaddy'].includes(value.provider)||value.error!=='provider_auth_unavailable')return null;
      return Object.fromEntries(keys.map(key=>[key,value[key]]));
    }
    const keys=['success','action','provider','request_id','expires_at'];
    if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length!==keys.length
      ||!keys.every(key=>Object.hasOwn(value,key))||value.success!==true||value.action!=='request_provider_auth'
      ||!['aws','github','godaddy'].includes(value.provider)||typeof value.request_id!=='string'
      ||!/^[a-f0-9-]{36}$/.test(value.request_id)||typeof value.expires_at!=='string'
      ||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expires_at)
      ||!Number.isFinite(Date.parse(value.expires_at)))return null;
    return Object.fromEntries(keys.map(key=>[key,value[key]]));
  }catch{return null;}
}
