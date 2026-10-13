import http from 'node:http';
import {readFile} from 'node:fs/promises';
const assets = new Map([['/',['index.html','text/html']],['/styles.css',['styles.css','text/css']],['/app.js',['app.js','text/javascript']],['/state.js',['state.js','text/javascript']]]);
const capabilities = {service:'nedcom',readOnly:true,capabilities:{projects:false,tasks:false,artifacts:false,preview:false}};
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export function createCommunicatorServer({host = '127.0.0.1', port = 0} = {}) {
  if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid NEDCOM address.');
  let url = null;
  const server = http.createServer(async (req,res) => {
    const send = (status,type,body,extra = {}) => { res.writeHead(status,{'content-type':`${type}; charset=utf-8`,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':policy,...extra}); res.end(req.method === 'HEAD' ? undefined : body); };
    const error = (status,code,message,extra) => send(status,'application/json',JSON.stringify({error:{code,message}}),extra);
    if (req.headers.host !== `127.0.0.1:${server.address()?.port}` || (req.headers.origin !== undefined && req.headers.origin !== url)) return error(403,'forbidden','Access forbidden.');
    if (!['GET','HEAD'].includes(req.method)) return error(405,'method_not_allowed','Method not allowed.',{Allow:'GET, HEAD'});
    const path = req.url.split('?')[0];
    if (path === '/api/health') return send(200,'application/json',JSON.stringify({status:'ok',service:'nedcom'}));
    if (path === '/api/capabilities') return send(200,'application/json',JSON.stringify(capabilities));
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
  }, close() {url = null; return new Promise((resolve,reject) => {server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(new Error('Unable to stop NEDCOM.')) : resolve()); server.closeAllConnections();});} };
}
