#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createAcceptanceController, ACCEPTANCE_COMMANDS } from './telegram-acceptance-controller.js';

if (!process.argv.includes('--confirm-lifecycle')) {
  console.error('Refusing automated lifecycle without explicit --confirm-lifecycle.');
  process.exit(2);
}

function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['bin/ned.js', ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', () => resolve(1));
    child.once('exit', (code, signal) => resolve(typeof code === 'number' ? code : (signal ? 1 : 0)));
  });
}

let checkpoint = 0;
const controller = createAcceptanceController({
  run: runCli,
  waitForCommand: async () => {
    checkpoint += 1;
    return checkpoint === 1 ? ACCEPTANCE_COMMANDS.firstResponse : ACCEPTANCE_COMMANDS.secondResponse;
  },
  write: (line) => console.log(line),
});
const result = await controller.run();
console.log(`AUTOMATED_LIFECYCLE status=${result.status} cleanup_exit=${result.cleanupExitCode}`);
console.log('AUTOMATED_LIFECYCLE_LIMITATION user-visible Telegram response delivery was not observed by this command');
process.exitCode = result.status === 'complete' && result.cleanupExitCode === 0 ? 0 : 1;
