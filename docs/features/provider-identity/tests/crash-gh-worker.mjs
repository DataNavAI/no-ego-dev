import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {createGithubCliAuth} from '../../../../src/github-cli-auth.js';
const [home,control]=process.argv.slice(2);
const cli=createGithubCliAuth({home,env:{PATH:process.env.PATH},spawn:(command,args,options)=>spawn(process.execPath,[resolve('docs/features/provider-identity/tests/fake-gh.mjs'),control,...args],options)});
await cli.start({login:'fixture-user'},Date.now()+60000,'crash-owned');
process.stdout.write('ready\n');
setInterval(()=>{},1000);
