import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const initializer = new URL('../../../../scripts/container/initialize.py',import.meta.url);
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(),'ned-container-'));
  t.after(() => rmSync(root,{recursive:true,force:true}));
  const source = path.join(root,'source'); const target = path.join(root,'profile');
  mkdirSync(source); mkdirSync(path.join(source,'skills'));
  writeFileSync(path.join(source,'distribution.yaml'),'name: synthetic\nversion: 1\ndistribution_owned: [SOUL.md, config.yaml, skills/, skills/example]\n');
  writeFileSync(path.join(source,'SOUL.md'),'synthetic soul');
  writeFileSync(path.join(source,'config.yaml'),'terminal:\n  cwd: old\n');
  writeFileSync(path.join(source,'skills/example'),'synthetic skill');
  return {source,target,run:() => spawnSync(process.env.NED_TEST_PYTHON || 'python3',[initializer.pathname,source,target,'/projects'],{encoding:'utf8'})};
}
test('TC-002: fresh seed is complete and repeat use preserves edited profile/state', t => {
  const f = fixture(t); assert.equal(f.run().status,0);
  assert.equal(readFileSync(path.join(f.target,'SOUL.md'),'utf8'),'synthetic soul');
  assert.equal(readFileSync(path.join(f.target,'skills/example'),'utf8'),'synthetic skill');
  assert.match(readFileSync(path.join(f.target,'config.yaml'),'utf8'),/cwd: \/projects/);
  writeFileSync(path.join(f.target,'config.yaml'),'operator config');
  writeFileSync(path.join(f.target,'auth.json'),'synthetic state');
  assert.equal(f.run().status,0);
  assert.equal(readFileSync(path.join(f.target,'config.yaml'),'utf8'),'operator config');
  assert.equal(readFileSync(path.join(f.target,'auth.json'),'utf8'),'synthetic state');
});
test('TC-002: unrelated and interrupted profiles fail without changing files', t => {
  const f = fixture(t); mkdirSync(f.target); writeFileSync(path.join(f.target,'.ned-initializing'),'sentinel');
  assert.equal(f.run().status,1);
  assert.equal(readFileSync(path.join(f.target,'.ned-initializing'),'utf8'),'sentinel');
  assert.equal(existsSync(path.join(f.target,'SOUL.md')),false);
});
test('TC-002: missing, escaping and symlink components fail before writing', async t => {
  for (const name of ['missing','../escape','link']) await t.test(name, t => {
    const f = fixture(t);
    writeFileSync(path.join(f.source,'distribution.yaml'),`distribution_owned: [${name}]\n`);
    if (name === 'link') symlinkSync(path.join(f.source,'SOUL.md'),path.join(f.source,'link'));
    assert.equal(f.run().status,1); assert.equal(existsSync(path.join(f.target,'.ned-initializing')),false);
  });
});
test('TC-002: malformed manifest and invalid marker never overwrite state', async t => {
  await t.test('malformed manifest', t => {
    const f = fixture(t); writeFileSync(path.join(f.source,'distribution.yaml'),'distribution_owned: [unterminated');
    assert.equal(f.run().status,1); assert.equal(existsSync(path.join(f.target,'.ned-initializing')),false);
  });
  await t.test('invalid ownership marker', t => {
    const f = fixture(t); mkdirSync(f.target);
    writeFileSync(path.join(f.target,'.ned-container.json'),'{"schema":2}');
    writeFileSync(path.join(f.target,'sentinel'),'unchanged');
    assert.equal(f.run().status,1); assert.equal(readFileSync(path.join(f.target,'sentinel'),'utf8'),'unchanged');
  });
});
