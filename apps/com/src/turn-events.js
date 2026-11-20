export function writeTurnEvents(turn,res,cursor,{admit,release}) {
  if(!admit())return false;
  let blocked=false,closed=false,activityVersion=0;
  const close=()=>{if(closed)return;closed=true;clearInterval(heartbeat);turn.listeners.delete(pump);res.off('drain',drained);res.off('close',close);release();};
  const write=value=>{if(!res.write(value))blocked=true;};
  function pump(){
    if(closed||blocked)return;
    if(turn.status==='pending'&&turn.activityVersion>activityVersion){
      activityVersion=turn.activityVersion;
      write(`event: activity\ndata: ${JSON.stringify({turn_id:turn.id,session_id:turn.session,version:activityVersion,activity:turn.activity})}\n\n`);
    }
    while(cursor<(turn.text?.length ?? 0)&&!blocked){
      const text=turn.text.slice(cursor,cursor+16384);
      write(`event: delta\ndata: ${JSON.stringify({cursor,next:cursor+text.length,text})}\n\n`);cursor+=text.length;
    }
    if(!blocked&&turn.status!=='pending'){
      write(`event: terminal\ndata: ${JSON.stringify({turn:{id:turn.id,status:turn.status},...(turn.result ?? {})})}\n\n`);
      close();res.end();
    }
  }
  const drained=()=>{blocked=false;pump();};
  const heartbeat=setInterval(()=>{if(!blocked&&!closed)write(': heartbeat\n\n');},10000);
  turn.listeners.add(pump);res.on('drain',drained);res.once('close',close);
  res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-accel-buffering':'no'});
  res.flushHeaders();write(': connected\n\n');pump();
  if(res.destroyed)close();
  return true;
}
