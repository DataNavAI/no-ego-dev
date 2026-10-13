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
  let databasePath;
  try { databasePath = resolveDatabasePath({databaseUrl:options.databaseUrl, env:dependencies.env || process.env, home:dependencies.home}); }
  catch { io.error('NEDCOM: configure a SQLite file path or local file: URL with --database or NED_DATABASE_URL.'); return 2; }
  const signals = dependencies.signals || process;
  let app;
  let stopping = false;
  let finish;
  const stopped = new Promise(resolve => { finish = resolve; });
  const stop = () => { stopping = true; finish(); };
  signals.on('SIGINT',stop); signals.on('SIGTERM',stop);
  try {
    app = (dependencies.createServer || createCommunicatorServer)({port:options.port,databasePath});
    const url = await app.listen();
    if (!stopping) io.log(`NEDCOM: ${url}`);
    await stopped;
    await app.close();
    return 0;
  } catch {
    io.error('NEDCOM could not start or stop. Check the requested port and local resources, then retry.');
    return 1;
  } finally {
    signals.off('SIGINT',stop); signals.off('SIGTERM',stop);
    await app?.close().catch(() => {});
  }
}
