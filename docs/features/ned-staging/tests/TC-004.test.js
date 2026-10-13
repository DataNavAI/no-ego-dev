import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fixture,A,B} from './fixtures.js';
import {createStagingController} from '../../../../src/staging/controller.js';

test('TC-004: active owner work defers updates and blocks removal without signals',async t=>{
 const f=await fixture(t);await f.controller.setup();await fs.mkdir(path.join(f.root,'session-locks'));await fs.writeFile(path.join(f.root,'session-locks/owner.json'),JSON.stringify({pid:process.pid,process_start:execFileSync('/bin/ps',['-p',String(process.pid),'-o','lstart='],{encoding:'utf8'}).trim()}));f.setMain(B);assert.equal((await f.controller.update()).result,'deferred');await assert.rejects(f.controller.remove(),/Finish/);assert.equal((await f.controller.status()).active.sha,A);await fs.unlink(path.join(f.root,'session-locks/owner.json'));assert.equal((await f.controller.update()).sha,B);
});
test('TC-004: concurrent controllers serialize; retirement keeps user data by default',async t=>{
 const f=await fixture(t);await f.controller.setup();let unblock;const held=new Promise(resolve=>unblock=resolve);let entered;const reached=new Promise(resolve=>entered=resolve);f.setMain(B);const first=createStagingController(f.options,{...f.dependencies,prepare:async sha=>{entered();await held;await f.prepare(sha);}});const update=first.update();await reached;await assert.rejects(f.controller.update(),/busy/);unblock();await update;assert.equal((await f.controller.status()).active.sha,B);assert.equal((await f.controller.remove()).data_retained,true);assert.equal(f.task(),'Stage task');assert.equal((await fs.stat(f.profile)).isDirectory(),true);
});
test('TC-004: root replacement and unknown locks never authorize mutation',async t=>{
 const f=await fixture(t);await f.controller.setup();await fs.writeFile(path.join(f.root,'controller.lock'),JSON.stringify({pid:99999999}));await assert.rejects(f.controller.update(),/Unknown/);await fs.unlink(path.join(f.root,'controller.lock'));await fs.rename(path.join(f.root,'work'),path.join(f.root,'saved-work'));await fs.symlink(path.join(f.root,'saved-work'),path.join(f.root,'work'));await assert.rejects(f.controller.update(),/replaced/);assert.equal(f.task(),'Stage task');
});
