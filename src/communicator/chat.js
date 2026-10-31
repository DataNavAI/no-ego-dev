import {resolveGatewaySettings} from './gateway-settings.js';
import {readHistoryPage} from './chat-history.js';
import {randomUUID,createHash} from 'node:crypto';
export function createChatGateway(options = {}) {
  const fixedSession={id:'nedcom-main',title:'NED Chat',source:'api_server'};
  const turns=new Map();
  const now=options.now ?? Date.now;
  const context=(origin,key)=>createHash('sha256').update(JSON.stringify([origin,key])).digest('hex');
  function prune(){for(const [id,turn] of turns)if(turn.status!=='pending' && now()-turn.finished>=900000)turns.delete(id);}
  const configuredUrl=options.url ?? (options.env ?? process.env).NED_HERMES_URL;
  if (configuredUrl!==undefined && !/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(configuredUrl)) throw new Error('Invalid Hermes gateway origin.');
  const chat=async function(req, res, send) {
    const resource = new URL(req.url, 'http://127.0.0.1');
    const fixed=resource.pathname==='/api/chat/sessions/fixed';
    const match = resource.pathname.match(/^\/api\/chat\/sessions(?:\/([A-Za-z0-9_-]{1,200})\/(messages|chat|turns)(?:\/([a-f0-9-]{36}))?)?$/);
    if (!match && !fixed) return send(404, {error:{code:'not_found',message:'Not found.'}});
    const mutation = req.method === 'POST';
    if(fixed && !mutation)return send(405,{error:{code:'method_not_allowed',message:'Method not allowed.'}});
    if(!fixed&&Boolean(match[3])!==(match[2]==='turns'))return send(404,{error:{code:'not_found',message:'Not found.'}});
    const allowed = fixed || match[2] === 'chat' ? mutation : ['messages','turns'].includes(match[2]) ? req.method === 'GET' : ['GET','POST'].includes(req.method);
    if (!allowed) return send(405, {error:{code:'method_not_allowed',message:'Method not allowed.'}});
    if (mutation && (!req.headers.origin || req.headers['content-type'] !== 'application/json')) return send(403,{error:{code:'forbidden',message:'Access forbidden.'}});
    let offset = resource.searchParams.get('offset') ?? '0';
    if (!/^\d{1,7}$/.test(offset) || Number(offset) > 1000000 || [...resource.searchParams.keys()].some(name => name !== 'offset')) return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
    offset = Number(offset);
    let origin,key;
    try {
      const settings=await resolveGatewaySettings(options);
      if(!/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(settings.url)||!settings.key)throw new Error();
      origin=new URL(settings.url).origin;key=settings.key;
    } catch {return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});}
    prune();
    const identity=context(origin,key);
    if(!fixed&&match[2]==='turns'){
      const turn=turns.get(match[3]);
      if(!turn||turn.session!==match[1]||turn.context!==identity)return send(404,{error:{code:'not_found',message:'Turn is unavailable. Reload the session.'}});
      return send(200,{turn:{id:turn.id,status:turn.status},...(turn.result ?? {})});
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    if(fixed||match[2]!=='chat')res.once('close', abort);
    const timer = setTimeout(abort, !fixed&&match[2] === 'chat' ? 600000 : 15000);
    try {
      let body;
      if (mutation) {
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 32768) return send(413,{error:{code:'input_too_large',message:'Message is too large.'}});
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}}); }
        if (!input || Array.isArray(input) || typeof input !== 'object' || (fixed ? Object.keys(input).length : match[2] === 'chat' ? typeof input.input !== 'string' || !input.input.trim() || input.input.length > 8000 || Object.keys(input).some(name => name !== 'input') : Object.keys(input).length)) return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        body = JSON.stringify(fixed ? fixedSession : match[2] === 'chat' ? {input:input.input} : {source:'nedcom'});
      }
      let turn;
      if(!fixed&&match[2]==='chat'){
        if([...turns.values()].some(existing=>existing.session===match[1]&&existing.origin===origin&&existing.status==='pending'))return send(409,{error:{code:'turn_pending',message:'Hermes is responding.'}});
        if(turns.size>=16)return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});
        turn={id:randomUUID(),session:match[1],origin,context:identity,status:'pending',abort};turns.set(turn.id,turn);
      }
      const finish=(status,data)=>{
        if(!turn)return send(status,data);
        turn.status=status===200?'completed':'failed';turn.result=data;turn.finished=now();delete turn.abort;
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
      const path = match[1] ? `/api/sessions/${match[1]}/${match[2]}` : '/api/sessions';
      if(!mutation&&match[2]==='messages')return send(200,await readHistoryPage({origin,session:match[1],offset,key,signal:controller.signal}));
      const query = mutation ? '' : match[2] === 'messages' ? `?order=latest&limit=50&offset=${offset}` : `?limit=50&offset=${offset}`;
      const upstream = await fetch(origin + path + query,{method:req.method,headers:{Authorization:`Bearer ${key}`,...(mutation ? {'Content-Type':'application/json'} : {})},body,redirect:'error',signal:controller.signal});
      if (!upstream.ok) { await upstream.body?.cancel(); return finish(upstream.status === 404 ? 404 : 503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
      const chunks = []; let bytes = 0;
      for await (const chunk of upstream.body) { bytes += chunk.length; if (bytes > 4194304) { controller.abort(); throw new Error('Response too large'); } chunks.push(chunk); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (mutation && !match[1]) {
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(data.session?.id)) throw new Error('Invalid session');
        return send(201,{session:{id:data.session.id}});
      }
      if(turn){
        if (data.session_id!==turn.session || typeof data.message?.content !== 'string' || data.status && data.status !== 'completed') throw new Error('Incomplete turn');
        return finish(200,{session_id:turn.session,message:{role:'assistant',content:data.message.content}});
      }
      if (!Array.isArray(data.data) || data.data.length > (match[1] ? 50 : 250)) throw new Error('Invalid page');
      return send(200,{data:data.data.filter(row => /^[A-Za-z0-9_-]{1,200}$/.test(row.id)).map(row => ({id:row.id,title:typeof row.title === 'string' ? row.title : 'Untitled chat'})),has_more:data.has_more === true});
      }catch {controller.abort();return finish(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}});}
      finally {clearTimeout(timer);res.off('close',abort);}
      };
      if(turn){send(202,{turn:{id:turn.id,status:'pending'}});void execute();return;}
      return await execute();
    } catch { if (!res.destroyed) return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
    finally {if(fixed||match[2]!=='chat'||![...turns.values()].some(turn=>turn.abort===abort)){clearTimeout(timer);res.off('close',abort);}}
  };
  chat.close=()=>{for(const turn of turns.values()){turn.abort?.();turn.status='failed';}turns.clear();};
  return chat;
}
