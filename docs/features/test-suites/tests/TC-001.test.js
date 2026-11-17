import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { suitePlan, testBucket } from '../../../../scripts/test-suites.mjs';

test('TC-001: local buckets select each boundary once and Core is a focused medium suite', () => {
  const small = suitePlan('small');
  assert.equal(small.length, 2);
  assert.deepEqual(small[1].args, ['scripts/run-spec-tests.mjs', '--all', '--bucket', 'small']);
  const medium = suitePlan('medium', [], {});
  assert.deepEqual(medium.map(step => step.kind || step.args[0]), ['cli', 'scripts/run-spec-tests.mjs', '-m', 'scripts/test-core-hermes.mjs']);
  assert.deepEqual(medium[2].args, ['-m', 'pytest']);
  assert(path.isAbsolute(medium[3].env.NED_HERMES_TEST_CACHE));
  assert.equal(suitePlan('medium', [], { NED_HERMES_TEST_CACHE: '/external/hermes' })[3].env.NED_HERMES_TEST_CACHE, '/external/hermes');
  const core = suitePlan('medium', ['--feature', 'core-orchestration'], {});
  assert.equal(core.length, 2);
  assert.deepEqual(core[0].args, ['scripts/run-spec-tests.mjs', '--feature', 'core-orchestration', '--bucket', 'medium']);
  assert.equal(core[1].args[0], 'scripts/test-core-hermes.mjs');
  assert.equal(testBucket('tests/cli/model-providers.test.js'), 'small');
  assert.equal(testBucket('tests/cli/new-integration.test.js'), 'medium');
});

test('TC-001: staging/container and paid evals are explicit and retain their arguments', () => {
  const args = ['skills/test-writing', '--hermes-command', 'synthetic-agent'];
  assert.deepEqual(suitePlan('eval', args)[0].args, ['-m', 'eval_runner.cli', ...args]);
  assert.equal(args.length, 3);
  assert.deepEqual(suitePlan('large', ['--container', '--image', 'synthetic'])[0].args, ['docs/features/standalone-container/tests/container_acceptance.py', '--image', 'synthetic']);
  assert.deepEqual(suitePlan('large', ['--url', 'https://instance.proxy.staging.hub.datanav.app/prefix'])[0].args, ['scripts/test-staging.mjs', 'https://instance.proxy.staging.hub.datanav.app/prefix/']);
  assert.equal(suitePlan('large', ['--url', 'https://staging.ned.datanav.app/']).length, 1);
  for (const [bucket, args, env] of [
    ['unknown', []], ['eval', []], ['eval', ['--all']], ['large', []], ['small', ['--feature', 'x']],
    ['medium', [], { NED_HERMES_TEST_CACHE: 'relative' }],
    ...['http://staging.ned.datanav.app/', 'https://ned.datanav.app/', 'https://staging.ned.datanav.app.attacker.invalid/', 'https://user:secret@staging.ned.datanav.app/', 'https://staging.ned.datanav.app/?token=secret', 'https://staging.ned.datanav.app/#secret'].map(url => ['large', ['--url', url]]),
  ]) assert.throws(() => suitePlan(bucket, args, env));
});
