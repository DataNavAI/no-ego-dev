import {test} from 'node:test';
import {readFileSync,existsSync,statSync,readdirSync} from 'node:fs';
import {fixture,assert,join,startCom} from './helpers.js';

test('TC-002: fresh CLI agents isolate tasks/registry and COM reads the matching runtime',async t=>{
  const f=fixture(t),codex=join(f.base,'codex'),hermes=join(f.base,'hermes');
  const a={CODEX_THREAD_ID:'synthetic-thread',CODEX_HOME:codex};
  const b={...a,HERMES_SESSION_ID:'synthetic-session',HERMES_HOME:hermes};
  f.json(['task','init']);f.json(['task','create','Retained standalone work']);
  const sentinel=join(f.home,'.ned/ned.sqlite');
  const legacyBefore=readFileSync(sentinel);
  const pa=f.json(['task','init'],a),pb=f.json(['task','init'],b);assert.deepEqual(pa,pb);
  f.json(['task','create','Codex work'],a);f.json(['task','create','Hermes work'],b);
  assert.deepEqual(f.json(['task','list'],a).map(item=>item.title),['Codex work']);
  assert.deepEqual(f.json(['task','list'],b).map(item=>item.title),['Hermes work']);
  for(const root of [codex,hermes]){assert.ok(existsSync(join(root,'.ned/ned.sqlite')));assert.equal(statSync(root).mode&0o777,0o700);}
  const override=join(f.base,'override');f.json(['task','init'],{...b,NED_AGENT_HOME:override});
  assert.deepEqual(f.json(['task','list'],{...b,NED_AGENT_HOME:override}),[]);
  // DB flags deliberately share DB only, leaving runtime ownership unchanged.
  const shared=join(codex,'.ned/ned.sqlite');
  assert.deepEqual(f.json(['task','list'],{...b,NED_DATABASE_URL:shared}).map(item=>item.title),['Codex work']);
  assert.deepEqual(f.json(['task','list','--database',shared],{...b,NED_DATABASE_URL:join(f.base,'unused.sqlite')}).map(item=>item.title),['Codex work']);
  assert.equal(existsSync(join(f.base,'unused.sqlite')),false);
  assert.deepEqual(f.json(['task','list'],{NED_AGENT_HOME:f.home}).map(item=>item.title),['Retained standalone work']);
  // Actual Codex commonly sets only CODEX_THREAD_ID, not CODEX_HOME.
  f.json(['task','init'],{CODEX_THREAD_ID:'default-home'});
  assert.ok(existsSync(join(f.home,'.codex/.ned/ned.sqlite')));
  assert.deepEqual(f.json(['task','list'],{CODEX_THREAD_ID:'default-home'}),[]);
  const com=await startCom(t,f,b);
  const projects=await (await fetch(com.url+'/api/projects')).json();
  assert.equal(projects.projects.length,1);
  const work=await (await fetch(com.url+`/api/projects/${projects.projects[0].id}/work`)).json();
  assert.ok(JSON.stringify(work).includes('Hermes work'));assert.ok(!JSON.stringify(work).includes('Codex work'));
  await com.stop();
  assert.equal(readdirSync(join(hermes,'.ned/logs')).filter(name=>name.endsWith('.jsonl')).length,1);
  assert.deepEqual(readFileSync(sentinel),legacyBefore);
  assert.deepEqual(readdirSync(f.project),[],'project-owned files must remain untouched');
});

test('TC-002: CLI error/help boundaries do not fall back or write runtime state',t=>{
  const f=fixture(t);
  const malformed=[{NED_AGENT_HOME:''},{NED_AGENT_HOME:'relative-secret-path'},{CODEX_HOME:'https://secret.invalid/root'},{HERMES_HOME:join(f.base,'h'),CODEX_HOME:join(f.base,'c')}];
  for(const env of malformed){
    for(const args of [['task','init','--json'],['telemetry','status'],['secret','list','--json'],['com'],['com','--logout']]){
      const result=f.run(args,env);assert.notEqual(result.status,0);assert.equal(result.signal,null);
      assert.ok(!result.stderr.includes('secret.invalid'));assert.ok(!result.stderr.includes('relative-secret-path'));assert.doesNotMatch(result.stderr,/\n\s+at |Traceback/);
      assert.equal(result.stdout.includes('NEDCOM:'),false);
    }
    for(const args of [['--help'],['com','--help'],['secret','--help']])assert.equal(f.run(args,env).status,0);
  }
  assert.deepEqual(readdirSync(f.home),[]);assert.deepEqual(readdirSync(f.base).sort(),['os','project']);
});


test('TC-002: first COM start initializes an empty agent database and repeat startup retains it',async t=>{
  const f=fixture(t),agent=join(f.base,'fresh-hermes'),env={HERMES_HOME:agent};
  assert.equal(existsSync(agent),false);
  const first=await startCom(t,f,env);
  const response=await fetch(first.url+'/api/projects');assert.equal(response.status,200);assert.deepEqual(await response.json(),{projects:[]});
  const database=join(agent,'.ned/ned.sqlite');assert.ok(existsSync(database));await first.stop();
  const original=statSync(database).ino;const second=await startCom(t,f,env);
  assert.deepEqual(await (await fetch(second.url+'/api/projects')).json(),{projects:[]});assert.equal(statSync(database).ino,original);await second.stop();
  assert.equal(existsSync(join(f.home,'.ned')),false);
});
