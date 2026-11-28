import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,readdir,rm,rename,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createGithubCliAuth} from '../../../../src/github-cli-auth.js';

async function fixture(t,mode='approve',options={}){
 const home=await mkdtemp(join(tmpdir(),'ned-gh-cli-'));t.after(()=>rm(home,{recursive:true,force:true}));
 const control=join(home,'control.json');await writeFile(control,JSON.stringify({mode}));
 const launch=(command,args,options)=>{assert.equal(command,'gh');return spawn(process.execPath,[resolve('docs/features/provider-identity/tests/fake-gh.mjs'),control,...args],options);};
 const cli=createGithubCliAuth({home,env:{PATH:process.env.PATH,GH_TOKEN:'ambient-must-not-be-used',GITHUB_TOKEN:'ambient-other',GH_CONFIG_DIR:'/unrelated'},spawn:launch,startupMs:2000,killGraceMs:100,...options});t.after(()=>cli.close());
 return {home,control,cli,async setMode(mode){await writeFile(control+'.next',JSON.stringify({mode}));await rename(control+'.next',control);},async calls(){return JSON.parse(await readFile(join(home,'calls.json'),'utf8'));},async directories(){try{return await readdir(join(home,'.ned','github-auth'));}catch{return [];}}};
}

test('TC-009: GitHub CLI login isolates authority, verifies account and cleans transient credentials',async t=>{
 const f=await fixture(t);const state=await f.cli.start({login:'fixture-user'},Date.now()+60000,'request-one');
 assert.equal(state.url,'https://github.com/login/device');assert.equal(state.userCode,'ABCD-1234');assert.equal(f.cli.isBusy(),true);
 await f.setMode('approved');
 let result;await testWait(async()=>{result=await f.cli.poll(state);return typeof result==='object';});
 assert.deepEqual(result,{identity:{login:'fixture-user',id:42},token:'synthetic-gh-selected-token',expiresAt:null});
 assert.equal(f.cli.isBusy(),false);assert.deepEqual(await f.directories(),[]);
 const calls=await f.calls();assert.deepEqual(calls.map(x=>x.args),[['auth','login','--hostname','github.com','--git-protocol','https','--web','--insecure-storage','--skip-ssh-key'],['api','user','--hostname','github.com'],['auth','token','--hostname','github.com']]);
 for(const call of calls){assert.equal(call.ambient,false);assert.equal(call.home,call.configParent);assert.ok(call.home.startsWith(f.home));}
});

async function testWait(check){for(let i=0;i<500;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,10));}assert.fail('Fixture did not reach its observable boundary');}

for(const mode of ['wrong-user','bad-url','oversized','failed'])test(`TC-009: ${mode} never yields a credential`,async t=>{
 const f=await fixture(t,mode);
 if(mode==='wrong-user'){
  const state=await f.cli.start({login:'fixture-user'},Date.now()+60000,'wrong-user');await f.setMode(mode);
  await assert.rejects(testWait(async()=>{const result=await f.cli.poll(state);return typeof result==='object';}),/GitHub|identity/i);
 }else await assert.rejects(f.cli.start({login:'fixture-user'},Date.now()+60000,mode),/GitHub/i);
 await f.cli.close();assert.deepEqual(await f.directories(),[]);
});

test('TC-009: cancellation, expiry and missing executable remove owned work without fallback',async t=>{
 const f=await fixture(t);const state=await f.cli.start({login:'fixture-user'},Date.now()+60000,'cancel');f.cli.cancel('cancel');await f.cli.close();assert.deepEqual(await f.directories(),[]);await assert.rejects(f.cli.poll(state),/GitHub/i);
 const missing=createGithubCliAuth({home:f.home,env:{PATH:''},startupMs:100});t.after(()=>missing.close());await assert.rejects(missing.start({login:'fixture-user'},Date.now()+60000,'missing'),/GitHub/i);await missing.close();assert.deepEqual(await f.directories(),[]);
});

