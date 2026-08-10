#!/usr/bin/env node
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createAcceptanceController, ACCEPTANCE_COMMANDS } from './telegram-acceptance-controller.js';

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['bin/ned.js', ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      detached: true,
    });
    child.once('error', () => resolve(1));
    child.once('exit', (code, signal) => {
      resolve(typeof code === 'number' ? code : (signal ? 1 : 0));
    });
  });
}

function createCommandWaiter() {
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  let abort;
  let interrupted = false;
  return {
    waitForCommand(timeoutMs) {
      if (interrupted) return Promise.resolve(ACCEPTANCE_COMMANDS.abort);
      return new Promise((resolve, reject) => {
        let timer;
        const finish = (callback, value) => {
          clearTimeout(timer);
          abort = undefined;
          input.removeListener('line', onLine);
          callback(value);
        };
        const onLine = (line) => {
          const command = line.trim();
          if (!Object.values(ACCEPTANCE_COMMANDS).includes(command)) return;
          finish(resolve, command);
        };
        abort = () => finish(resolve, ACCEPTANCE_COMMANDS.abort);
        timer = setTimeout(() => {
          const error = new Error('acceptance confirmation timed out');
          error.code = 'ACCEPTANCE_TIMEOUT';
          finish(reject, error);
        }, timeoutMs);
        input.on('line', onLine);
        process.stdout.write('Confirmation command required; message text is never collected: ');
      });
    },
    abort() {
      interrupted = true;
      abort?.();
    },
    close() {
      input.close();
    },
  };
}

const waiter = createCommandWaiter();
const controller = createAcceptanceController({
  run: runCli,
  waitForCommand: waiter.waitForCommand,
  write: (line) => console.log(line),
});
const interrupt = () => {
  waiter.abort();
};
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

console.log('Manual V1 Telegram acceptance controller.');
console.log('Use only: first-response-confirmed, second-response-confirmed, or abort.');
try {
  const result = await controller.run();
  console.log(`LIFECYCLE_COMPLETE status=${result.status} cleanup_exit=${result.cleanupExitCode}`);
  process.exitCode = result.status === 'complete' && result.cleanupExitCode === 0 ? 0 : 1;
} finally {
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  waiter.close();
}
