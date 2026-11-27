import path from 'node:path';
import {createTaskApiClient} from './task-api.js';
const help=`Usage:
  ned dashboard register --port <1024..65535> [--name TEXT] [--replace] [--expected-revision N]
  ned dashboard status
  ned dashboard clear [--expected-revision N]
Options: --project PATH --api URL --database PATH --json
One dashboard per registered project, independent of Preview. Starts no process.
Open Dashboard in NED to view it; localhost links refer to the NED instance.`;
const fail=message=>Object.assign(new Error(message),{code:'invalid_dashboard_command'});
export async function runDashboardCli(argv,io=console,dependencies={}){
  let client;
  try{
    const [action,...flags]=argv;
    if(!action||action==='--help'||action==='help'){io.log(help);return 0;}
    if(!['register','status','clear'].includes(action))throw fail(help);
    const allowed=new Set(['--project','--api','--database','--json',...(action==='register'?['--port','--name','--replace','--expected-revision']:action==='clear'?['--expected-revision']:[])]),options={};
    for(let i=0;i<flags.length;i++){
      const key=flags[i];if(!allowed.has(key)||Object.hasOwn(options,key))throw fail('Unknown or duplicate dashboard option.');
      if(['--json','--replace'].includes(key))options[key]=true;
      else{const value=flags[++i];if(!value||value.startsWith('--'))throw fail(`Missing value for ${key}.`);options[key]=value;}
    }
    if(action==='register'&&(!/^\d{4,5}$/.test(options['--port']??'')||Number(options['--port'])<1024||Number(options['--port'])>65535))throw fail('Use an integer port from1024 to65535.');
    const expected=options['--expected-revision'];if(expected!==undefined&&(!/^(0|[1-9]\d*)$/.test(expected)||!Number.isSafeInteger(Number(expected))))throw fail('Expected revision must be a nonnegative safe integer.');
    client=await(dependencies.dashboardClientFactory??createTaskApiClient)({project:path.resolve(options['--project']??process.cwd()),home:dependencies.home,env:dependencies.env,databaseUrl:options['--database'],api:options['--api']});
    const {projectId}=await(action==='register'?client.initialize():client.getStatus());
    const current=await client.dashboardRequest(projectId,'GET');
    let result=current;
    if(action!=='status'){
      const input={expectedRevision:expected===undefined?current.revision:Number(expected)};
      if(action==='register'){input.port=Number(options['--port']);if(options['--name']!==undefined)input.name=options['--name'];if(options['--replace'])input.replace=true;}
      result=await client.dashboardRequest(projectId,action==='register'?'PUT':'DELETE',input);
    }
    if(options['--json'])io.log(JSON.stringify(result));
    else if(!result.dashboard)io.log(`No product dashboard registered. Revision ${result.revision}.`);
    else io.log(`${result.dashboard.name}: ${result.dashboard.status}. Revision ${result.revision}. Open Dashboard in NED.`);
    return 0;
  }catch(error){io.error(`NED dashboard failed (${error.code??'dashboard_unavailable'}): ${error.message}`);return 2;}
  finally{await client?.close();}
}