test('TC-009: served GitHub CLI modal confirms the selected identity without an app client',async t=>{
 const f=await fixture(t);let now=Date.now(),loginClosed;const loginFinished=new Promise(resolve=>{loginClosed=resolve;});const {browserChat,expect}=await import('../../communicator/tests/browser-chat-fixture.js');const {createCommunicatorServer}=await import('../../ned-api/tests/auth-client.js');
 const g=await browserChat(t,{identityOptions:{clock:()=>now,githubCliFactory:options=>createGithubCliAuth({...options,spawn:(command,args,opts)=>{const child=spawn(process.execPath,[resolve('docs/features/provider-identity/tests/fake-gh.mjs'),f.control,...args],opts);if(args[0]==='auth'&&args[1]==='login')child.once('close',loginClosed);return child;}})},startApp:async options=>{const app=createCommunicatorServer({...options,hubAwsIdentity:true});await app.listen();return app;}});await g.ready();
 await g.page.locator('#chat-tools-toggle').click();await g.page.getByRole('button',{name:'Connect GitHub',exact:true}).click();const modal=g.page.getByRole('dialog',{name:'Connect GitHub'});
 await expect(modal.getByLabel('GitHub username')).toBeVisible();await expect(modal.getByLabel('AWS access portal URL')).toHaveCount(0);await modal.getByLabel('GitHub username').fill('fixture-user');await modal.getByRole('button',{name:'Get sign-in code'}).click();
 await expect(modal).toContainText('ABCD-1234');await expect(modal.getByRole('link',{name:'Open GitHub sign-in'})).toHaveAttribute('href','https://github.com/login/device');await f.setMode('approved');await loginFinished;now+=2000;await modal.getByRole('button',{name:'Check approval'}).click();await expect(modal).toContainText('Verified fixture-user');
 await expect(modal).not.toContainText('synthetic-gh-selected-token');await modal.getByRole('button',{name:'Confirm connection'}).click();await expect(modal).toBeHidden();
 const {createIdentityStore}=await import('../../../../src/identity-store.js');const stored=createIdentityStore(g.home,process.env).get('github');assert.equal(stored.identity.login,'fixture-user');assert.equal(stored.token,'synthetic-gh-selected-token');assert.equal((await g.page.locator('#transcript').textContent()).includes('ABCD-1234'),false);assert.deepEqual(g.errors,[]);
});

test('TC-009: cancel during startup and expire an active request without publishing credentials',async t=>{
 const f=await fixture(t,'silent');const starting=f.cli.start({login:'fixture-user'},Date.now()+60000,'startup');const rejected=assert.rejects(starting,/GitHub/i);await testWait(async()=>{try{return (await f.calls()).length>0;}catch{return false;}});f.cli.cancel('startup');await rejected;await f.cli.close();assert.deepEqual(await f.directories(),[]);
 let now=Date.now();const expired=await fixture(t,'approve',{clock:()=>now});const state=await expired.cli.start({login:'fixture-user'},now+10000,'expiring');now+=20000;await assert.rejects(expired.cli.poll(state),error=>error.code==='expired');await expired.cli.close();assert.deepEqual(await expired.directories(),[]);
});

test('TC-009: another active manager and unknown workspace are preserved',async t=>{
 const f=await fixture(t);const state=await f.cli.start({login:'fixture-user'},Date.now()+60000,'active');const root=join(f.home,'.ned','github-auth'),unknown=join(root,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');await mkdir(unknown);await writeFile(join(unknown,'retain'),'synthetic owner-unknown data');
 const other=createGithubCliAuth({home:f.home,env:{PATH:process.env.PATH}});t.after(()=>other.close());await other.initialize();assert.equal(await f.cli.poll(state),'pending');assert.equal(await readFile(join(unknown,'retain'),'utf8'),'synthetic owner-unknown data');await other.close();f.cli.cancel('active');await f.cli.close();assert.deepEqual(await f.directories(),['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);
});

test('TC-009: startup and verification command deadlines clean owned processes',async t=>{
 const silent=await fixture(t,'silent',{startupMs:150});await assert.rejects(silent.cli.start({login:'fixture-user'},Date.now()+60000,'deadline'),/GitHub/i);assert.deepEqual(await silent.directories(),[]);
 const f=await fixture(t,'approve',{commandMs:150});const state=await f.cli.start({login:'fixture-user'},Date.now()+60000,'api-deadline');await f.setMode('hang-api');await assert.rejects(testWait(async()=>typeof await f.cli.poll(state)==='object'),/GitHub/i);assert.deepEqual(await f.directories(),[]);assert.equal(f.cli.isBusy(),false);
});

test('TC-009: restart reclaims only an abandoned owned login workspace',async t=>{
 const f=await fixture(t);const worker=spawn(process.execPath,[resolve('docs/features/provider-identity/tests/crash-gh-worker.mjs'),f.home,f.control],{stdio:['ignore','pipe','pipe']});t.after(()=>{if(worker.exitCode===null&&!worker.signalCode)worker.kill('SIGKILL');});
 await new Promise((resolve,reject)=>{worker.stdout.once('data',resolve);worker.once('error',reject);worker.once('exit',code=>reject(new Error(`Worker exited early: ${code}`)));});
 const dirs=await f.directories();assert.equal(dirs.length,1);const owner=JSON.parse(await readFile(join(f.home,'.ned','github-auth',dirs[0],'owner.json'),'utf8'));assert.equal(owner.pid,worker.pid);assert.ok(owner.child>0);
 const exited=new Promise(resolve=>worker.once('exit',resolve));worker.kill('SIGKILL');await exited;
 const recovered=createGithubCliAuth({home:f.home,env:{PATH:process.env.PATH},killGraceMs:100});t.after(()=>recovered.close());await recovered.initialize();assert.deepEqual(await f.directories(),[]);assert.equal(recovered.isBusy(),false);
});
