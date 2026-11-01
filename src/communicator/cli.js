import {createComLogger,errorDiagnostic} from './logging.js';
import {createHubCredentialStore,resolveHubOrigin} from '../hub-credentials.js';
import {runHubAuthentication} from '../hub-cli.js';
import {readHubConfiguration,resolveInstanceName,startHubConnection} from './hub.js';
import {resolveDatabasePath} from '../database.js';
import {createCommunicatorServer} from './server.js';
import {startPublicTunnel} from './tunnel.js';
const usage = 'Usage: ned com [--login [--no-browser] | --logout] [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--public] [--help]';
async function runCommunicator(flags, io = console, dependencies = {}) {
  const options = {port:0};
  const seen = new Set();
  try {
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      if (!['--port','--database','--help','--login','--logout','--no-browser','--public'].includes(flag) || seen.has(flag)) throw new Error();
      seen.add(flag);
      if (['--help','--login','--logout','--no-browser','--public'].includes(flag)) continue;
      const value = flags[++i];
      if (value === undefined || value.startsWith('--')) throw new Error();
      if (flag === '--port') {
        if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error();
        options.port = Number(value);
      } else options.databaseUrl = value;
    }
    if((seen.has('--logout')&&seen.size!==1)||(seen.has('--no-browser')&&!seen.has('--login')))throw new Error();
  } catch { io.error(usage); return 2; }
  if (seen.has('--help')) { io.log(usage); return 0; }
  const originalEnv=dependencies.env||process.env;
  try {resolveHubOrigin(originalEnv);resolveInstanceName(originalEnv);}catch(error){io.error(`NEDCOM: ${error.message}`);return 2;}
  if(seen.has('--login')&&originalEnv.NED_HUB_TOKEN!==undefined){io.error('NEDCOM: unset NED_HUB_TOKEN before using --login.');return 2;}
  const signals = dependencies.signals || process;
  let app,hubConnection,tunnel;
  let stopping = false;
  const startup=new AbortController();
  let finish;
  const stopped = new Promise(resolve => { finish = resolve; });
  const stop = signal => { dependencies.logger?.event('shutdown',{signal}); stopping = true; startup.abort(); finish(); };
  const interrupt=()=>stop('SIGINT'),terminate=()=>stop('SIGTERM');
  signals.on('SIGINT',interrupt); signals.on('SIGTERM',terminate);
  try {
    if(seen.has('--login')||seen.has('--logout')){
      const result=await runHubAuthentication(seen.has('--login')?'login':'logout',io,{...dependencies,noBrowser:seen.has('--no-browser')});
      if(result!==0||seen.has('--logout'))return result;
    }
    if(stopping)return 0;
    let hub;
    try {
      let env=originalEnv;
      if(env.NED_HUB_TOKEN===undefined&&(process.platform!=='win32'||dependencies.hubCredentialStore)){
        const saved=await (dependencies.hubCredentialStore||createHubCredentialStore({home:dependencies.home})).read(resolveHubOrigin(env));
        if(saved)env={...env,NED_HUB_TOKEN:saved.token};
      }
      hub = readHubConfiguration(env);
    }
    catch { io.error('NEDCOM: run ned com --login or set NED_HUB_TOKEN; NED_INSTANCE_NAME optionally overrides the hostname. Check private credential permissions.'); return 2; }
    let databasePath;
    try { databasePath = resolveDatabasePath({databaseUrl:options.databaseUrl, env:originalEnv, home:dependencies.home}); }
    catch { io.error('NEDCOM: configure a SQLite file path or local file: URL with --database or NED_DATABASE_URL.'); return 2; }
    if(stopping)return 0;
    app = (dependencies.createServer || createCommunicatorServer)({port:options.port,databasePath,home:dependencies.home,logger:dependencies.logger});
    const url = await app.listen();
    if(seen.has('--public')&&!stopping){
      io.error('WARNING: Public NED COM has no authentication. Anyone with the URL can read projects and Hermes sessions and send messages. Stop with Ctrl+C.');
      tunnel=await (dependencies.startTunnel||startPublicTunnel)(url,{env:dependencies.env||process.env,signal:startup.signal});
      if(!stopping)io.log(`NEDCOM public (unprotected): ${tunnel.url}`);
    }
    if (!stopping) { io.log(`NEDCOM: ${url}`); dependencies.logger?.event('listening',{port:new URL(url).port}); }
    if (hub && !stopping) hubConnection = (dependencies.startHub || startHubConnection)(hub,url,{logger:dependencies.logger,onStatus:status=>{io.log(`NED Hub: ${status}`);dependencies.logger?.event('hub',{status:['online','connecting','offline','reconnecting'].includes(status)?status:'connection-change'});}});
    await (tunnel?Promise.race([stopped,tunnel.failure.then(()=>{throw new Error('Public tunnel stopped.');})]):stopped);
    await app.close();
    return 0;
  } catch(error) {
    dependencies.logger?.event('failure',errorDiagnostic(error));
    if(stopping)return 0;
    io.error('NEDCOM could not start or stop. Check the requested port and local resources, then retry.');
    return 1;
  } finally {
    await hubConnection?.close();
    signals.off('SIGINT',interrupt); signals.off('SIGTERM',terminate);
    await tunnel?.close().catch(()=>{});
    await app?.close().catch(() => {});
  }
}

export async function runCommunicatorCli(flags,io=console,dependencies={}) {
  if(flags.includes('--help')||flags.includes('--logout'))return runCommunicator(flags,io,dependencies);
  let logger;
  try {logger=(dependencies.createLogger||createComLogger)({home:dependencies.logHome||dependencies.home,warn:message=>io.error(message)});}
  catch {io.error('NEDCOM: cannot open private diagnostic logs in ~/.ned/logs. Check ownership and permissions.');return 1;}
  const signals=dependencies.signals||process;
  const fatal=(error,origin)=>logger.event('fatal',{origin:origin==='unhandledRejection'?'unhandledRejection':'uncaughtException',...errorDiagnostic(error)});
  const exit=code=>{logger.event('exit',{code});logger.close();};
  signals.on('uncaughtExceptionMonitor',fatal);signals.on('exit',exit);
  logger.event('startup',{node:process.version});
  io.log(`NEDCOM logs: ${logger.path}`);
  try {
    const code=await runCommunicator(flags,io,{...dependencies,logger});
    logger.event('stopped',{code});return code;
  } catch(error) {logger.event('failure',errorDiagnostic(error));throw error;}
  finally {signals.off('uncaughtExceptionMonitor',fatal);signals.off('exit',exit);logger.close();}
}
