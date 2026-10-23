import http from 'node:http';
import {createChatGateway} from './chat.js';
import {createProjectReader,ProjectError} from './projects.js';
import {readFile} from 'node:fs/promises';
const assets = new Map([['/',['index.html','text/html']],['/styles.css',['styles.css','text/css']],['/app.js',['app.js','text/javascript']],['/state.js',['state.js','text/javascript']],['/chat-ui.js',['chat-ui.js','text/javascript']]]);
assets.set('/chat-entry.js',['chat-entry.js','text/javascript']);
assets.set('/history.js',['history.js','text/javascript']);
const capabilities = {service:'nedcom',readOnly:false,capabilities:{projects:true,tasks:false,artifacts:false,preview:true,chat:true}};
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export function createCommunicatorServer({host = '127.0.0.1', port = 0, databasePath, home, gateway} = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid NEDCOM address.');
  let url = null;
  const projects=createProjectReader({databasePath,home});
  const chat=createChatGateway(gateway);
  const server = http.createServer(async (req,res) => {
    const send = (status,type,body,extra = {}) => { res.writeHead(status,{'content-type':`${type}; charset=utf-8`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':policy,...extra}); res.end(req.method === 'HEAD' ? undefined : body); };
    const error = (status,code,message,extra) => send(status,'application/json',JSON.stringify({error:{code,message}}),extra);
    if (req.headers.host !== `127.0.0.1:${server.address()?.port}` || (req.headers.origin !== undefined && req.headers.origin !== url)) return error(403,'forbidden','Access forbidden.');
    if (req.url.startsWith('/api/chat/')) return chat(req,res,(status,data) => send(status,'application/json',JSON.stringify(data)));
    if (!['GET','HEAD'].includes(req.method)) return error(405,'method_not_allowed','Method not allowed.',{Allow:'GET, HEAD'});
    const path = req.url.split('?')[0];
    if (path === '/api/health') return send(200,'application/json',JSON.stringify({status:'ok',service:'nedcom'}));
    if (path === '/api/capabilities') return send(200,'application/json',JSON.stringify(capabilities));
    if(path === '/api/projects' || path.startsWith('/api/projects/')) {
      const controller=new AbortController();const abort=()=>controller.abort();res.once('close',abort);
      try {
        const result=path === '/api/projects' ? projects.list() : await projects.detail(decodeURIComponent(path.slice('/api/projects/'.length)),controller.signal);
        return send(200,'application/json',JSON.stringify(result));
      } catch(failure) {
        if(failure instanceof ProjectError)return error(failure.status,failure.code,failure.message);
        if(failure instanceof URIError)return error(404,'project_unavailable','Project is unavailable.');
        return error(500,'internal_error','Unable to read project data.');
      } finally {res.off('close',abort);}
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
  }, close() {projects.close();url = null; return new Promise((resolve,reject) => {server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(new Error('Unable to stop NEDCOM.')) : resolve()); server.closeAllConnections();});} };
}
