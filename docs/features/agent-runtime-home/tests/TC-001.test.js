import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resolveDatabasePath} from '../../../../src/database.js';

test('TC-001: runtime selection precedence, defaults and invalid roots', async t=>{
  const base=mkdtempSync(path.join(os.tmpdir(),'ned-home-resolver-'));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const osHome=path.join(base,'os'),hermes=path.join(base,'hermes'),codex=path.join(base,'codex'),override=path.join(base,'override');
  // Existing public boundary proves RED without relying on a missing new import.
  assert.equal(resolveDatabasePath({env:{NED_AGENT_HOME:override}}),path.join(override,'.ned/ned.sqlite'));
  const {resolveRuntimeHome}=await import('../../../../src/runtime-home.js');
  const cases=[
    [{},osHome],
    [{NED_AGENT_HOME:override,HERMES_HOME:'bad',CODEX_HOME:'bad'},override],
    [{HERMES_HOME:hermes},hermes],[{CODEX_HOME:codex},codex],
    [{CODEX_THREAD_ID:'thread'},path.join(osHome,'.codex')],
    [{CODEX_SESSION_ID:'session',CODEX_HOME:codex,HERMES_HOME:hermes},codex],
    [{HERMES_SESSION_ID:'session'},path.join(osHome,'.hermes')],
    [{HERMES_SESSION_KEY:'session'},path.join(osHome,'.hermes')],
    [{HERMES_SESSION_PLATFORM:'cli'},path.join(osHome,'.hermes')],
    [{CODEX_THREAD_ID:'thread',HERMES_HOME:hermes},path.join(osHome,'.codex')],
    [{CODEX_THREAD_ID:'thread',HERMES_SESSION_ID:'session',CODEX_HOME:codex},path.join(osHome,'.hermes')],
    [{HERMES_SESSION_KEY:'session',HERMES_HOME:hermes,CODEX_THREAD_ID:'inherited',CODEX_HOME:codex},hermes],
    [{HERMES_SESSION_PLATFORM:'cli',HERMES_HOME:hermes,CODEX_SESSION_ID:'inherited'},hermes],
    [{HERMES_SESSION_ID:'',CODEX_THREAD_ID:'',CODEX_HOME:codex},codex],
  ];
  for(const [env,expected] of cases)await t.test(JSON.stringify(env),()=>{
    assert.equal(resolveRuntimeHome({env,osHome}),expected);
    assert.equal(existsSync(expected),false,'resolution must not create directories');
  });
  assert.throws(()=>resolveRuntimeHome({env:{HERMES_HOME:hermes,CODEX_HOME:codex},osHome}),e=>e.code==='ambiguous_agent_home'&&e.message.includes('NED_AGENT_HOME'));
  for(const key of ['NED_AGENT_HOME','HERMES_HOME','CODEX_HOME'])for(const value of ['', 'relative', 'https://secret.invalid/home', 'file:///tmp/home', '/tmp/a\0b']){
    assert.throws(()=>resolveRuntimeHome({env:{[key]:value},osHome}),e=>e.code==='invalid_agent_home'&&e.message.includes(key)&&!e.message.includes('secret.invalid'));
  }
  const link=path.join(base,'link');symlinkSync(base,link,process.platform==='win32'?'junction':'dir');
  for(const root of [link,link+'/',link+'/.'])assert.throws(()=>resolveRuntimeHome({env:{NED_AGENT_HOME:root},osHome}),e=>e.code==='invalid_agent_home');
  assert.equal(resolveRuntimeHome({home:override,env:{NED_AGENT_HOME:'bad',CODEX_THREAD_ID:'ambient'},osHome}),override);
  assert.equal(resolveDatabasePath({home:override,env:{NED_AGENT_HOME:'bad',CODEX_THREAD_ID:'ambient'}}),path.join(override,'.ned/ned.sqlite'));
  const explicit=path.join(base,'explicit.sqlite'),environment=path.join(base,'environment.sqlite');
  assert.equal(resolveDatabasePath({databaseUrl:explicit,env:{NED_DATABASE_URL:environment,NED_AGENT_HOME:'bad'}}),explicit);
  assert.equal(resolveDatabasePath({env:{NED_DATABASE_URL:environment,NED_AGENT_HOME:'bad'}}),environment);
});
