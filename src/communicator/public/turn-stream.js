export async function consumeTurnStream(response,turnId,session,onText,onActivity=()=>{}){
  if(!response.ok||!/^text\/event-stream(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')||!response.body)throw new Error('Unavailable');
  const reader=response.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let buffer='',event='',data=[],cursor=0,text='',terminal,wire=0,activityVersion=0;
  function line(value){
    if(value===''){
      if(data.length){
        const payload=JSON.parse(data.join('\n'));
        if(terminal)throw new Error('Unavailable');
        if(event==='delta'){
          if(payload.cursor!==cursor||typeof payload.text!=='string'||!payload.text.length||payload.text.length>16384||payload.next!==cursor+payload.text.length||payload.next>4194304)throw new Error('Unavailable');
          cursor=payload.next;text+=payload.text;onText(text);
        }else if(event==='activity'){
          if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==4||Object.keys(payload).some(key=>!['turn_id','session_id','version','activity'].includes(key))||payload.turn_id!==turnId||payload.session_id!==session||!Number.isSafeInteger(payload.version)||payload.version<=activityVersion||!['working','thinking','searching','reading','running','writing'].includes(payload.activity))throw new Error('Unavailable');
          activityVersion=payload.version;onActivity(payload.activity);
        }else if(event==='terminal'){
          if(payload.turn?.id!==turnId||!['completed','stopped'].includes(payload.turn.status)||payload.session_id!==session||payload.message?.role!=='assistant'||typeof payload.message.content!=='string'||payload.message.content.length>4194304)throw new Error('Unavailable');
          terminal=payload;
        }else throw new Error('Unavailable');
      }
      event='';data=[];return;
    }
    if(value.startsWith(':'))return;
    const separator=value.indexOf(':');
    const name=separator<0?value:value.slice(0,separator);
    const content=separator<0?'':value.slice(separator+1).replace(/^ /,'');
    if(name==='event')event=content;
    else if(name==='data'){data.push(content);if(data.join('\n').length>25165824)throw new Error('Unavailable');}
  }
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done){buffer+=decoder.decode();break;}
      wire+=value.length;if(wire>67108864)throw new Error('Unavailable');
      buffer+=decoder.decode(value,{stream:true});
      let newline;
      while((newline=buffer.indexOf('\n'))>=0){const value=buffer.slice(0,newline).replace(/\r$/,'');buffer=buffer.slice(newline+1);line(value);}
      if(buffer.length>25165824)throw new Error('Unavailable');
    }
    if(buffer||data.length||!terminal)throw new Error('Unavailable');
    return terminal;
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
