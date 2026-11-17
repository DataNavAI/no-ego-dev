import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { suitePlan, testBucket } from './test-suites.mjs';
import { runCommand } from './core-hermes-support.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [bucket, ...args] = process.argv.slice(2);
const controller = new AbortController();
const interrupt = () => controller.abort(new Error('Test suite interrupted.'));
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
try {
  const plan = suitePlan(bucket, args);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  if (bucket === 'medium') {
    await runCommand('python', ['-c', 'import pytest, yaml'], { cwd: root, env, signal: controller.signal });
    await runCommand('uv', ['--version'], { cwd: root, env, signal: controller.signal });
  }
  if (bucket === 'eval' && !args.some(option => option === '--output-root' || option.startsWith('--output-root='))) {
    const output = path.join(env.NED_TEST_CACHE || tmpdir(), 'ned-eval-runs');
    if (!path.isAbsolute(output) || output === root || output.startsWith(root)) throw new Error('Eval output must be outside the checkout.');
    await mkdir(output, { recursive: true });
    plan[0].args.push('--output-root', output);
  }
  console.log(`NED ${bucket} suite${bucket === 'eval' ? ' (model-backed behavioral evaluation; may incur provider costs)' : ''}`);
  for (const step of plan) {
    if (step.kind === 'cli') {
      const files = (await readdir(path.join(root, 'tests/cli'))).filter(name => name.endsWith('.test.js'))
        .map(name => `tests/cli/${name}`).filter(name => testBucket(name) === bucket).sort();
      if (!files.length) throw new Error(`No ${bucket} CLI tests found.`);
      step.command = process.execPath;
      step.args = ['--test', ...files];
    }
    console.log(`Running ${step.args[0]}${step.args[1] === 'pytest' ? ' pytest' : ''}`);
    await runCommand(step.command, step.args, { cwd: root, env: { ...env, ...step.env }, signal: controller.signal, timeout: bucket === 'eval' ? 7200000 : 1800000 });
  }
  console.log(`NED ${bucket} suite PASS`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
}
