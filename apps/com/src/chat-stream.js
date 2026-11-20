import {chatActivity} from './chat-activity.js';
const LIMIT=4194304;
export async function readChatStream(upstream,session,onText,{onRun=()=>{},onActivity=()=>{},stopping=()=>false}={}){
  if(!/^text\/event-stream(?:\s*;|$)/i.test(upstream.headers.get('content-type') ?? ''))throw new Error('Streaming unavailable');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let buffer='',event='',data=[],frameBytes=0,wireBytes=0,run='',message='',text='',textBytes=0,final,completed=false,done=false;
  const sequences=new Set();
  function dispatch(){
    if(!data.length){event='';frameBytes=0;return;}
    const payload=JSON.parse(data.join('\n'));data=[];frameBytes=0;
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.session_id!==session||typeof payload.run_id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(payload.run_id)||!Number.isSafeInteger(payload.seq)||payload.seq<1||sequences.has(payload.seq)||sequences.size>=100000)throw new Error('Invalid stream identity');
    sequences.add(payload.seq);
    if(run&&run!==payload.run_id)throw new Error('Invalid run');run=payload.run_id;
    const kind=event;event='';
    if(['tool.started','tool.progress','tool.completed','tool.failed'].includes(kind)&&(!message||payload.message_id!==message))throw new Error('Invalid message');
    const activity=chatActivity(kind,payload.tool_name);if(activity)onActivity(activity);
    if(kind==='run.started')onRun(run);
    if(['run.cancelled','run.interrupted'].includes(kind)&&stopping()){final=text;completed=true;done=true;return;}
    if(kind==='error'||kind==='run.failed'||kind==='run.cancelled')throw new Error('Incomplete stream');
    if(kind==='message.started'){
      if(message||payload.message?.role!=='assistant'||typeof payload.message.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(payload.message.id))throw new Error('Invalid message');
      message=payload.message.id;
    }
    if(['assistant.delta','assistant.completed','run.completed'].includes(kind)){
      if(!message||payload.message_id!==message)throw new Error('Invalid message');
      if(kind==='assistant.delta'){
        if(final!==undefined||typeof payload.delta!=='string')throw new Error('Invalid delta');
        textBytes+=Buffer.byteLength(payload.delta);if(textBytes>LIMIT)throw new Error('Stream too large');text+=payload.delta;onText(text);
      }else if(kind==='assistant.completed'){
        if(final!==undefined||payload.completed!==true||payload.partial!==false||payload.interrupted!==false||typeof payload.content!=='string'||Buffer.byteLength(payload.content)>LIMIT)throw new Error('Incomplete assistant');
        final=payload.content;text='';
      }else{
        if(final===undefined||completed||payload.completed!==true||payload.partial===true||payload.interrupted===true)throw new Error('Incomplete run');completed=true;
      }
    }
    if(kind==='done'){
      if(!completed||final===undefined)throw new Error('Incomplete stream');done=true;
    }
  }
  function line(value){
    if(value===''){dispatch();return;}
    if(value.startsWith(':'))return;
    const separator=value.indexOf(':');
    const field=separator<0?value:value.slice(0,separator);
    let content=separator<0?'':value.slice(separator+1);if(content.startsWith(' '))content=content.slice(1);
    if(field==='event')event=content;
    if(field==='data'){data.push(content);frameBytes+=Buffer.byteLength(content);if(frameBytes>LIMIT)throw new Error('Frame too large');}
  }
  for await(const chunk of upstream.body){
    wireBytes+=chunk.length;if(wireBytes>LIMIT)throw new Error('Stream too large');
    buffer+=decoder.decode(chunk,{stream:true});
    let boundary;
    while((boundary=buffer.search(/[\r\n]/))!==-1){
      if(buffer[boundary]==='\r'&&boundary===buffer.length-1)break;
      const value=buffer.slice(0,boundary);const width=buffer[boundary]==='\r'&&buffer[boundary+1]==='\n'?2:1;
      buffer=buffer.slice(boundary+width);line(value);if(done)return final;
    }
    if(Buffer.byteLength(buffer)>LIMIT)throw new Error('Line too large');
  }
  buffer+=decoder.decode();
  if(buffer.endsWith('\r')){line(buffer.slice(0,-1));buffer='';}
  if(!done||buffer||data.length)throw new Error('Incomplete stream');
  return final;
}
