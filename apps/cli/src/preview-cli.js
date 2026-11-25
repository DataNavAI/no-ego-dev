import path from 'node:path';
import {createTaskApiClient} from './task-api.js';

const usage=`Usage:
  ned preview register --port <1024..65535> [--name <label>] [--project <directory>] [--replace] [--expected-revision <N>] [--json]
  ned preview status [--json]
  ned preview clear [--expected-revision <N>] [--json]
  Options: --api <loopback-NED-API-origin>, --database <SQLite-path>, --json
One active preview per selected agent home. Register starts no process.
Delivery is currently an instance-local link; private embedded/remote tunneling is not available.`;
const fail=message=>Object.assign(new Error(message),{code:'invalid_preview_command'});
export async function runPreviewCli(argv,io=console,dependencies={}){
  if(argv.length===0||argv.length===1&&['--help','-h','help'].includes(argv[0])){io.log(usage);return 0;}
  let client;
  try{
    const [action,...flags]=argv;if(!['register','status','clear'].includes(action))throw fail('Use register, status or clear.');
    const options={},allowed=new Set(['--api','--database','--json',...(action==='register'?['--port','--name','--project','--replace','--expected-revision']:action==='clear'?['--expected-revision']:[])]);
    for(let i=0;i<flags.length;i++){
      const key=flags[i];if(!allowed.has(key)||Object.hasOwn(options,key))throw fail('Unknown or duplicate preview option.');
      if(['--replace','--json'].includes(key))options[key]=true;
      else{const value=flags[++i];if(!value||value.startsWith('--'))throw fail(`Missing value for ${key}.`);options[key]=value;}
    }
    if(action==='register'&&(!/^\d{4,5}$/.test(options['--port']||'')||Number(options['--port'])<1024||Number(options['--port'])>65535))throw fail('Use an integer port from1024 to65535.');
    const expected=options['--expected-revision'];if(expected!==undefined&&(!/^(0|[1-9]\d*)$/.test(expected)||!Number.isSafeInteger(Number(expected))))throw fail('Expected revision must be a nonnegative safe integer.');
    client=await (dependencies.previewClientFactory??createTaskApiClient)({home:dependencies.home,env:dependencies.env,databaseUrl:options['--database'],api:options['--api']});
    let result;
    if(action==='status')result=await client.previewRequest('GET');
    else{
      const expectedRevision=expected===undefined?(await client.previewRequest('GET')).revision:Number(expected);
      const input=action==='clear'?{expectedRevision}:{project:path.resolve(options['--project']??process.cwd()),port:Number(options['--port']),...(options['--name']===undefined?{}:{name:options['--name']}),expectedRevision,...(options['--replace']?{replace:true}:{})};
      result=await client.previewRequest(action==='clear'?'DELETE':'PUT',input);
    }
    if(options['--json'])io.log(JSON.stringify(result));
    else if(!result.preview)io.log(`No active preview. Revision ${result.revision}.`);
    else io.log(`${result.preview.name}: ${result.preview.status}. Revision ${result.revision}. Instance-local link: ${result.preview.localUrl}\nRemote/embedded preview delivery is not available.`);
    return 0;
  }catch(error){io.error(`NED preview failed (${error.code??'preview_unavailable'}): ${error.message}`);return 2;}
  finally{await client?.close();}
}
