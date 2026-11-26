import http from 'node:http';
import {chmod, lstat, unlink} from 'node:fs/promises';
import {readFileSync, readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createManagedMaintenance} from '../../apps/core/src/maintenance.js';

const socketPath = '/tmp/ned-local-maintenance.sock';
const actions = new Set(['status', 'prepare', 'commit', 'release']);
const scriptPath = '/opt/ned/scripts/container/local-maintenance.mjs';
const serviceNames = new Set(['main-hermes', 'dashboard', 'ned-com', 'profile-gateways',
  's6-linux-init-shutdownd', 's6rc-fdholder', 's6rc-oneshot-runner', 'gateway-default', 'gateway-default/log']);
const supervisorCommands = new Set([
  '/package/admin/s6/command/s6-svscan -d4 -- /run/service',
  '/bin/sh -e /run/s6/basedir/scripts/rc.init top /opt/hermes/docker/main-wrapper.sh sleep infinity',
  's6-svscan /run/hermes-service',
  'sleep infinity',
]);

function inspectProcesses() {
  try {
    const entries = readdirSync('/proc').filter(value => /^\d+$/.test(value));
    if (entries.length > 128) return {idle: false, reason: 'unknown_activity'};
    for (const pid of entries) {
      if (Number(pid) === process.pid) continue;
      try {
        const args = readFileSync('/proc/' + pid + '/cmdline', 'utf8').split('\0').slice(0, -1);
        if (args.length === 0) {
          const stat = readFileSync('/proc/' + pid + '/stat', 'utf8');
          if (stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3) === 'Z') continue;
        }
        if (supervisorCommands.has(args.join(' '))) continue;
        if (args[0] === 's6-supervise' && args.length === 2 && serviceNames.has(args[1])) continue;
        if (['s6-log', '/package/admin/s6/command/s6-ipcserverd',
          '/package/admin/s6-linux-init/command/s6-linux-init-shutdownd'].includes(args[0])) continue;
        if (args[0] === 'node' && ['/opt/ned/scripts/container/health.mjs', scriptPath].includes(args[1])) continue;
        if (args[0] === '/opt/hermes/.venv/bin/python' && args[1] === '-P' &&
            args[2] === '-c' && args[3]?.includes('from hermes_cli.main import main; sys.exit(main())') &&
            ['dashboard', 'gateway'].includes(args[4])) continue;
        return {idle: false, reason: 'active_command'};
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    return {idle: true};
  } catch {
    return {idle: false, reason: 'unknown_activity'};
  }
}

export async function localMaintenance({env, databasePath, path = socketPath, clock, processInspector = inspectProcesses} = {}) {
  if (env.NED_LOCAL_MAINTENANCE !== '1') return null;
  const maintenance = createManagedMaintenance({env, databasePath, clock, inspectProcesses: processInspector, resetQuietClock: true});
  if (!maintenance.supported) throw new Error('Invalid local maintenance identity.');
  const server = http.createServer(async (req, res) => {
    const action = req.url.slice(1);
    try {
      if (req.method !== 'POST' || !actions.has(action)) throw new Error();
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 2048) throw new Error();
      }
      res.end(JSON.stringify(maintenance[action](JSON.parse(body))));
    } catch (error) {
      res.writeHead(error.status || 400);
      res.end(JSON.stringify({error: error.code || 'invalid_request'}));
    }
  });
  try {
    const old = await lstat(path).catch(error => {if (error.code !== 'ENOENT') throw error;});
    if (old) {
      if (!old.isSocket() || old.uid !== process.getuid()) throw new Error('Unsafe local maintenance socket.');
      await unlink(path);
    }
    const umask = process.umask(0o177);
    try {
      await new Promise((resolve, reject) => {server.once('error', reject); server.listen(path, resolve);});
    } finally { process.umask(umask); }
    await chmod(path, 0o600);
  } catch (error) {
    server.close();
    maintenance.close();
    throw error;
  }
  return {maintenance, async close() {
    await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
    maintenance.close();
  }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, body] = process.argv.slice(2);
  if (!actions.has(action) || !body) process.exit(2);
  const response = await new Promise((resolve, reject) => {
    const request = http.request({socketPath, path: '/' + action, method: 'POST', signal: AbortSignal.timeout(5000)}, reply => {
      let data = '';
      reply.setEncoding('utf8');
      reply.on('data', value => {data += value;});
      reply.on('end', () => resolve({status: reply.statusCode, data}));
      reply.on('error', reject);
    });
    request.on('error', reject);
    request.end(body);
  });
  if (response.status !== 200) process.exitCode = 1;
  console.log(response.data);
}
