import {resolveDatabasePath} from '../../../src/database.js';
import {createCoreServer} from './index.js';

const usage='Usage: ned core serve [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--help]';
export async function runCoreCli(flags,io=console,dependencies={}){
  if(flags.length===1&&['--help','-h'].includes(flags[0])){io.log(usage);return 0;}
  if(flags[0]!=='serve'){io.error(usage);return 2;}
  const options={port:0},seen=new Set();
  try{
    for(let index=1;index<flags.length;index++){
      const flag=flags[index];
      if(!['--port','--database','--help'].includes(flag)||seen.has(flag))throw new Error();seen.add(flag);
      if(flag==='--help')continue;
      const value=flags[++index];if(!value||value.startsWith('--'))throw new Error();
      if(flag==='--port'){if(!/^\d+$/.test(value)||Number(value)>65535)throw new Error();options.port=Number(value);}
      else options.databaseUrl=value;
    }
  }catch{io.error(usage);return 2;}
  if(seen.has('--help')){io.log(usage);return 0;}
  const signals=dependencies.signals||process;
  let app,finish;const stopped=new Promise(resolve=>{finish=resolve;});
  const stop=()=>finish();signals.on('SIGINT',stop);signals.on('SIGTERM',stop);
  try{
    const env=dependencies.env||process.env,home=dependencies.home;
    const databasePath=resolveDatabasePath({databaseUrl:options.databaseUrl,home,env});
    app=await(dependencies.createServer||createCoreServer)({port:options.port,databasePath,home,env});
    io.log(`NED Core: ${await app.listen()} (NED API v1; private operator bearer required; automatic dispatch disabled)`);
    await stopped;return 0;
  }catch{io.error('NED Core could not start or stop. Check local configuration and private storage.');return 1;}
  finally{signals.off('SIGINT',stop);signals.off('SIGTERM',stop);await app?.close();}
}
