import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { selectSpecTests } from '../../../../scripts/run-spec-tests.mjs';
test('TC-001: validate spec discovery and all selector combinations', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ned-runner-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const spec = (id, journey) =>
    `# Feature\n### ${id}: fixture\n- Journey / requirements: ${journey} / FR-001.\n`;
  async function feature(name, id, journey) {
    await mkdir(path.join(dir, name, 'tests'), { recursive: true });
    await writeFile(path.join(dir, name, 'SPEC.md'), spec(id, journey));
    await writeFile(
      path.join(dir, name, 'tests', `${id}.test.js`),
      `import {test} from 'node:test';test('${id}: fixture',()=>{});`,
    );
  }
  await feature('alpha', 'TC-001', 'CUJ-001');
  await feature('beta', 'TC-002', 'CUJ-002');
  assert.equal((await selectSpecTests([], dir)).length, 2);
  assert.equal((await selectSpecTests(['--all'], dir)).length, 2);
  for (const selectors of [
    ['--feature', 'alpha'],
    ['--case', 'TC-001'],
    ['--journey', 'CUJ-001'],
    ['--feature', 'alpha', '--case', 'TC-001', '--journey', 'CUJ-001'],
  ])
    assert.equal((await selectSpecTests(selectors, dir))[0].feature, 'alpha');
  assert.equal((await selectSpecTests(['--feature', 'alpha,beta'], dir)).length, 2);
  assert.equal((await selectSpecTests(['--feature', 'alpha', '--feature', 'beta'], dir)).length, 2);
  for (const args of [
    ['--feature'],
    ['--what', 'x'],
    ['--feature', '../outside'],
    ['--case', 'TC-999'],
    ['--journey', 'CUJ-999'],
    ['--all', '--feature', 'alpha'],
    ['--case', 'TC-001', '--journey', 'CUJ-002'],
  ])
    await assert.rejects(selectSpecTests(args, dir));
  await mkdir(path.join(dir, 'retired'));
  await writeFile(path.join(dir, 'retired', 'SPEC.md'), '# Historical feature\nStatus: retired\n### TC-999: discontinued\n');
  const active = await selectSpecTests(['--all'], dir);
  assert.equal(active.length, 2);
  assert.deepEqual(active.retiredFeatures, ['retired']);
  await assert.rejects(selectSpecTests(['--feature', 'retired'], dir), /Retired feature.*excluded/);
  await assert.rejects(selectSpecTests(['--case', 'TC-999'], dir), /Unknown case/);
  // An ordinary feature with no cases must still fail closed.
  await writeFile(path.join(dir, 'retired', 'SPEC.md'), '# Historical feature\nStatus: planned\n');
  await assert.rejects(selectSpecTests(['--all'], dir), /no declared test cases/);
  await writeFile(path.join(dir, 'retired', 'SPEC.md'), '# Historical feature\nStatus: retired\n');
  await mkdir(path.join(dir, 'manual'));
  await writeFile(path.join(dir, 'manual', 'SPEC.md'),
    spec('TC-003', 'CUJ-003') + '- Level / automation: manual; agent evaluation.\n');
  const mixed = await selectSpecTests(['--all'], dir);
  assert.equal(mixed.length, 2);
  assert.equal(mixed.manualCases.length, 1);
  assert.equal(mixed.manualCases[0].feature, 'manual');
  await assert.rejects(selectSpecTests(['--feature', 'manual'], dir), /manual cases require/);
  await mkdir(path.join(dir, 'manual', 'tests'));
  await writeFile(path.join(dir, 'manual', 'tests', 'TC-003.test.js'), "test('TC-003: wrong',()=>{})");
  await assert.rejects(selectSpecTests([], dir), /Manual case has an automated file/);
  await rm(path.join(dir, 'manual'), { recursive: true });
  await writeFile(
    path.join(dir, 'alpha', 'SPEC.md'),
    spec('TC-001', 'CUJ-001') + spec('TC-001', 'CUJ-001'),
  );
  await assert.rejects(selectSpecTests([], dir), /Duplicate/);
  await writeFile(path.join(dir, 'alpha', 'SPEC.md'), spec('TC-001', 'CUJ-001'));
  await rm(path.join(dir, 'alpha', 'tests', 'TC-001.test.js'));
  await assert.rejects(selectSpecTests([], dir), /Missing automated/);
  await writeFile(path.join(dir, 'alpha', 'tests', 'TC-001.test.js'), '// empty');
  await assert.rejects(selectSpecTests([], dir), /no named/);
  await writeFile(
    path.join(dir, 'alpha', 'tests', 'TC-001.test.js'),
    "test('TC-001: fixture',()=>{})",
  );
  await writeFile(
    path.join(dir, 'alpha', 'tests', 'TC-999.test.js'),
    "test('TC-999: fixture',()=>{})",
  );
  await assert.rejects(selectSpecTests([], dir), /Undeclared/);
  await rm(path.join(dir, 'alpha', 'tests', 'TC-999.test.js'));
  await rm(path.join(dir, 'alpha', 'SPEC.md'));
  await assert.rejects(selectSpecTests([], dir), /missing SPEC/);
  await writeFile(path.join(dir, 'alpha', 'SPEC.md'), '# no cases');
  await assert.rejects(selectSpecTests([], dir), /no declared/);
});
