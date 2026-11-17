import path from 'node:path';

export const smallTests = new Set([
  'tests/cli/model-providers.test.js',
  'tests/cli/web-client-runtime.test.js',
  'docs/features/communicator/tests/TC-032.test.js',
  'docs/features/communicator/tests/TC-036.test.js',
  'docs/features/test-suites/tests/TC-001.test.js',
]);

export function testBucket(filename) {
  return smallTests.has(filename.split(path.sep).join('/')) ? 'small' : 'medium';
}

export function suitePlan(bucket, args = [], env = process.env) {
  if (!['small', 'medium', 'large', 'eval'].includes(bucket))
    throw new Error('Choose small, medium, large or eval. See TESTING.md.');
  if (bucket === 'large') {
    if (args[0] === '--container')
      return [{ command: 'python', args: ['docs/features/standalone-container/tests/container_acceptance.py', ...args.slice(1)] }];
    if (args.length !== 2 || args[0] !== '--url')
      throw new Error('Use test:large -- --url https://staging.ned.datanav.app/ or --container. No staging target is implicit.');
    const target = new URL(args[1]);
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.port ||
      !(target.hostname === 'staging.ned.datanav.app' || target.hostname.endsWith('.proxy.staging.hub.datanav.app')))
      throw new Error('Large browser tests require an explicit HTTPS NED staging URL without credentials, query or fragment.');
    if (!target.pathname.endsWith('/')) target.pathname += '/';
    return [{ command: process.execPath, args: ['scripts/test-staging.mjs', target.href] }];
  }
  if (bucket === 'eval') {
    if (!args.length || args[0].startsWith('-'))
      throw new Error('Select an EVAL.yaml or skill folder: npm run test:eval -- skills/<name> [eval_runner options]. This may make paid model calls.');
    return [{ command: 'python', args: ['-m', 'eval_runner.cli', ...args] }];
  }
  if (args.length && !(bucket === 'medium' && args.length === 2 && args[0] === '--feature' && args[1] === 'core-orchestration'))
    throw new Error('Local buckets accept no options; test:core is the focused Core alias. Use test:spec for case selectors.');
  const focused = args.length > 0;
  const steps = focused ? [] : [{ kind: 'cli', bucket }];
  steps.push({ command: process.execPath, args: ['scripts/run-spec-tests.mjs', ...(focused ? args : ['--all']), '--bucket', bucket] });
  if (bucket === 'medium') {
    const cache = env.NED_HERMES_TEST_CACHE || path.join(env.NED_TEST_CACHE || env.TMPDIR || env.TEMP || '/tmp', 'ned-test-cache', 'hermes');
    if (!path.isAbsolute(cache)) throw new Error('Test cache must be an absolute path outside the checkout.');
    if (!focused) steps.push({ command: 'python', args: ['-m', 'pytest'] });
    steps.push({ command: process.execPath, args: ['scripts/test-core-hermes.mjs'], env: {
      NED_HERMES_TEST_CACHE: cache,
    } });
  }
  return steps;
}
