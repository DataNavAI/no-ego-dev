import {resolveWorkReferences} from './work-references.js';
import {resolveGatewaySettings} from './gateway-settings.js';
import {validateMessagePage} from './public/history.js';
import {randomUUID,createHash} from 'node:crypto';
import {createAttachmentStore,AttachmentError} from './attachments.js';
import {readHistoryPage} from './chat-history.js';
import {readChatStream} from './chat-stream.js';
import {writeTurnEvents} from './turn-events.js';
import {requestDiagnostic,requestPhase} from './public/request-diagnostic.js';
export function createChatGateway(options = {}) {
  const fixedSession={id:'nedcom-main',title:'NED Chat',source:'api_server'};
  const turns=new Map();
  let waiting=0;
  let subscribers=0;
  function notify(turn){
    clearTimeout(turn.notifyTimer);delete turn.notifyTimer;
    for(const wake of turn.waiters)wake();
    for(const update of turn.listeners)update();
  }
  function changed(turn){
    if(!turn.notifyTimer)turn.notifyTimer=setTimeout(()=>notify(turn),50);
  }
  const now=options.now ?? Date.now;
  const attachments=createAttachmentStore({now});
  const context=(origin,key)=>createHash('sha256').update(JSON.stringify([origin,key])).digest('hex');
  function prune(){for(const [id,turn] of turns)if(turn.status!=='pending' && now()-turn.finished>=900000)turns.delete(id);}
  const configuredUrl=options.url ?? (options.env ?? process.env).NED_HERMES_URL;
  if (configuredUrl!==undefined && !/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(configuredUrl)) throw new Error('Invalid Hermes gateway origin.');
  const chat=async function(req, res, send) {
    const resource = new URL(req.url, 'http://127.0.0.1');
    const fixed=resource.pathname==='/api/chat/sessions/fixed';
    const match = resource.pathname.match(/^\/api\/chat\/sessions(?:\/([A-Za-z0-9_-]{1,200})\/(messages|chat|turns|attachments)(?:\/([a-f0-9-]{36})(\/(?:events|stop))?)?)?$/);
    if (!match && !fixed) return send(404, {error:{code:'not_found',message:'Not found.'}});
    const mutation = req.method === 'POST';
    if(fixed && !mutation)return send(405,{error:{code:'method_not_allowed',message:'Method not allowed.'}});
    if(!fixed&&Boolean(match[3])!==(match[2]==='turns'))return send(404,{error:{code:'not_found',message:'Not found.'}});
    const upload=match?.[2]==='attachments';
    const stopping=match?.[4]==='/stop';
    const allowed = fixed || match[2] === 'chat'||upload||stopping ? mutation : ['messages','turns'].includes(match[2]) ? req.method === 'GET' : ['GET','POST'].includes(req.method);
    if (!allowed) return send(405, {error:{code:'method_not_allowed',message:'Method not allowed.'}});
    if (mutation && (!req.headers.origin || !upload&&req.headers['content-type'] !== 'application/json')) return send(403,{error:{code:'forbidden',message:'Access forbidden.'}});
    const polling=!fixed&&match[2]==='turns';
    const parameter=polling?'cursor':'offset';
    let offset = resource.searchParams.get(parameter) ?? '0';
    const wait=polling&&resource.searchParams.get('wait')==='1';
    if (!/^\d{1,7}$/.test(offset) || Number(offset) > (polling?4194304:1000000) || resource.searchParams.has('wait')&&!wait || [...resource.searchParams.keys()].some(name => name !== parameter && !(polling&&name==='wait'))) return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
    offset = Number(offset);
    let origin,key;
    try {
      const settings=await resolveGatewaySettings(options);
      if(!/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(settings.url)||!settings.key)throw new Error();
      origin=new URL(settings.url).origin;key=settings.key;
    } catch {return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});}
    prune();
    const identity=context(origin,key);
    if(upload){
      if(!req.headers['content-type'])return send(400,{error:{code:'invalid_attachment',message:'Choose a supported file type.'}});
      try{return send(201,{attachment:await attachments.upload(req,match[1],identity)});}
      catch(error){return send(error instanceof AttachmentError?error.status:400,{error:{code:'invalid_attachment',message:error instanceof AttachmentError?error.message:'Attachment could not be processed.'}});}
    }
    if(!fixed&&match[2]==='turns'){
      const turn=turns.get(match[3]);
      if(!turn||turn.session!==match[1]||turn.context!==identity)return send(404,{error:{code:'not_found',message:'Turn is unavailable. Reload the session.'}});
      if(stopping){
        if(resource.search)return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        let bytes=0;const chunks=[];
        for await(const chunk of req){bytes+=chunk.length;if(bytes>32)return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});chunks.push(chunk);}
        if(Buffer.concat(chunks).toString('utf8')!=='{}')return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        if(turn.status!=='pending')return send(200,{turn:{id:turn.id,status:turn.status}});
        if(!turn.stopPromise)turn.stopPromise=(async()=>{
          const deadline=Date.now()+5000;
          while(turn.status==='pending'&&!turn.stopAccepted&&Date.now()<deadline){
            if(turn.run){
              const response=await fetch(`${origin}/v1/runs/${encodeURIComponent(turn.run)}/stop`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(2000)});
              if(response.ok){
                const chunks=[];let bytes=0;
                for await(const chunk of response.body){bytes+=chunk.length;if(bytes>4096)throw new Error('Invalid stop response');chunks.push(chunk);}
                const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
                if(result.run_id!==turn.run||!['stopping','completed','failed','cancelled','interrupted'].includes(result.status))throw new Error('Invalid stop response');
                turn.stopAccepted=['stopping','cancelled','interrupted'].includes(result.status);return;
              }
              await response.body?.cancel();if(response.status!==409)throw new Error('Stop unavailable');
            }
            await new Promise(resolve=>setTimeout(resolve,100));
          }
          if(turn.status==='pending'&&!turn.stopAccepted)throw new Error('Stop unavailable');
        })().finally(()=>{delete turn.stopPromise;});
        try{await turn.stopPromise;return send(200,{turn:{id:turn.id,status:turn.status==='pending'&&turn.stopAccepted?'stopping':turn.status}});}
        catch{return send(503,{error:{code:'stop_unavailable',message:'Response could not be stopped.'}});}
      }
      if(match[4]){
        if(wait||offset>(turn.text?.length ?? 0))return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        if(!writeTurnEvents(turn,res,offset,{admit:()=>{if(turn.listeners.size>=4||subscribers>=64)return false;subscribers++;return true;},release:()=>subscribers--}))return send(429,{error:{code:'stream_limit',message:'Too many chat streams.'}});
        return;
      }
      if(offset>(turn.text?.length ?? 0)&&(turn.status==='pending'||wait&&turn.status==='completed'))return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
      if(wait&&turn.status==='pending'&&offset===(turn.text?.length ?? 0)){
        if(turn.waiters.size>=4||waiting>=64)return send(429,{error:{code:'poll_limit',message:'Too many chat status requests.'}});
        await new Promise(resolve=>{
          waiting++;
          const wake=()=>{clearTimeout(timeout);res.off('close',wake);turn.waiters.delete(wake);waiting--;resolve();};
          const timeout=setTimeout(wake,10000);turn.waiters.add(wake);res.once('close',wake);
          if(res.destroyed)wake();
        });
        if(res.destroyed)return;
      }
      const delta=turn.text?.slice(offset,offset+16384) ?? '';
      return send(200,{turn:{id:turn.id,status:turn.status},...((turn.status==='pending'&&turn.text!==undefined||wait&&turn.status==='completed'&&delta)?{stream:{cursor:offset,next:offset+delta.length,text:delta}}:{}),...(turn.result ?? {})});
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    if(fixed||match[2]!=='chat')res.once('close', abort);
    const timer = setTimeout(abort, !fixed&&match[2] === 'chat' ? 600000 : 15000);
    try {
      let body,prepared;
      if (mutation) {
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 32768) return send(413,{error:{code:'input_too_large',message:'Message is too large.'}});
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}}); }
        if (!input || Array.isArray(input) || typeof input !== 'object' || (fixed ? Object.keys(input).length : match[2] === 'chat' ? typeof input.input !== 'string' || input.input.length > 8000 || !input.input.trim()&&!input.attachments?.length&&!input.references?.length || Object.keys(input).some(name => !['input','attachments','references'].includes(name)) : Object.keys(input).length)) return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        if(!fixed&&match[2]==='chat'){
          let contextualInput;
          try{contextualInput=resolveWorkReferences(input.references,input.input,options.databasePath);}
          catch{return send(400,{error:{code:'invalid_reference',message:'Task reference is unavailable. Remove it and try again.'}});}
          try{prepared=attachments.prepare(input.attachments ?? [],match[1],identity,contextualInput);}
          catch(error){return send(400,{error:{code:'invalid_attachment',message:error.message}});}
        }
        body = JSON.stringify(fixed ? fixedSession : match[2] === 'chat' ? {input:prepared.input} : {source:'nedcom'});
      }
      let turn;
      if(!fixed&&match[2]==='chat'){
        if([...turns.values()].some(existing=>existing.session===match[1]&&existing.origin===origin&&existing.status==='pending'))return send(409,{error:{code:'turn_pending',message:'Hermes is responding.'}});
        if(turns.size>=16)return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});
        turn={id:randomUUID(),session:match[1],origin,context:identity,status:'pending',activity:'working',activityVersion:1,abort,waiters:new Set(),listeners:new Set()};turns.set(turn.id,turn);
        prepared.consume();
      }
      const finish=(status,data)=>{
        if(!turn)return send(status,data);
        turn.status=status===200?(turn.stopAccepted?'stopped':'completed'):'failed';turn.result=data;turn.finished=now();delete turn.abort;
        if(status!==200)delete turn.text;
        notify(turn);
      };
      const execute=async()=>{
      try {
      if(fixed){
        const read=async(method,path,payload)=>{
          const upstream=await fetch(origin+path,{method,headers:{Authorization:`Bearer ${key}`,...(payload?{'Content-Type':'application/json'}:{})},body:payload,redirect:'error',signal:controller.signal});
          if(!upstream.ok){await upstream.body?.cancel();return {status:upstream.status};}
          const chunks=[];let bytes=0;
          for await(const chunk of upstream.body){bytes+=chunk.length;if(bytes>4194304){controller.abort();throw new Error('Response too large');}chunks.push(chunk);}
          return {status:upstream.status,data:JSON.parse(Buffer.concat(chunks).toString('utf8'))};
        };
        const valid=result=>result?.data?.session?.id===fixedSession.id&&result.data.session.source===fixedSession.source&&result.data.session.title===fixedSession.title;
        let result=await read('GET',`/api/sessions/${fixedSession.id}`);
        if(result.status===404){
          result=await read('POST','/api/sessions',body);
          if(result.status===409)result=await read('GET',`/api/sessions/${fixedSession.id}`);
        }
        if(![200,201].includes(result.status)||!valid(result))throw new Error('Invalid fixed session');
        return send(200,{session:fixedSession});
      }
      const path = match[1] ? `/api/sessions/${match[1]}/${match[2]}${turn?'/stream':''}` : '/api/sessions';
      if(!mutation&&match[2]==='messages')return send(200,await readHistoryPage({origin,session:match[1],offset,key,signal:controller.signal}));
      const query = mutation ? '' : match[2] === 'messages' ? `?order=latest&limit=50&offset=${offset}` : `?limit=50&offset=${offset}`;
      const upstream = await fetch(origin + path + query,{method:req.method,headers:{Authorization:`Bearer ${key}`,...(mutation ? {'Content-Type':'application/json'} : {})},body,redirect:'error',signal:controller.signal});
      if (!upstream.ok) { await upstream.body?.cancel(); return finish(upstream.status === 404 ? 404 : 503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
      if(turn){
        const content=await readChatStream(upstream,turn.session,text=>{turn.text=text;changed(turn);},{onRun:run=>{turn.run=run;},onActivity:activity=>{if(turn.activity!==activity){turn.activity=activity;turn.activityVersion++;changed(turn);}},stopping:()=>turn.stopAccepted});
        return finish(200,{session_id:turn.session,message:{role:'assistant',content}});
      }
      const chunks = []; let bytes = 0;
      for await (const chunk of upstream.body) { bytes += chunk.length; if (bytes > 4194304) { controller.abort(); throw new Error('Response too large'); } chunks.push(chunk); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (mutation && !match[1]) {
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(data.session?.id)) throw new Error('Invalid session');
        return send(201,{session:{id:data.session.id}});
      }
      if (!Array.isArray(data.data) || data.data.length > (match[1] ? 50 : 250)) throw new Error('Invalid page');
      if(match[1])validateMessagePage(data.data);
      return send(200,match[1] ? {data:data.data.map(row => ({id:row.id,role:row.role,content:row.content ?? '',...(row.tool_name!==undefined?{tool_name:row.tool_name}:{}),...(typeof row.name==='string'?{name:row.name}:{}),...(row.tool_calls!==undefined?{tool_calls:row.tool_calls}:{}),...(row.tool_call_id!==undefined?{tool_call_id:row.tool_call_id}:{})}))} : {data:data.data.filter(row => /^[A-Za-z0-9_-]{1,200}$/.test(row.id)).map(row => ({id:row.id,title:typeof row.title === 'string' ? row.title : 'Untitled chat'})),has_more:data.has_more === true});
      }catch(error) {const phase=requestPhase(req.url);if(phase)options.logger?.event('chat_failure',requestDiagnostic(phase,{status:503,error}));controller.abort();return finish(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});}
      finally {clearTimeout(timer);res.off('close',abort);}
      };
      if(turn){send(202,{turn:{id:turn.id,status:'pending'}});void execute();return;}
      return await execute();
    } catch { if (!res.destroyed) return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
    finally {if(fixed||match[2]!=='chat'||![...turns.values()].some(turn=>turn.abort===abort)){clearTimeout(timer);res.off('close',abort);}}
  };
  chat.close=()=>{for(const turn of turns.values()){turn.abort?.();turn.status='failed';notify(turn);}turns.clear();attachments.close();};
  return chat;
}
