import {createHubCredentialStore,canonicalHubOrigin} from '../hub-credentials.js';
import {readHubConfiguration,startHubConnection} from './hub.js';
import {resolveDatabasePath} from '../database.js';
import {createCommunicatorServer} from './server.js';
const usage = 'Usage: ned com [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--help]';
export async function runCommunicatorCli(flags, io = console, dependencies = {}) {
  const options = {port:0};
  const seen = new Set();
  try {
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      if (!['--port','--database','--help'].includes(flag) || seen.has(flag)) throw new Error();
      seen.add(flag);
      if (flag === '--help') continue;
      const value = flags[++i];
      if (value === undefined || value.startsWith('--')) throw new Error();
      if (flag === '--port') {
        if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error();
        options.port = Number(value);
      } else options.databaseUrl = value;
    }
  } catch { io.error(usage); return 2; }
  if (seen.has('--help')) { io.log(usage); return 0; }
  let hub;
  try {
    let env=dependencies.env||process.env;
    if(env.NED_HUB_URL&&env.NED_HUB_SLUG&&env.NED_HUB_TOKEN===undefined){
      const saved=await (dependencies.hubCredentialStore||createHubCredentialStore({home:dependencies.home})).read(canonicalHubOrigin(env.NED_HUB_URL));
      if(saved)env={...env,NED_HUB_TOKEN:saved.token};
    }
    hub = readHubConfiguration(env);
  }
  catch { io.error('NEDCOM: configure NED_HUB_URL and NED_HUB_SLUG, then run ned hub login or set NED_HUB_TOKEN; NED_HUB_NAME is optional.'); return 2; }
  let databasePath;
  try { databasePath = resolveDatabasePath({databaseUrl:options.databaseUrl, env:dependencies.env || process.env, home:dependencies.home}); }
  catch { io.error('NEDCOM: configure a SQLite file path or local file: URL with --database or NED_DATABASE_URL.'); return 2; }
  const signals = dependencies.signals || process;
  let app,hubConnection;
  let stopping = false;
  let finish;
  const stopped = new Promise(resolve => { finish = resolve; });
  const stop = () => { stopping = true; finish(); };
  signals.on('SIGINT',stop); signals.on('SIGTERM',stop);
  try {
    app = (dependencies.createServer || createCommunicatorServer)({port:options.port,databasePath});
    const url = await app.listen();
    if (!stopping) io.log(`NEDCOM: ${url}`);
    if (hub && !stopping) hubConnection = (dependencies.startHub || startHubConnection)(hub,url,{onStatus:status=>io.log(`NED Hub: ${status}`)});
    await stopped;
    await app.close();
    return 0;
  } catch {
    io.error('NEDCOM could not start or stop. Check the requested port and local resources, then retry.');
    return 1;
  } finally {
    await hubConnection?.close();
    signals.off('SIGINT',stop); signals.off('SIGTERM',stop);
    await app?.close().catch(() => {});
  }
}
