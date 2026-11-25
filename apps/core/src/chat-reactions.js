import {createHmac,timingSafeEqual} from 'node:crypto';
import {openNedDatabase} from '../../../src/database.js';
import {reactionEmoji} from './protocol/reaction-emoji.js';

const namespace='chat-reactions';
const signature=(key,origin,session,id)=>createHmac('sha256',key)
  .update(JSON.stringify([namespace,origin,session,id])).digest('hex');

export function decorateReactions(databasePath,origin,key,session,history){
  if(!databasePath||!history.data.some(row=>row.role==='assistant'))return history;
  let db;
  try{
    db=openNedDatabase({databaseUrl:databasePath});
    return {data:history.data.map(row=>{
      if(row.role!=='assistant')return row;
      const target=signature(key,origin,session,String(row.id));
      return {...row,reaction_target:target,reaction:db.getFeatureValue(namespace,target)};
    })};
  }catch{return history;}finally{db?.close();}
}

export async function saveReaction(req,send,{databasePath,origin,key,session}){
  const invalid=()=>send(400,{error:{code:'invalid_reaction',message:'Invalid message reaction.'}});
  let size=0;const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>2048)return invalid();
    chunks.push(chunk);
  }
  let input;
  try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return invalid();}
  if(!input||Object.keys(input).length!==3||typeof input.message_id!=='string'||!input.message_id.trim()||input.message_id.length>200||
    typeof input.target!=='string'||!/^[a-f0-9]{64}$/.test(input.target)||
    input.emoji!==null&&(typeof input.emoji!=='string'||!Object.hasOwn(reactionEmoji,input.emoji)))return invalid();
  const target=signature(key,origin,session,input.message_id);
  if(!timingSafeEqual(Buffer.from(target),Buffer.from(input.target)))return send(404,{error:{code:'message_unavailable',message:'Message unavailable.'}});
  let db;
  try{
    if(!databasePath)throw new Error('Database unavailable.');
    db=openNedDatabase({databaseUrl:databasePath});
    db.setFeatureValue(namespace,target,input.emoji);
  }catch{return send(503,{error:{code:'reaction_unavailable',message:'Could not save reaction.'}});}
  finally{db?.close();}
  return send(200,{reaction:input.emoji});
}
