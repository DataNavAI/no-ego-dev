import {readProjectWork} from './work.js';
import {createSecretsHandler} from './secrets.js';
import http from 'node:http';
import {createActivityStreams} from './activity.js';
import {createChatGateway} from './chat.js';
import {createProjectReader,ProjectError} from './projects.js';
import {readFile} from 'node:fs/promises';
import {requestDiagnostic,requestPhase} from './public/request-diagnostic.js';
const assets = new Map([['/',['index.html','text/html']],['/styles.css',['styles.css','text/css']],['/app.js',['app.js','text/javascript']],['/state.js',['state.js','text/javascript']],['/chat-ui.js',['chat-ui.js','text/javascript']]]);
assets.set('/chat-entry.js',['chat-entry.js','text/javascript']);
assets.set('/history.js',['history.js','text/javascript']);
assets.set('/message-content.js',['message-content.js','text/javascript']);
assets.set('/settings.js',['settings.js','text/javascript']);
assets.set('/settings.css',['settings.css','text/css']);
assets.set('/secret-share.js',['secret-share.js','text/javascript']);
assets.set('/composer-media.js',['composer-media.js','text/javascript']);
assets.set('/pane-resize.js',['pane-resize.js','text/javascript']);
assets.set('/debug-pane.js',['debug-pane.js','text/javascript']);
assets.set('/request-diagnostic.js',['request-diagnostic.js','text/javascript']);
assets.set('/turn-stream.js',['turn-stream.js','text/javascript']);
assets.set('/work-plan.js',['work-plan.js','text/javascript']);
assets.set('/task-references.js',['task-references.js','text/javascript']);
assets.set('/project-work.js',['project-work.js','text/javascript']);
assets.set('/work-entry.js',['work-entry.js','text/javascript']);
assets.set('/activity-ui.js',['activity-ui.js','text/javascript']);
assets.set('/mobile-navigation.js',['mobile-navigation.js','text/javascript']);
assets.set('/conversation.css',['conversation.css','text/css']);
for(const [name,type] of [['webawesome.js','text/javascript'],['webawesome-theme.css','text/css'],['webawesome-LICENSE.txt','text/plain'],['wa-check.svg','image/svg+xml'],['wa-chevron.svg','image/svg+xml']])assets.set('/vendor/'+name,['vendor/'+name,type]);
const vendorAssets=new Map([
  ['/vendor/marked.js',import.meta.resolve('marked')],
  ['/vendor/dompurify.js',new URL('./purify.es.mjs',import.meta.resolve('dompurify')).href],
]);
const capabilities = {service:'nedcom',readOnly:false,capabilities:{projects:true,tasks:true,artifacts:false,preview:true,chat:true}};
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export function createCommunicatorServer({host = '127.0.0.1', port = 0, databasePath, home, gateway,logger,secretsEnabled=true} = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid NEDCOM address.');
  let url = null;
  const secrets=createSecretsHandler({home,enabled:secretsEnabled});
  const projects=createProjectReader({databasePath,home});
  const chat=createChatGateway({...gateway,databasePath,logger});
  const activity=createActivityStreams(databasePath);
  const server = http.createServer(async (req,res) => {
    const phase=requestPhase(req.url),started=Date.now();
    if(phase){let recorded=false;const record=()=>{if(recorded)return;recorded=true;logger?.event('chat_request',requestDiagnostic(phase,{status:res.headersSent?res.statusCode:0,durationMs:Date.now()-started}));};res.once('finish',record);res.once('close',record);}
    const send = (status,type,body,extra = {}) => { res.writeHead(status,{'content-type':`${type}; charset=utf-8`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':policy,...extra}); res.end(req.method === 'HEAD' ? undefined : body); };
    const error = (status,code,message,extra) => send(status,'application/json',JSON.stringify({error:{code,message}}),extra);
    if (req.headers.host !== `127.0.0.1:${server.address()?.port}` || (req.headers.origin !== undefined && req.headers.origin !== url)) return error(403,'forbidden','Access forbidden.');
    if (req.url.startsWith('/api/chat/')) return chat(req,res,(status,data) => send(status,'application/json',JSON.stringify(data)));
    if (req.url === '/api/secrets' || req.url.startsWith('/api/secrets/') || req.url.startsWith('/api/secrets?')) return secrets(req,res,(status,data)=>send(status,'application/json',JSON.stringify(data)),url);
    if (!['GET','HEAD'].includes(req.method)) return error(405,'method_not_allowed','Method not allowed.',{Allow:'GET, HEAD'});
    const path = req.url.split('?')[0];
    if(path==='/api/workspace/events'&&req.method==='GET')return activity.handle(req,res,null);
    if(path==='/api/activity/events'&&req.method==='GET'){
      const id=new URL(req.url,url).searchParams.get('project');
      if(!id||!/^[A-Za-z0-9_-]{1,256}$/.test(id))return error(400,'invalid_project','Project is unavailable.');
      return activity.handle(req,res,id);
    }
    if (path === '/api/health') return send(200,'application/json',JSON.stringify({status:'ok',service:'nedcom'}));
    if (path === '/api/capabilities') return send(200,'application/json',JSON.stringify(capabilities));
    if(path === '/api/projects' || path.startsWith('/api/projects/')) {
      const controller=new AbortController();const abort=()=>controller.abort();res.once('close',abort);
      try {
        const match=/^\/api\/projects\/([^/]+)\/work$/.exec(path);
        const result=match?readProjectWork(databasePath,decodeURIComponent(match[1])):path === '/api/projects' ? projects.list() : await projects.detail(decodeURIComponent(path.slice('/api/projects/'.length)),controller.signal);
        return send(200,'application/json',JSON.stringify(result));
      } catch(failure) {
        if(failure instanceof ProjectError)return error(failure.status,failure.code,failure.message);
        if(failure instanceof URIError)return error(404,'project_unavailable','Project is unavailable.');
        return error(500,'internal_error','Unable to read project data.');
      } finally {res.off('close',abort);}
    }
    if(vendorAssets.has(path)){
      try{return send(200,'text/javascript',await readFile(new URL(vendorAssets.get(path))));}
      catch{return error(500,'internal_error','Unable to read NEDCOM resources.');}
    }
    const asset = assets.get(path);
    if (!asset) return error(404,'not_found','Not found.');
    try { send(200,asset[1],await readFile(new URL(`./public/${asset[0]}`,import.meta.url))); }
    catch { error(500,'internal_error','Unable to read NEDCOM resources.'); }
  });
  return {server, get url() { return url; }, listen() {
    return new Promise((resolve,reject) => {
      const failed = () => {server.off('listening',ready); reject(new Error('Unable to start NEDCOM.'));};
      const ready = () => {server.off('error',failed); url = `http://127.0.0.1:${server.address().port}`; resolve(url);};
      server.once('error',failed); server.once('listening',ready); server.listen(port,host);
    });
  }, close() {chat.close();projects.close();activity.close();url = null; return new Promise((resolve,reject) => {server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(new Error('Unable to stop NEDCOM.')) : resolve()); server.closeAllConnections();});} };
}
