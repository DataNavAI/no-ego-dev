import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access, mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { selectSpecTests } from '../../../../scripts/run-spec-tests.mjs';
import { smallTests, testBucket } from '../../../../scripts/test-suites.mjs';

test('TC-002: small and medium are a disjoint complete partition of every active spec and CLI test', async () => {
  const all = await selectSpecTests(['--all']);
  const small = await selectSpecTests(['--all', '--bucket', 'small']);
  const medium = await selectSpecTests(['--all', '--bucket', 'medium']);
  const files = entries => entries.map(entry => entry.file).sort();
  assert.deepEqual(files([...small, ...medium]), files(all));
  assert.equal(new Set(files([...small, ...medium])).size, all.length);
  for (const filename of smallTests) await access(filename);
  const cli = (await readdir('tests/cli')).filter(name => name.endsWith('.test.js')).map(name => `tests/cli/${name}`);
  assert.equal(cli.filter(file => testBucket(file) === 'small').length + cli.filter(file => testBucket(file) === 'medium').length, cli.length);
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.test, 'npm run test:small && npm run test:medium');
  assert.equal(pkg.scripts['test:all'], 'npm test');
  for (const bucket of ['small', 'medium', 'large', 'eval']) assert.equal(pkg.scripts[`test:${bucket}`], `node scripts/run-tests.mjs ${bucket}`);
});

test('TC-002: invalid opt-in invocations exit nonzero instead of pretending external acceptance passed', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const bucket of ['large', 'eval', 'unknown']) {
    const result = spawnSync(process.execPath, ['scripts/run-tests.mjs', bucket], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, bucket === 'large' ? /No staging target is implicit/ : bucket === 'eval' ? /Select an EVAL.yaml/ : /Choose small/);
    assert.doesNotMatch(result.stdout, /PASS|Running/);
  }
});

test('TC-002: eval dispatcher preserves explicit output root in both argparse forms without starting an agent', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'ned-eval-dispatch-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const python = path.join(temporary, 'python');
  await writeFile(python, `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`);
  await chmod(python, 0o700);
  const output = path.join(temporary, 'chosen-reports');
  for (const flags of [['--output-root', output], [`--output-root=${output}`]]) {
    const env = { ...process.env, PATH: `${temporary}${path.delimiter}${process.env.PATH}`, NED_TEST_CACHE: temporary };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['scripts/run-tests.mjs', 'eval', 'skills/test-writing', ...flags], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    const forwarded = JSON.parse(result.stdout.split('\n').find(line => line.startsWith('[')));
    assert.deepEqual(forwarded, ['-m', 'eval_runner.cli', 'skills/test-writing', ...flags]);
  }
});
