import {randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
const MAX_FILE=4194304;
const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export class AttachmentError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function validateAttachment(name,mime,buffer){
  if(typeof name!=='string'||!name||name.length>180||[...name].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127||'/\\'.includes(char)))throw new AttachmentError('Choose a file with a valid filename.');
  if(!buffer.length||buffer.length>MAX_FILE)throw new AttachmentError('Files must be nonempty and at most 4 MB.',413);
  const extension=name.split('.').at(-1).toLowerCase();const expected=types[extension];
  if(!expected||mime!==expected&&!(extension==='md'&&mime==='text/plain')&&!(extension==='csv'&&mime==='application/vnd.ms-excel'))throw new AttachmentError('Unsupported file type. Choose PNG, JPEG, WebP, TXT, MD, CSV, JSON, PDF or DOCX.');
  let valid=true;
  if(extension==='png')valid=buffer.length>=45&&buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&buffer.subarray(12,16).toString()==='IHDR'&&buffer.subarray(-8,-4).toString()==='IEND';
  else if(['jpg','jpeg'].includes(extension))valid=buffer.length>=20&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255&&buffer.at(-2)===255&&buffer.at(-1)===217;
  else if(extension==='webp')valid=buffer.length>=20&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.readUInt32LE(4)+8===buffer.length&&buffer.subarray(8,12).toString()==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(buffer.subarray(12,16).toString());
  else if(extension==='pdf')valid=buffer.subarray(0,5).toString()==='%PDF-';
  else if(extension==='docx')valid=buffer.subarray(0,4).equals(Buffer.from([80,75,3,4]));
  if(!valid)throw new AttachmentError('File contents do not match its type.');
  return {extension,mime:expected};
}
export function createAttachmentStore({now=Date.now}={}){
  const records=new Map();const children=new Set();let reserved=0;let uploads=0;let parsing=0;
  const prune=()=>{for(const [id,row]of records)if(now()-row.created>=900000)records.delete(id);};
  const used=()=>[...records.values()].reduce((sum,row)=>sum+row.bytes,0);
  async function extract(type,buffer){
    if(parsing>=2)throw new AttachmentError('Document processing is busy. Try attaching again.',503);
    parsing++;
    const child=fork(new URL('./attachment-worker.js',import.meta.url),[],{execArgv:['--max-old-space-size=128'],stdio:['ignore','ignore','ignore','ipc']});children.add(child);
    try{return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new AttachmentError('Document processing timed out.'));},10000);
      const finish=(error,text)=>{clearTimeout(timer);child.kill();error?reject(error):resolve(text);};
      child.once('message',message=>finish(message.error?new AttachmentError(message.error):null,message.text));
      child.once('error',()=>finish(new AttachmentError('Document processing is unavailable.')));
      child.once('exit',()=>finish(new AttachmentError('Document processing did not finish.')));
      child.send({type,data:buffer.toString('base64')});
    });}finally{children.delete(child);parsing--;}
  }
  return {
    async upload(req,session,context){
      prune();
      if(uploads>=2||records.size+uploads>=32||used()+reserved+MAX_FILE>67108864)throw new AttachmentError('Attachment storage is busy. Remove a file or try again later.',503);
      uploads++;reserved+=MAX_FILE;
      const timer=setTimeout(()=>req.destroy(),15000);
      try{
        let name;try{name=decodeURIComponent(req.headers['x-ned-filename'] ?? '');}catch{throw new AttachmentError('Invalid filename.');}
        const chunks=[];let bytes=0;
        for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_FILE)throw new AttachmentError('Files must be at most 4 MB.',413);chunks.push(chunk);}
        const buffer=Buffer.concat(chunks);const {extension,mime}=validateAttachment(name,req.headers['content-type'],buffer);
        let part;
        if(mime.startsWith('image/')){
          if(bytes>2097152)throw new AttachmentError('Images must be at most 2 MB; all images in one message must total at most 2 MB.',413);
          await extract('image',buffer);
          part={type:'image_url',image_url:{url:`data:${mime};base64,${buffer.toString('base64')}`}};
        }
        else{
          let text;
          if(['pdf','docx'].includes(extension))text=await extract(extension,buffer);
          else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw new AttachmentError('Text files must use UTF-8.');}}
          if(!text.trim()||Buffer.byteLength(text)>131072||[...text].some(char=>char.charCodeAt(0)<32&&!'\t\r\n'.includes(char)))throw new AttachmentError('Document must contain readable text, at most 128 KB.');
          if(extension==='json'){try{JSON.parse(text);}catch{throw new AttachmentError('JSON document is invalid.');}}
          part={type:'text',text:`Attachment: ${name}\n${text}`};
        }
        const id=randomUUID();records.set(id,{name,part,bytes,session,context,created:now(),consumed:false});
        return {id,name,size:bytes};
      }finally{clearTimeout(timer);uploads--;reserved-=MAX_FILE;}
    },
    prepare(ids,session,context,input){
      prune();
      if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length)throw new AttachmentError('Choose up to four attachments.');
      const selected=ids.map(id=>records.get(id));
      if(selected.some(row=>!row||row.session!==session||row.context!==context||row.consumed))throw new AttachmentError('An attachment expired or was already sent. Remove it and attach it again.');
      if(selected.reduce((sum,row)=>sum+row.bytes,0)>16777216)throw new AttachmentError('Attachments exceed 16 MB.',413);
      if(selected.filter(row=>row.part.type==='image_url').reduce((sum,row)=>sum+row.bytes,0)>2097152)throw new AttachmentError('All images in one message must total at most 2 MB.',413);
      const parts=selected.flatMap(row=>row.part.type==='text'?Array.from({length:Math.ceil(row.part.text.length/60000)},(_,index)=>({type:'text',text:row.part.text.slice(index*60000,(index+1)*60000)})):[row.part]);
      return {input:selected.length?[...(input.trim()?[{type:'text',text:input}]:[]),...parts]:input,consume(){for(const row of selected)row.consumed=true;}};
    },
    close(){for(const child of children)child.kill('SIGKILL');records.clear();},
  };
}
