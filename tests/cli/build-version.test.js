import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir,devNull} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {nedVersion,sourceRevision} from '../../src/version.js';

const project=fileURLToPath(new URL('../../',import.meta.url));
const gitEnvironment=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
gitEnvironment.GIT_CONFIG_GLOBAL=devNull;gitEnvironment.GIT_CONFIG_NOSYSTEM='1';
const git=(root,...args)=>execFileSync('git',['-C',root,'-c','commit.gpgsign=false','-c',`core.hooksPath=${path.join(root,'.fixture-hooks')}`,'-c',`init.templateDir=${path.join(root,'.fixture-hooks')}`,...args],{env:gitEnvironment,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000}).trim();
async function fixture(t){
  const home=await mkdtemp(path.join(tmpdir(),'ned-build-version-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const root=path.join(home,'source');await mkdir(path.join(root,'src'),{recursive:true});
  await mkdir(path.join(root,'.fixture-hooks'));
  await writeFile(path.join(root,'package.json'),JSON.stringify({name:'ned-version-fixture',type:'module',version:'0.3.0'}));
  await copyFile(path.join(project,'src/version.js'),path.join(root,'src/version.js'));
  await writeFile(path.join(root,'.gitattributes'),'src/version.js export-subst\n');
  git(root,'init');git(root,'add','.');
  git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','first');
  return {home,root,sha:git(root,'rev-parse','HEAD')};
}

test('build version follows each commit, packed refs and worktrees without a Git subprocess at runtime',async t=>{
  const {home,root,sha}=await fixture(t);
  assert.equal(nedVersion(root),`0.3.0+${sha.slice(0,7)}`);
  await writeFile(path.join(root,'next.txt'),'second');git(root,'add','.');
  git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','second');
  const next=git(root,'rev-parse','HEAD');assert.notEqual(next,sha);
  git(root,'pack-refs','--all');
  assert.equal(nedVersion(root),`0.3.0+${next.slice(0,7)}`);
  const worktree=path.join(home,'worktree');git(root,'worktree','add','-b','fixture-work',worktree,'HEAD');
  assert.equal(nedVersion(worktree),`0.3.0+${next.slice(0,7)}`);
  const run=execFileSync(process.execPath,['--input-type=module','-e',`import {nedVersion} from ${JSON.stringify(pathToFileURL(path.join(worktree,'src/version.js')).href)};console.log(nedVersion());`],{env:{PATH:'/nonexistent'},encoding:'utf8',timeout:5000});
  assert.equal(run.trim(),`0.3.0+${next.slice(0,7)}`);
});

test('Git archive carries its exact revision without borrowing an enclosing checkout',async t=>{
  const {root,sha}=await fixture(t);
  const archive=git(root,'rev-parse','HEAD');assert.equal(archive,sha);
  const tar=execFileSync('git',['-C',root,'archive',sha],{env:gitEnvironment,timeout:10000});
  const extracted=path.join(root,'nested-archive');await mkdir(extracted);
  execFileSync('tar',['-xf','-','-C',extracted],{input:tar,timeout:10000});
  const loaded=await import(pathToFileURL(path.join(extracted,'src/version.js')).href);
  assert.equal(loaded.sourceRevision(),sha);
  assert.equal(loaded.nedVersion(),`0.3.0+${sha.slice(0,7)}`);
});

test('stamped packages and native installations retain identity; unknown or invalid metadata cannot invent a SHA',async t=>{
  const {home,root,sha}=await fixture(t);
  const unpacked=path.join(root,'nested-package');await mkdir(unpacked);
  await writeFile(path.join(unpacked,'package.json'),' {"version":"0.3.0"}');
  assert.equal(nedVersion(unpacked),'0.3.0+unknown','must not inherit enclosing Git');
  const spoofed=execFileSync(process.execPath,['--input-type=module','-e',`import {nedVersion} from ${JSON.stringify(pathToFileURL(path.join(project,'src/version.js')).href)};console.log(nedVersion(${JSON.stringify(unpacked)}));`],{env:{...process.env,NED_BUILD_REVISION:'f'.repeat(40)},encoding:'utf8',timeout:5000});
  assert.equal(spoofed.trim(),'0.3.0+unknown','runtime environment cannot override source identity');
  await writeFile(path.join(unpacked,'build-info.json'),JSON.stringify({revision:sha}));
  assert.equal(nedVersion(unpacked),`0.3.0+${sha.slice(0,7)}`);
  for(const value of ['not JSON',JSON.stringify({revision:'<script>'}),JSON.stringify({revision:'abc1234'})]){
    await writeFile(path.join(unpacked,'build-info.json'),value);
    assert.equal(nedVersion(unpacked),'0.3.0+unknown');
  }
  const installed=path.join(home,'generation','app');await mkdir(installed,{recursive:true});
  await writeFile(path.join(installed,'package.json'),'{"version":"0.3.0"}');
  await writeFile(path.join(installed,'..','install-manifest'),`revision=${sha}\n`);
  assert.equal(nedVersion(installed),`0.3.0+${sha.slice(0,7)}`);
  await writeFile(path.join(root,'build-info.json'),JSON.stringify({revision:'f'.repeat(40)}));
  assert.equal(sourceRevision(root),sha,'checkout HEAD wins stale build metadata');
  await writeFile(path.join(root,'package.json'),'{"version":"<script>"}');
  assert.throws(()=>nedVersion(root),/base version/);
});

test('npm pack stamps the current commit; a Git-free package reports that identity and rejects mismatched stamps',async t=>{
  const {home,root,sha:exported}=await fixture(t);
  // Model continuing development from an exported source archive.
  const modulePath=path.join(root,'src/version.js');
  await writeFile(modulePath,(await readFile(modulePath,'utf8')).replace('$Format:%H$',exported));
  await mkdir(path.join(root,'scripts'));
  await copyFile(path.join(project,'scripts/stamp-version.mjs'),path.join(root,'scripts/stamp-version.mjs'));
  await writeFile(path.join(root,'package.json'),JSON.stringify({name:'ned-version-fixture',type:'module',version:'0.3.0',files:['src/','scripts/','build-info.json'],scripts:{prepack:'node scripts/stamp-version.mjs'}}));
  git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','package');
  const sha=git(root,'rev-parse','HEAD');
  execFileSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--pack-destination',home,'--ignore-scripts=false'],{env:gitEnvironment,cwd:root,stdio:'pipe',timeout:30000});
  const unpacked=path.join(home,'packed');await mkdir(unpacked);
  execFileSync('tar',['-xf',path.join(home,'ned-version-fixture-0.3.0.tgz'),'-C',unpacked],{timeout:10000});
  const packaged=path.join(unpacked,'package');
  assert.deepEqual(JSON.parse(await readFile(path.join(packaged,'build-info.json'),'utf8')),{revision:sha});
  const loaded=await import(pathToFileURL(path.join(packaged,'src/version.js')).href);
  assert.equal(loaded.nedVersion(),`0.3.0+${sha.slice(0,7)}`);
  assert.throws(()=>execFileSync(process.execPath,['scripts/stamp-version.mjs','f'.repeat(40)],{cwd:packaged,stdio:'pipe',timeout:5000}),error=>error.status===1&&error.stderr.toString().includes('Build revision does not match source'));
  assert.deepEqual(JSON.parse(await readFile(path.join(packaged,'build-info.json'),'utf8')),{revision:sha},'rejected stamp leaves package identity unchanged');
});
