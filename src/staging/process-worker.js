import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
const shell=process.argv[2]==='--shell',root=path.resolve(process.argv[3]);
let recordPath,record,child,parentLost=false,completed=false;
async function identity(pid){try{return (await run('/bin/ps',['-p',String(pid),'-o','lstart='],{timeout:3000})).stdout.trim();}catch{return null;}}
async function save(){const p=recordPath+'.tmp',f=await fs.open(p,'wx',0o600);try{await f.writeFile(JSON.stringify(record));await f.sync();}finally{await f.close();}await fs.rename(p,recordPath);const dir=await fs.open(path.dirname(recordPath),'r');try{await dir.sync();}finally{await dir.close();}}
async function register(role){const dir=path.join(root,'processes');const stat=await fs.lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink()||await fs.realpath(dir)!==dir)throw new Error('Unsafe process ownership path.');for(const rel of ['npm','npm/cache','npm/user.npmrc','npm/global.npmrc']){const p=path.join(root,rel),s=await fs.lstat(p);if(s.isSymbolicLink()||(!s.isDirectory()&&!s.isFile())||await fs.realpath(p)!==p)throw new Error('Unsafe npm runtime path.');}const pgid=Number((await run('/bin/ps',['-p',String(process.pid),'-o','pgid='],{timeout:3000})).stdout.trim());if(pgid!==process.pid)throw new Error('Unowned shell process group.');recordPath=path.join(dir,crypto.randomUUID()+'.json');record={version:1,pid:process.pid,process_start:await identity(process.pid),pgid,parent_pid:process.ppid,parent_start:await identity(process.ppid),role,state:'starting'};await save();}
async function groupMembers(){const output=(await run('/bin/ps',['-axo','pid=,pgid='],{timeout:3000})).stdout;return output.trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number)).filter(([pid,pgid])=>pgid===record.pgid&&pid!==process.pid).map(([pid])=>pid);}
async function start(request){await register(shell?'shell':'operation');if(process.send)process.send({ready:true,record:recordPath});
 if(parentLost||await identity(record.parent_pid)!==record.parent_start)throw new Error('Launcher ended before owned execution.');
 if(shell){try{await fs.lstat(path.join(root,'controller.lock'));throw new Error('Staging mutation excludes shell launch.');}catch(error){if(error.code!=='ENOENT')throw error;}}
 child=spawn(request.executable,request.args,{env:process.env,cwd:request.cwd||process.cwd(),stdio:shell?'inherit':['inherit','pipe','pipe']});const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});if(!shell){child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);}record.state='running';record.child_pid=child.pid;record.child_start=await identity(child.pid);await save();
 const exit=await exited;
 const members=await groupMembers();record.state=parentLost?'orphaned_completed':members.length?'descendants_active':'finished';record.exit_code=exit.code;record.child_exit_signal=exit.signal;await save();completed=true;process.exitCode=exit.code??1;if(!shell&&process.connected)process.disconnect();
}
if(shell){const args=process.argv.slice(4);let command,rest;if(['-c','-lc','-lic','-ic'].includes(args[0])){command=args[1];rest=args.slice(2);}else if(args[0]==='-l'&&args[1]==='-c'){command=args[2];rest=args.slice(3);}else{console.error('Unsupported stage shell invocation');process.exit(2);}try{await start({executable:'/bin/bash',args:['--noprofile','--norc','-c',command,...rest]});}catch{console.error('Stage shell ownership failed');process.exitCode=2;}}
else {
 process.on('disconnect',()=>{if(completed)return;parentLost=true;if(!record){process.exit(1);}else {record.state='orphaned';void save();}});
 process.on('message',message=>{if(message.signal&&child){child.kill(message.signal);return;}if(message.start){void start(message).catch(async()=>{if(record){record.state='failed';await save().catch(()=>{});}process.exitCode=1;process.disconnect();});}});
}
