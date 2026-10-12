import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { specExecutionPassed } from '../../../../scripts/run-spec-tests.mjs';
test('TC-002: only fully executed passing cases satisfy the commit gate', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ned-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'fixture/tests'), { recursive: true });
  await writeFile(
    path.join(dir, 'fixture/SPEC.md'),
    '### TC-001: Fixture\n- Journey / requirements: CUJ-001 / FR-001.\n',
  );
  await mkdir(path.join(dir, 'manual'));
  await writeFile(path.join(dir, 'manual/SPEC.md'),
    '### TC-002: Agent evaluation\n- Journey / requirements: CUJ-002 / FR-004.\n- Level / automation: manual; separate evidence.\n');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const module = pathToFileURL(path.join(root, 'scripts/run-spec-tests.mjs')).href;
  const worker = path.join(dir, 'gate.mjs');
  await writeFile(
    worker,
    `import {runSpecTests} from ${JSON.stringify(module)}; process.exitCode=await runSpecTests(process.argv.slice(3),process.argv[2]);`,
  );
  const examples = [
    ['pass', "test('TC-001: fixture',()=>{});", 0],
    ['fail', "test('TC-001: fixture',()=>{throw Error('synthetic failure')});", 1],
    ['skip', "test('TC-001: fixture',{skip:true},()=>{});", 1],
    ['todo', "test('TC-001: fixture',{todo:true},()=>{});", 1],
    [
      'cancel',
      "const controller=new AbortController();test('TC-001: fixture',{signal:controller.signal},()=>new Promise(()=>{}));controller.abort();",
      1,
    ],
    ['signal', "test('TC-001: fixture',()=>process.kill(process.pid,'SIGTERM'));", 1],
  ];
  for (const [name, body, expected] of examples) {
    await writeFile(
      path.join(dir, 'fixture/tests/TC-001.test.js'),
      `import {test} from 'node:test';${body}`,
    );
    const child = spawnSync(process.execPath, [worker, dir, '--all'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(child.status, expected, `${name}: ${child.stderr}`);
    assert.match(child.stdout, /Manual cases NOT RUN: manual\/TC-002/);
    if (name === 'pass') assert.match(child.stdout, /^# tests 1$/m);
  }
  const manualOnly = spawnSync(process.execPath, [worker, dir, '--feature', 'manual'],
    { encoding: 'utf8', timeout: 5000 });
  assert.notEqual(manualOnly.status, 0);
  assert.match(manualOnly.stderr, /manual cases require separate evaluation/);
  assert.equal(
    specExecutionPassed(0, '# tests 1\n# fail 0\n# skipped 0\n# cancelled 0\n# todo 0'),
    true,
  );
  for (const [code, out] of [
    [null, '# tests 1\n# fail 0'],
    [1, '# tests 1\n# fail 0'],
    [0, '# tests 0\n# fail 0'],
    [0, ''],
    [0, '# tests 1\n# fail 0\n# skipped 1'],
  ])
    assert.equal(specExecutionPassed(code, out), false);
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts.test.includes('npm run test:spec -- --all'));
  assert.ok(pkg.scripts['test:spec'].includes('run-spec-tests'));
});
