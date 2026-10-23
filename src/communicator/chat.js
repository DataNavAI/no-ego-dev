import {resolveGatewaySettings} from './gateway-settings.js';
import {validateMessagePage} from './public/history.js';
export function createChatGateway(options = {}) {
  const configuredUrl=options.url ?? (options.env ?? process.env).NED_HERMES_URL;
  if (configuredUrl!==undefined && !/^http:\/\/127\.0\.0\.1:[0-9]+\/?$/.test(configuredUrl)) throw new Error('Invalid Hermes gateway origin.');
  return async function chat(req, res, send) {
    const resource = new URL(req.url, 'http://127.0.0.1');
    const match = resource.pathname.match(/^\/api\/chat\/sessions(?:\/([A-Za-z0-9_-]{1,200})\/(messages|chat))?$/);
    if (!match) return send(404, {error:{code:'not_found',message:'Not found.'}});
    const mutation = req.method === 'POST';
    const allowed = match[2] === 'chat' ? mutation : match[2] === 'messages' ? req.method === 'GET' : ['GET','POST'].includes(req.method);
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
    const controller = new AbortController();
    const abort = () => controller.abort();
    res.once('close', abort);
    const timer = setTimeout(abort, match[2] === 'chat' ? 600000 : 15000);
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
        if (!input || Array.isArray(input) || typeof input !== 'object' || (match[2] === 'chat' ? typeof input.input !== 'string' || !input.input.trim() || input.input.length > 8000 || Object.keys(input).some(name => name !== 'input') : Object.keys(input).length)) return send(400,{error:{code:'invalid_input',message:'Invalid chat request.'}});
        body = JSON.stringify(match[2] === 'chat' ? {input:input.input} : {source:'nedcom'});
      }
      const path = match[1] ? `/api/sessions/${match[1]}/${match[2]}` : '/api/sessions';
      const query = mutation ? '' : match[2] === 'messages' ? `?order=latest&limit=50&offset=${offset}` : `?limit=50&offset=${offset}`;
      const upstream = await fetch(origin + path + query,{method:req.method,headers:{Authorization:`Bearer ${key}`,...(mutation ? {'Content-Type':'application/json'} : {})},body,redirect:'error',signal:controller.signal});
      if (!upstream.ok) { await upstream.body?.cancel(); return send(upstream.status === 404 ? 404 : 503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
      const chunks = []; let bytes = 0;
      for await (const chunk of upstream.body) { bytes += chunk.length; if (bytes > 4194304) { controller.abort(); throw new Error('Response too large'); } chunks.push(chunk); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (mutation && !match[1]) {
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(data.session?.id)) throw new Error('Invalid session');
        return send(201,{session:{id:data.session.id}});
      }
      if (mutation) {
        if (typeof data.message?.content !== 'string' || data.status && data.status !== 'completed') throw new Error('Incomplete turn');
        return send(200,{session_id:data.session_id,message:{role:'assistant',content:data.message.content}});
      }
      if (!Array.isArray(data.data) || data.data.length > (match[1] ? 50 : 250)) throw new Error('Invalid page');
      if(match[1])validateMessagePage(data.data);
      return send(200,match[1] ? {data:data.data.map(row => ({id:row.id,role:row.role,content:typeof row.content === 'string' ? row.content : JSON.stringify(row.content)}))} : {data:data.data.filter(row => /^[A-Za-z0-9_-]{1,200}$/.test(row.id)).map(row => ({id:row.id,title:typeof row.title === 'string' ? row.title : 'Untitled chat'})),has_more:data.has_more === true});
    } catch { if (!res.destroyed) return send(503,{error:{code:'gateway_unavailable',message:'Hermes gateway is unavailable.'}}); }
    finally {clearTimeout(timer);res.off('close',abort);}
  };
}
