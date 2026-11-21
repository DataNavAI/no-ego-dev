import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,chmodSync,symlinkSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadApiCredential,loadApiInstanceId} from '../../../../apps/core/src/auth.js';
import {createTaskApiClient} from '../../../../apps/cli/src/task-api.js';

function fixture(context){
  const home=mkdtempSync(path.join(tmpdir(),'ned-token-bootstrap-'));
  context.after(()=>rmSync(home,{recursive:true,force:true}));
  return {home,filename:path.join(home,'.ned/core/operator-token')};
}
for(const source of ['environment','file'])test(`TC-005: ${source} injection persists once and survives restart without rewriting input`,context=>{
  const {home,filename}=fixture(context),input=path.join(home,'input-token'),token='a'.repeat(64);
  writeFileSync(input,token+'\n',{mode:0o600});
  const env=source==='file'?{NED_API_TOKEN_FILE:input}:{NED_API_TOKEN:token};
  assert.equal(loadApiCredential({home,env}),token);assert.equal(readFileSync(filename,'utf8'),token+'\n');
  assert.equal(loadApiCredential({home,env:{}}),token);assert.equal(loadApiCredential({home,env}),token);
  assert.equal(statSync(filename).mode&0o777,0o600);assert.equal(readFileSync(input,'utf8'),token+'\n');
  assert.throws(()=>loadApiCredential({home,env:{NED_API_TOKEN:'b'.repeat(64)}}));assert.equal(readFileSync(filename,'utf8'),token+'\n');
  const identity=loadApiInstanceId({home,env:{}});assert.match(identity,/^[a-f0-9]{64}$/);assert.notEqual(identity,token);
  writeFileSync(filename,'c'.repeat(64)+'\n',{mode:0o600});
  assert.equal(loadApiInstanceId({home,env:{}}),identity,'credential rotation preserves instance identity');
});
test('TC-005: invalid, conflicting, unsafe or missing injection never generates a fallback credential',context=>{
  const {home,filename}=fixture(context),input=path.join(home,'input-token'),link=path.join(home,'link');
  writeFileSync(input,'a'.repeat(64),{mode:0o600});symlinkSync(input,link);
  for(const env of [{NED_API_TOKEN:''},{NED_API_TOKEN:'invalid'},{NED_API_TOKEN_FILE:''},{NED_API_TOKEN_FILE:'relative'},{NED_API_TOKEN_FILE:path.join(home,'missing')},{NED_API_TOKEN_FILE:link},{NED_API_TOKEN:'a'.repeat(64),NED_API_TOKEN_FILE:input}]){
    assert.throws(()=>loadApiCredential({home,env}));assert.equal(existsSync(filename),false);
  }
  chmodSync(input,0o666);assert.throws(()=>loadApiCredential({home,env:{NED_API_TOKEN_FILE:input}}));assert.equal(existsSync(filename),false);
});
test('TC-005: command-scoped CLI API reuses the persisted instance credential',async context=>{
  const {home,filename}=fixture(context),project=path.join(home,'project');mkdirSync(project);
  const first=await createTaskApiClient({home,env:{},project,actor:'agent:token-case'});context.after(()=>first.close());await first.initialize();await first.close();
  assert.equal(existsSync(filename),true);const persisted=readFileSync(filename,'utf8');
  const second=await createTaskApiClient({home,env:{},project,actor:'agent:token-case'});context.after(()=>second.close());assert.ok(await second.getStatus());
  assert.equal(readFileSync(filename,'utf8'),persisted);
});
