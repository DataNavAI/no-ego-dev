import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { startCom } from '../../src/com/server.js';
import { runCli } from '../../src/cli.js';
const cli = new URL('../../bin/ned.js',import.meta.url);
test('CLI help advertises serve and COM links without starting a server', async () => {
 const out=[], io={log:x=>out.push(x),error:x=>assert.fail(x)};
 for (const args of [['--help'],['serve','--help'],['com','--help']]) {
  assert.equal(await runCli(args,io),0);
  assert.match(out.at(-1),/ned serve --root/);
  assert.match(out.at(-1),/ned com link/);
 }
});
async function fixture(t) {const root=await mkdtemp(join(tmpdir(),'com-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('CLI requires explicit root and COM link verifies live receipt and encoded path', async t => {
 const root=await fixture(t), state=join(root,'.receipt.json'), path=join(root,'한 글 #%.md'); await writeFile(path,'# Output');
 const out=[],err=[];const io={log:x=>out.push(x),error:x=>err.push(x)};
 assert.equal(await runCli(['serve','--local'],io),2);assert.match(err.join(' '),/root/);
 const app=await startCom({root,local:true,state}); t.after(()=>app.close());
 assert.equal((await stat(state)).mode & 0o777,0o600);
 const receipt=JSON.parse(await readFile(state,'utf8'));assert.equal(receipt.status,'running');
 assert.equal(await runCli(['com','link',path,'--state',state],io),0);
 const url=new URL(out.at(-1));assert.equal(url.searchParams.get('artifact'),'한 글 #%.md');assert.equal(url.pathname,`/s/${receipt.capability}/`);
 assert.equal(await runCli(['com','link',join(root,'auth.json'),'--state',state],io),2);
 await app.close();assert.equal(await runCli(['com','link',path,'--state',state],io),2);assert.match(err.at(-1),/stale|running|unavailable/i);
});

test('tunnel missing binary, early exit and timeout fail clearly without orphan server or receipt', async t => {
 const root=await fixture(t), state=join(root,'.receipt.json');
 await assert.rejects(startCom({root,state,cloudflared:'/nonexistent/ned-cloudflared'}),/cloudflared.*not found|install.*cloudflared/i);
 const exit=join(root,'.exit');await writeFile(exit,'#!/bin/sh\nexit 1\n',{mode:0o700});
 // A real child must be scheduled/reaped under the full parallel suite. A 300ms
 // deadline races host load, not exit handling (a stalled parent reproduces it).
 // Keep the early-exit assertion strict; test the short timeout separately below.
 await assert.rejects(startCom({root,state,cloudflared:exit,tunnelTimeoutMs:5000}),/tunnel.*exit/i);
 const hang=join(root,'.hang');await writeFile(hang,'#!/bin/sh\nexec sleep 30\n',{mode:0o700});
 await assert.rejects(startCom({root,state,cloudflared:hang,tunnelTimeoutMs:100}),/timed out/i);
 await assert.rejects(readFile(state),{code:'ENOENT'});
});

test('real CLI SIGTERM stops listener and invalidates receipt', async t => {
 const root=await fixture(t),state=join(root,'.receipt.json');
 const child=spawn(process.execPath,[cli.pathname,'serve','--root',root,'--local','--port','0','--state',state],{stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 let output='';child.stdout.on('data',data=>output+=data);let errors='';child.stderr.on('data',data=>errors+=data);
 const receipt=await new Promise((yes,no)=>{const deadline=Date.now()+5000;const poll=async()=>{try{yes(JSON.parse(await readFile(state,'utf8')));}catch{if(Date.now()>deadline)no(new Error('No receipt: '+errors));else setTimeout(poll,25);}};poll();});
 assert.equal(receipt.status,'running');assert.equal((await fetch(receipt.localOrigin+`/s/${receipt.capability}/api/artifacts`)).status,200);
 const exited=new Promise(yes=>child.once('exit',yes));child.kill('SIGTERM');await exited;
 assert.equal(JSON.parse(await readFile(state,'utf8')).status,'stopped');
 await assert.rejects(fetch(receipt.localOrigin));assert.ok(output.includes('Read-only'));
});
