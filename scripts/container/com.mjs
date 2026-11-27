import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {constants, open} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {createCommunicatorServer} from '../../src/communicator/server.js';
import {readHubConfiguration, startHubConnection} from '../../apps/com/src/hub.js';
import {localMaintenance} from './local-maintenance.mjs';
import {nedApiPath} from '../../apps/core/src/api-paths.js';
import {containerAwsIdentityAllowed} from '../../src/identity-store.js';

async function hubConfiguration(env) {
  const file = env.NED_HUB_TOKEN_FILE;
  if (file === undefined) return null;
  try {
    if (!isAbsolute(file) || env.NED_HUB_TOKEN !== undefined || !env.NED_INSTANCE_NAME)
      throw new Error();
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.uid !== process.getuid() || stat.mode & 0o077 || stat.size > 520)
        throw new Error();
      const buffer = Buffer.alloc(521);
      const {bytesRead} = await handle.read(buffer);
      if (bytesRead > 520) throw new Error();
      return readHubConfiguration({...env, NED_HUB_TOKEN: buffer.subarray(0, bytesRead).toString('utf8').trim()});
    } finally {
      await handle.close();
    }
  } catch {
    throw new Error('Container Hub registration requires a private token file and stable instance name.');
  }
}

export async function startContainerCom({origin = 'http://127.0.0.1:8787', port = 8787, host = '0.0.0.0', databasePath,home,env=process.env, createServer = createCommunicatorServer, connectHub = startHubConnection, onHubStatus,identityOptions,gateway,modelSetup} = {}) {
  const publicUrl = new URL(origin);
  if (publicUrl.protocol !== 'http:' || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash || !['127.0.0.1','localhost'].includes(publicUrl.hostname)) throw new Error('NED_COM_ORIGIN must be a loopback HTTP origin.');
  const explicit=env.NED_COM_USERNAME!==undefined||env.NED_COM_PASSWORD!==undefined;
  if(explicit&&(!env.NED_COM_USERNAME||!env.NED_COM_PASSWORD))throw new Error('Configure both COM username and password.');
  const username=explicit?env.NED_COM_USERNAME:env.HERMES_DASHBOARD_BASIC_AUTH_USERNAME,password=explicit?env.NED_COM_PASSWORD:env.HERMES_DASHBOARD_BASIC_AUTH_PASSWORD;
  const hub = await hubConfiguration(env);
  const hubAwsIdentity = Boolean(hub && containerAwsIdentityAllowed(env));
  const local = await localMaintenance({env, databasePath});
  const blockedAppPorts=[port,Number(publicUrl.port||80),9119];
  const upstream = createServer({blockedAppPorts,localAppOrigin:publicUrl.origin,identityEnabled:false,hubAwsIdentity,identityOptions,gateway,modelSetup,databasePath,home,env,maintenance:local?.maintenance,basicCredentials:username&&password?{username,password}:undefined});
  const internal = new URL(await upstream.listen().catch(async error => {await local?.close(); throw error;}));
  const appHost=req=>{const match=/^pv-[a-f0-9]{32}\.localhost(?::([0-9]+))?$/.exec(req.headers.host??'');return Boolean(match)&&Number(match[1]??80)===Number(publicUrl.port||80);};
  const server = http.createServer(async(req,res) => {
    if(appHost(req))try{if(await upstream.privateApp?.(req,res))return;}catch{res.destroy();return;}
    const localOrigin = 'http://127.0.0.1:' + server.address().port;
    const localCli = hubAwsIdentity && req.method === 'POST' && req.url === '/api/v1/identity/aws/request'
      && ['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
      && req.headers.host === new URL(localOrigin).host && req.headers.origin === localOrigin;
    const identityRoute = nedApiPath(req.url).family === 'identity';
    if ((!localCli && (req.headers.host !== publicUrl.host || (req.headers.origin !== undefined && req.headers.origin !== publicUrl.origin)))
        || !req.url.startsWith('/') || req.url.startsWith('//') || (hubAwsIdentity && identityRoute && !localCli)) {
      res.writeHead(403, {'content-type':'application/json'}); res.end(JSON.stringify({error:{code:'forbidden'}})); return;
    }
    const headers = {...req.headers, host:internal.host};
    if (headers.origin !== undefined) headers.origin = internal.origin;
    const forward = http.request({hostname:internal.hostname,port:internal.port,path:req.url,method:req.method,headers}, response => {
      res.writeHead(response.statusCode,response.headers); response.pipe(res);
    });
    forward.setTimeout(/\/chat\/|\/events(?:\?|$)/.test(req.url) ? 610000 : 5000, () => forward.destroy());
    forward.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    res.on('close', () => forward.destroy());
    req.pipe(forward);
  });
  server.on('upgrade',async(req,socket,head)=>{
    try{if(appHost(req)&&await upstream.privateApp?.(req,socket,head))return;}catch{socket.destroy();return;}
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  });
  let connection;
  try {
    await new Promise((resolve,reject) => {server.once('error',reject); server.listen(port,host,resolve);});
    blockedAppPorts.push(server.address().port);
    if (hub) connection = connectHub(hub, internal.origin, {
      apiCredential: () => upstream.apiCredential,
      hubAwsIdentity,
      preview: upstream.preview,
      dashboards: upstream.dashboards,
      onRegistered: registration => upstream.setHubRegistration(registration),
      onStatus: onHubStatus,
    });
  } catch (error) {
    await new Promise(resolve => server.close(resolve));
    await upstream.close();
    await local?.close();
    throw error;
  }
  return {server,get apiCredential(){return upstream.apiCredential;}, async close() {
    await connection?.close();
    const listenerClosed=new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
    // Upgraded app sockets are owned by delivery, not closeAllConnections().
    await upstream.close();
    await listenerClosed;
    await local?.close();
  }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startContainerCom({origin:process.env.NED_COM_ORIGIN, databasePath:process.env.NED_DATABASE_URL,
    onHubStatus: status => console.log('NED Hub: ' + status)});
  let stopping = false;
  const stop = async () => {if (stopping) return; stopping = true; await app.close();};
  process.on('SIGTERM',stop); process.on('SIGINT',stop);
  console.log('NEDCOM container service listening on 8787');
}
