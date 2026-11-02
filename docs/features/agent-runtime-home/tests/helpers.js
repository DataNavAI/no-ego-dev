import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
export {assert,join,resolve};
export const cli=resolve('bin/ned.js');
export function fixture(t){
  const base=mkdtempSync(join(tmpdir(),'ned-agent-integration-'));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const home=join(base,'os'),project=join(base,'project');mkdirSync(home);mkdirSync(project);
  // Deliberately do not inherit runtime, provider, Hub, DB or user config settings.
  const env={PATH:process.env.PATH,HOME:home,PYTHONDONTWRITEBYTECODE:'1'};
  const run=(args,extra={},options={})=>spawnSync(process.execPath,[cli,...args],{cwd:project,env:{...env,...extra},encoding:'utf8',timeout:15000,...options});
  const json=(args,extra={})=>{const result=run([...args,'--json'],extra);assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
  return {base,home,project,env,run,json};
}
export async function startCom(t,f,env){
  const child=spawn(process.execPath,[cli,'com'],{cwd:f.project,env:{...f.env,...env},stdio:['ignore','pipe','pipe']});
  let output='',errors='';child.stderr.on('data',chunk=>{errors+=chunk;});
  const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');await exited;});
  const url=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('COM readiness timeout: '+errors));},10000);
    child.stdout.on('data',chunk=>{output+=chunk;const match=/NEDCOM: (http:\/\/127\.0\.0\.1:\d+)/.exec(output);if(match){clearTimeout(timeout);resolve(match[1]);}});
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`COM exited ${code}: ${errors}`));});
  });
  const health=await fetch(url+'/api/health');assert.equal(health.status,200);
  return {url,async stop(){child.kill('SIGTERM');assert.deepEqual(await exited,{code:0,signal:null});}};
}
