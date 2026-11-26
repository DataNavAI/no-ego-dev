import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {cp,mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../../../../scripts/verify-manual-test-result.mjs',import.meta.url));
async function fixture(t){
  const root=await mkdtemp(path.join(tmpdir(),'ned-receipt-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  await mkdir(path.join(root,'scripts'));await mkdir(path.join(root,'.github/manual-test-results'),{recursive:true});
  await cp(source,path.join(root,'scripts/verify-manual-test-result.mjs'));await writeFile(path.join(root,'app.js'),'export const value=1;\n');await writeFile(path.join(root,'.github/manual-test-result.json'),'{}\n');
  git(['init','--quiet']);git(['config','user.name','Synthetic receipt test']);git(['config','user.email','fixture@example.invalid']);git(['add','.']);git(['commit','--quiet','-m','base']);
  const base=git(['rev-parse','HEAD']);
  const run=()=>spawnSync(process.execPath,['scripts/verify-manual-test-result.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,MANUAL_TEST_BASE_SHA:base,MANUAL_TEST_HEAD_SHA:'HEAD'}});
  const commit=message=>{git(['add','.']);git(['commit','--quiet','-m',message]);return git(['rev-parse','HEAD']);};
  await writeFile(path.join(root,'app.js'),'export const value=2;\n');const candidate=commit('code');
  const receipt={candidate_sha:candidate,result:'pass',tested_at:'2026-08-22T00:00:00Z',environment:'synthetic Git fixture',commands:['node --test'],observations:'Synthetic acceptance completed.'};
  return {root,git,base,run,commit,candidate,receipt};
}
test('TC-001: independent candidate receipt verifies and merges a legacy update without conflict',async t=>{
  const f=await fixture(t),file='.github/manual-test-results/'+f.candidate+'.json',bytes=JSON.stringify(f.receipt);
  await writeFile(path.join(f.root,file),bytes);f.commit('acceptance');const result=f.run();assert.equal(result.status,0,result.stderr);
  const accepted=f.git(['rev-parse','HEAD']);f.git(['checkout','--quiet','-b','independent',f.base]);await writeFile(path.join(f.root,'.github/manual-test-result.json'),'{}\n\n');f.commit('independent legacy receipt');
  f.git(['checkout','--quiet','--detach',accepted]);f.git(['merge','--quiet','--no-edit','independent']);assert.equal(f.git(['diff','--name-only','--diff-filter=U']),'');assert.equal(await readFile(path.join(f.root,file),'utf8'),bytes);
});
for(const variant of ['wrong filename','wrong candidate','failed result','malformed JSON','future timestamp','empty commands','empty environment','mixed code','missing receipt','documentation only'])test('TC-001: '+variant,async t=>{
  const f=await fixture(t);
  if(variant==='documentation only'){f.git(['reset','--quiet','--hard',f.base]);await writeFile(path.join(f.root,'README.md'),'Synthetic documentation\n');}
  else if(variant==='missing receipt')await writeFile(path.join(f.root,'app.js'),'export const value=3;\n');
  else{
    if(variant==='wrong candidate')f.receipt.candidate_sha='a'.repeat(40);
    if(variant==='failed result')f.receipt.result='fail';
    if(variant==='future timestamp')f.receipt.tested_at='2999-01-01T00:00:00Z';
    if(variant==='empty commands')f.receipt.commands=[];
    if(variant==='empty environment')f.receipt.environment='';
    const filename=variant==='wrong filename'?'a'.repeat(40):f.candidate;
    await writeFile(path.join(f.root,'.github/manual-test-results/'+filename+'.json'),variant==='malformed JSON'?'{':JSON.stringify(f.receipt));
    if(variant==='mixed code')await writeFile(path.join(f.root,'app.js'),'export const value=3;\n');
  }
  f.commit(variant);const result=f.run();if(variant==='documentation only')assert.equal(result.status,0,result.stderr);else assert.notEqual(result.status,0,result.stdout);
});
