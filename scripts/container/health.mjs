import http from 'node:http';
import {pathToFileURL} from 'node:url';

function readHealth(url,headers,timeout) {
  return new Promise((resolve,reject) => {
    // fetch ignores Host overrides in the pinned Node runtime. COM must receive
    // its configured external authority while we connect to its internal port.
    const request = http.get(url,{headers,signal:AbortSignal.timeout(timeout)}, response => {
      response.setEncoding('utf8');
      let body = '';
      response.on('data', chunk => {body += chunk;});
      response.on('error',reject);
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) throw new Error('Health HTTP failure');
          resolve(JSON.parse(body));
        } catch (error) { reject(error); }
      });
    });
    request.on('error',reject);
  });
}

export async function checkContainerHealth({dashboardUrl = 'http://127.0.0.1:9119/api/health', comUrl = 'http://127.0.0.1:8787/api/health', origin = process.env.NED_COM_ORIGIN || 'http://127.0.0.1:8787', timeout = 3000} = {}) {
  const checks = [
    [dashboardUrl, undefined, data => data.ok === true && data.auth_required === true],
    [comUrl, {Host:new URL(origin).host}, data => data.status === 'ok' && data.service === 'nedcom'],
  ];
  for (const [url,headers,valid] of checks) {
    if (!valid(await readHealth(url,headers,timeout))) throw new Error('Invalid health payload');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await checkContainerHealth(); } catch { process.exitCode = 1; }
}
