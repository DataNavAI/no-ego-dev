import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,statSync,chmodSync,unlinkSync,symlinkSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import Database from 'better-sqlite3';
import {createSecretStore} from '../../../../src/secrets.js';
function fixture(t){const home=mkdtempSync(join(tmpdir(),'ned-secret-'));t.after(()=>rmSync(home,{recursive:true,force:true}));return {home,store:createSecretStore({home}),cli:(args,input)=>spawnSync(process.execPath,['bin/ned.js','secret',...args],{env:{...process.env,HOME:home},input,encoding:'utf8',timeout:10000})};}
test('TC-001: CLI persists exact secrets, lists metadata and invalidates private value files',t=>{
  const {home,store,cli}=fixture(t),value='  synthetic-only-SECRET\nsecond line\n';
  const set=cli(['set','ADMIN_PASSWORD','--stdin','--json'],value);assert.equal(set.status,0,set.stderr);assert.ok(!set.stdout.includes(value));
  assert.equal(cli(['get','ADMIN_PASSWORD']).stdout,value);
  const list=cli(['list','--json']);assert.equal(list.status,0);assert.deepEqual(JSON.parse(list.stdout).map(row=>row.key),['ADMIN_PASSWORD']);assert.ok(!list.stdout.includes('synthetic-only-SECRET'));
  const file=JSON.parse(cli(['get','ADMIN_PASSWORD','--file','--json']).stdout).path;
  assert.equal(readFileSync(file,'utf8'),value);assert.equal(statSync(file).mode&0o777,0o600);
  assert.equal(statSync(join(home,'.ned/secrets')).mode&0o777,0o700);
  assert.equal(readFileSync(join(home,'.ned/secrets/vault.sqlite')).includes(Buffer.from('synthetic-only-SECRET')),false);
  store.set('ADMIN_PASSWORD','replacement');assert.equal(existsSync(file),false);assert.equal(cli(['get','ADMIN_PASSWORD']).stdout,'replacement');
  for(const args of [['set','BAD-KEY','--stdin'],['set','ADMIN_PASSWORD','leak'],['get','ADMIN_PASSWORD','--json'],['get','../key'],['list','--file']]){const out=cli(args,'invalid');assert.equal(out.status,2);assert.ok(!out.stderr.includes(value));}
  for(const input of ['', 'x'.repeat(65537),Buffer.from([255])])assert.equal(cli(['set','ADMIN_PASSWORD','--stdin'],input).status,2);
  assert.equal(store.get('ADMIN_PASSWORD'),'replacement');
  const other=fixture(t);assert.equal(other.cli(['get','ADMIN_PASSWORD']).status,2);
  const exported=store.get('ADMIN_PASSWORD',{file:true}).path;store.delete('ADMIN_PASSWORD');assert.equal(existsSync(exported),false);assert.equal(cli(['get','ADMIN_PASSWORD']).status,2);
});
test('TC-001: unsafe paths, permissions, tampering and lost key fail closed',async t=>{
  for(const variant of ['permissions','export-link','vault-link','key-lost','ciphertext','key-link','wrong-key'])await t.test(variant,t=>{
    const {home,store}=fixture(t);store.set('ADMIN_PASSWORD','synthetic-only');const root=join(home,'.ned/secrets');
    if(variant==='permissions')chmodSync(join(root,'master.key'),0o644);
    if(variant==='export-link')symlinkSync(join(root,'master.key'),join(root,'files/ADMIN_PASSWORD'));
    if(variant==='vault-link'){unlinkSync(join(root,'vault.sqlite'));symlinkSync(join(root,'master.key'),join(root,'vault.sqlite'));}
    if(variant==='wrong-key')writeFileSync(join(root,'master.key'),Buffer.alloc(32,1));
    if(variant==='key-lost')unlinkSync(join(root,'master.key'));
    if(variant==='key-link'){unlinkSync(join(root,'master.key'));symlinkSync(join(root,'vault.sqlite'),join(root,'master.key'));}
    if(variant==='ciphertext'){const db=new Database(join(root,'vault.sqlite'));db.prepare("UPDATE secrets SET payload='{}'").run();db.close();}
    assert.throws(()=>store.get('ADMIN_PASSWORD',{file:true}),error=>error.code==='vault_unavailable');
    assert.throws(()=>store.set('ADMIN_PASSWORD','should-not-save'),error=>error.code==='vault_unavailable');
    if(variant==='key-lost')assert.equal(existsSync(join(root,'master.key')),false);
  });
});
test('TC-001: concurrent processes preserve separate writes and initialized key',async t=>{
  const {home,store}=fixture(t);store.list();
  const run=key=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['bin/ned.js','secret','set',key,'--stdin'],{env:{...process.env,HOME:home},stdio:['pipe','ignore','pipe']});let error='';child.stderr.on('data',data=>error+=data);child.on('error',reject);child.on('close',code=>resolve({code,error}));child.stdin.end(`synthetic-${key}`);});
  const results=await Promise.all([run('ONE'),run('TWO')]);assert.deepEqual(results.map(row=>row.code),[0,0],JSON.stringify(results));
  assert.equal(store.get('ONE'),'synthetic-ONE');assert.equal(store.get('TWO'),'synthetic-TWO');
  const unsafe=join(home,'unsafe');mkdirSync(unsafe);chmodSync(unsafe,0o777);assert.throws(()=>createSecretStore({home:unsafe}).list());
});
