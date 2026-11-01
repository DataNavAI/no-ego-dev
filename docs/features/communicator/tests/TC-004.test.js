import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {EventEmitter} from 'node:events';
import {createServer} from 'node:http';
import {runCli} from '../../../../src/cli.js';
const entry = fileURLToPath(new URL('../../../../bin/ned.js',import.meta.url));
function launch(args, home, extra = {}, executable = entry) {
  const child = spawn(process.execPath,[executable,...args],{env:{PATH:process.env.PATH,HOME:home,...extra},stdio:['ignore','pipe','pipe']});
  let stdout = '', stderr = '';
  let readyResolve, readyReject;
  const ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
  const timer = setTimeout(() => {child.kill('SIGKILL');readyReject(new Error('startup deadline'));},8000);
  child.stdout.on('data', chunk => {stdout+=chunk;const url=stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];if(url){clearTimeout(timer);readyResolve(url);}});
  child.stderr.on('data', chunk => {stderr+=chunk;});
  const lifetime = setTimeout(() => child.kill('SIGKILL'),12000);
  const ended = new Promise((resolve,reject) => {child.once('error',reject);child.once('close',(code,signal) => {clearTimeout(timer);clearTimeout(lifetime);readyResolve(null);resolve({code,signal,stdout,stderr});});});
  return {child,ready,ended};
}
test('TC-004: public command lifecycle, invalid input and unchanged filesystem',async t => {
  const home=await mkdtemp(join(tmpdir(),'nedcom-cli-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const db=join(home,'sentinel.sqlite');await writeFile(db,'unchanged');
  const children=[];t.after(async()=>{for(const p of children){if(p.child.exitCode===null)p.child.kill('SIGKILL');await p.ended;}});
  const start=(args,env)=>{const p=launch(args,home,env);children.push(p);return p;};
  let port;
  for(const signal of ['SIGINT','SIGTERM']) {
    await t.test(`live health and ${signal} release/restart`,async()=>{
      const p=start(['com','--port',String(port||0),'--database',pathToFileURL(db).href],{NED_DATABASE_URL:'https://invalid.example/db'});
      const url=await p.ready;assert.ok(url);port=Number(new URL(url).port);
      assert.equal(p.child.exitCode,null);assert.deepEqual(await (await fetch(`${url}/api/health`)).json(),{status:'ok',service:'nedcom'});
      assert.equal((await fetch(url)).status,200);assert.ok(!(await (await fetch(`${url}/api/capabilities`)).text()).includes(home));
      p.child.kill(signal);assert.equal((await p.ended).code,0);
    });
  }
  await t.test('default ephemeral and missing database do not create files',async()=>{const p=start(['com']);assert.ok(await p.ready);p.child.kill('SIGTERM');assert.equal((await p.ended).code,0);});
  for(const args of [['--port','-1'],['--port','1.5'],['--port','65536'],['--port'],['--unknown'],['--port','0','--port','0'],['--database','https://remote/db'],['--database','']]) {
    await t.test(`reject ${JSON.stringify(args)}`,async()=>{const p=start(['com',...args]);const result=await p.ended;assert.equal(result.code,2);assert.ok(result.stderr);assert.ok(!result.stdout.includes('http://'));});
  }
  const bad=start(['com'],{NED_DATABASE_URL:'https://remote/db'});assert.equal((await bad.ended).code,2);
  for(const args of [['com','--help'],['--help']]){const p=start(args);const result=await p.ended;assert.equal(result.code,0);assert.match(result.stdout,/ned com/);assert.ok(!result.stdout.includes('http://'));}
  const blocker=createServer();await new Promise(resolve=>blocker.listen(0,'127.0.0.1',resolve));
  try {const p=start(['com','--port',String(blocker.address().port)]);const result=await p.ended;assert.equal(result.code,1);assert.match(result.stderr,/port/);assert.ok(!result.stdout.includes('http://'));} finally {await new Promise(resolve=>blocker.close(resolve));}
  assert.equal(await readFile(db,'utf8'),'unchanged');assert.deepEqual((await readdir(home)).sort(),['.ned','sentinel.sqlite']);
});
test('TC-004: database precedence reaches shared server options without provider setup',async t=>{
  const logHome=await mkdtemp(join(tmpdir(),'com-log-precedence-'));t.after(()=>rm(logHome,{recursive:true,force:true}));
  for(const [flags,env,expected] of [[['--database','/explicit.sqlite'],{NED_DATABASE_URL:'https://invalid'},'/explicit.sqlite'],[[],{NED_DATABASE_URL:'file:///environment.sqlite'},'/environment.sqlite'],[[],{},'/synthetic/.ned/ned.sqlite']]) {
    const signals=new EventEmitter();let received;
    const code=await runCli(['com',...flags],{log(){},error(){assert.fail('unexpected error');}},{env,home:'/synthetic',logHome,signals,createServer(options){received=options;return {async listen(){queueMicrotask(()=>signals.emit('SIGINT'));return 'http://127.0.0.1:1234';},async close(){}};},appFactory(){assert.fail('provider constructed');},telemetry:{capture(){assert.fail('telemetry');}}});
    assert.equal(code,0);assert.equal(received.databasePath,expected);assert.equal(received.port,0);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
  }
});

test('TC-004: installed launcher forwards both shutdown signals without credentials',async t => {
  const home=await mkdtemp(join(tmpdir(),'nedcom-launcher-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const generation=join(home,'.local/share/ned/current/app/bin');await mkdir(generation,{recursive:true});
  const cli=new URL('../../../../src/cli.js',import.meta.url).href;
  await writeFile(join(generation,'ned.js'),`import {runCli} from ${JSON.stringify(cli)}; process.exitCode=await runCli(process.argv.slice(2));`);
  const executable=fileURLToPath(new URL('../../../../bin/ned-launcher.js',import.meta.url));
  const module=fileURLToPath(new URL('../../../../src/launcher.js',import.meta.url));
  for(const signal of ['SIGINT','SIGTERM']) {
    const p=launch(['com'],home,{NED_LAUNCHER_MODULE:module},executable);
    t.after(async()=>{if(p.child.exitCode===null)p.child.kill('SIGKILL');await p.ended;});
    const url=await p.ready;assert.ok(url);assert.equal((await fetch(`${url}/api/health`)).status,200);
    p.child.kill(signal);assert.equal((await p.ended).code,0);
    await assert.rejects(fetch(`${url}/api/health`));
  }
});
