import test from 'node:test';
import assert from 'node:assert/strict';
import { createAcceptanceController, ACCEPTANCE_COMMANDS } from '../../scripts/qa/telegram-acceptance-controller.js';

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

test('controller keeps the lifecycle alive between explicit human confirmations', async () => {
  const first = deferred();
  const second = deferred();
  const calls = [];
  const output = [];
  const controller = createAcceptanceController({
    run: async (args) => { calls.push(args); return 0; },
    waitForCommand: async () => calls.some((args) => args[0] === 'repair') ? second.promise : first.promise,
    write: (line) => output.push(line),
    timeoutMs: 1000,
  });

  const running = controller.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [['create']]);
  assert.deepEqual(output, ['READY_FOR_TELEGRAM @NEDTestBot']);

  first.resolve(ACCEPTANCE_COMMANDS.firstResponse);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [['create'], ['repair']]);
  assert.deepEqual(output, [
    'READY_FOR_TELEGRAM @NEDTestBot',
    'READY_FOR_MARKER_B @NEDTestBot',
  ]);

  second.resolve(ACCEPTANCE_COMMANDS.secondResponse);
  const result = await running;
  assert.deepEqual(result, { status: 'complete', cleanupExitCode: 0 });
  assert.deepEqual(calls, [['create'], ['repair'], ['destroy', '--yes']]);
});

test('controller destroys after timeout and never claims response success', async () => {
  const calls = [];
  const output = [];
  const result = await createAcceptanceController({
    run: async (args) => { calls.push(args); return 0; },
    waitForCommand: async () => {
      const error = new Error('timeout waiting for human confirmation');
      error.code = 'ACCEPTANCE_TIMEOUT';
      throw error;
    },
    write: (line) => output.push(line),
    timeoutMs: 1000,
  }).run();

  assert.deepEqual(result, { status: 'timed_out', cleanupExitCode: 0 });
  assert.deepEqual(calls, [['create'], ['destroy', '--yes']]);
  assert.deepEqual(output, ['READY_FOR_TELEGRAM @NEDTestBot']);
});

test('controller destroys when repair fails and exposes no success marker', async () => {
  const calls = [];
  const output = [];
  const result = await createAcceptanceController({
    run: async (args) => {
      calls.push(args);
      return args[0] === 'repair' ? 1 : 0;
    },
    waitForCommand: async () => ACCEPTANCE_COMMANDS.firstResponse,
    write: (line) => output.push(line),
    timeoutMs: 1000,
  }).run();

  assert.deepEqual(result, { status: 'failed', cleanupExitCode: 1 });
  assert.deepEqual(calls, [['create'], ['repair'], ['destroy', '--yes']]);
  assert.deepEqual(output, ['READY_FOR_TELEGRAM @NEDTestBot']);
});
