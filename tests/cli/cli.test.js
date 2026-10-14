import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { runCli } from '../../src/cli.js';

test('CLI reports version and current local usage without credentials', () => {
  for (const args of [['--version'], ['version']]) {
    const result = spawnSync(process.execPath, ['bin/ned.js', ...args], { encoding: 'utf8', env: { PATH: '/nonexistent' }, timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '0.2.1');
    assert.equal(result.stderr, '');
  }
});

test('help lists retained local capabilities and unknown commands explain task usage', async () => {
  const stdout = [], stderr = [];
  const io = { log: value => stdout.push(value), error: value => stderr.push(value) };
  assert.equal(await runCli(['--help'], io), 0);
  assert.match(stdout.join('\n'), /ned task init/);
  assert.match(stdout.join('\n'), /ned com/);
  assert.doesNotMatch(stdout.join('\n'), /ned (chat|doctor|pair|repair|reset|destroy)|Daytona/);
  assert.equal(await runCli(['unknown'], io), 2);
  assert.match(stderr[0], /Usage: ned .*task/);
});
