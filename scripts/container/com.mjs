import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createCommunicatorServer} from '../../src/communicator/server.js';

export async function startContainerCom({origin = 'http://127.0.0.1:8787', port = 8787, host = '0.0.0.0', databasePath, createServer = createCommunicatorServer} = {}) {
  const publicUrl = new URL(origin);
  if (publicUrl.protocol !== 'http:' || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash || !['127.0.0.1','localhost'].includes(publicUrl.hostname)) throw new Error('NED_COM_ORIGIN must be a loopback HTTP origin.');
  const upstream = createServer({databasePath});
  const internal = new URL(await upstream.listen());
  const server = http.createServer((req,res) => {
    if (req.headers.host !== publicUrl.host || (req.headers.origin !== undefined && req.headers.origin !== publicUrl.origin) || !req.url.startsWith('/') || req.url.startsWith('//')) {
      res.writeHead(403, {'content-type':'application/json'}); res.end(JSON.stringify({error:{code:'forbidden'}})); return;
    }
    const headers = {...req.headers, host:internal.host};
    if (headers.origin !== undefined) headers.origin = internal.origin;
    const forward = http.request({hostname:internal.hostname,port:internal.port,path:req.url,method:req.method,headers}, response => {
      res.writeHead(response.statusCode,response.headers); response.pipe(res);
    });
    forward.setTimeout(req.url.startsWith('/api/chat/') ? 610000 : 5000, () => forward.destroy());
    forward.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    res.on('close', () => forward.destroy());
    req.pipe(forward);
  });
  try {
    await new Promise((resolve,reject) => {server.once('error',reject); server.listen(port,host,resolve);});
  } catch (error) { await upstream.close(); throw error; }
  return {server, async close() {
    await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
    await upstream.close();
  }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startContainerCom({origin:process.env.NED_COM_ORIGIN, databasePath:process.env.NED_DATABASE_URL});
  let stopping = false;
  const stop = async () => {if (stopping) return; stopping = true; await app.close();};
  process.on('SIGTERM',stop); process.on('SIGINT',stop);
  console.log('NEDCOM container service listening on 8787');
}
