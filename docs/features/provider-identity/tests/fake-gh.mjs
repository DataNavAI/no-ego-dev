import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
const [control,...args]=process.argv.slice(2),root=dirname(control),callsFile=join(root,'calls.json');
const calls=existsSync(callsFile)?JSON.parse(readFileSync(callsFile,'utf8')):[];
calls.push({args,home:process.env.HOME,configParent:dirname(process.env.GH_CONFIG_DIR),ambient:Boolean(process.env.GH_TOKEN||process.env.GITHUB_TOKEN||process.env.SSH_AUTH_SOCK)});writeFileSync(callsFile,JSON.stringify(calls));
if(args[0]==='auth'&&args[1]==='login'){
 const mode=JSON.parse(readFileSync(control,'utf8')).mode;
 if(mode==='oversized'){process.stderr.write('x'.repeat(40000));process.exit(1);}
 if(mode==='failed'){process.stderr.write('synthetic private error');process.exit(1);}
 if(mode!=='silent'){process.stderr.write('! First copy your one-time code: ABCD-');
 process.stderr.write('1234\nOpen this URL to continue in your web browser: '+(mode==='bad-url'?'https://evil.invalid/':'https://github.com/login/device')+'\n');}
 const timer=setInterval(()=>{const state=JSON.parse(readFileSync(control,'utf8')).mode;if(state==='approved'||state==='wrong-user'||state==='hang-api'){clearInterval(timer);writeFileSync(join(process.env.GH_CONFIG_DIR,'hosts.yml'),'synthetic private credential');process.exit(0);}},10);
}else if(args[0]==='api'&&JSON.parse(readFileSync(control,'utf8')).mode==='hang-api')setInterval(()=>{},1000);
else if(args[0]==='api')process.stdout.write(JSON.stringify({login:JSON.parse(readFileSync(control,'utf8')).mode==='wrong-user'?'other-user':'fixture-user',id:42}));
else if(args[0]==='auth'&&args[1]==='token')process.stdout.write('synthetic-gh-selected-token\n');
else process.exit(1);
