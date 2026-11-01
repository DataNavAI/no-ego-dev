export function streamEvents(session,content='Synthetic reply'){
  const base={session_id:session,run_id:'run_synthetic'};
  return [
    ['run.started',{}],
    ['message.started',{message:{id:'msg_synthetic',role:'assistant'}}],
    ['assistant.delta',{message_id:'msg_synthetic',delta:content}],
    ['assistant.completed',{message_id:'msg_synthetic',content,completed:true,partial:false,interrupted:false}],
    ['run.completed',{message_id:'msg_synthetic',completed:true}],
    ['done',{}],
  ].map(([event,data],index)=>({event,data:{...base,seq:index+1,...data}}));
}
export function streamFrame({event,data}){return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;}
export function endStream(response,session,content){
  response.setHeader('Content-Type','text/event-stream');
  response.end(streamEvents(session,content).map(streamFrame).join(''));
}
