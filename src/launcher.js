import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function runChild(node, appEntry, argv, env) {
  const child = spawn(node, [appEntry, ...argv], {
    env,
    stdio: 'inherit',
  });
  const forwardSignal = signal => child.kill(signal);
  const interrupt = () => forwardSignal('SIGINT');
  const terminate = () => forwardSignal('SIGTERM');
  if (['com','hub'].includes(argv[0])) { process.on('SIGINT', interrupt); process.on('SIGTERM', terminate); }
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
    });
  } finally {
    if (['com','hub'].includes(argv[0])) { process.off('SIGINT', interrupt); process.off('SIGTERM', terminate); }
  }
  return code;
}

export async function runLauncher(argv, options = {}) {
  const env = options.env || process.env;
  const home = options.home || env.HOME;
  if (!home) throw new Error('HOME must be set');
  const generation = options.generation || join(home, '.local/share/ned/current');
  const exists = options.exists || existsSync;
  if (!exists(generation)) throw new Error('NED: active installation is missing; rerun the installer.');
  const appEntry = join(generation, 'app/bin/ned.js');
  if (!exists(appEntry)) throw new Error('NED: active installation is incomplete; rerun the installer.');
  const node = options.node || process.execPath;
  if (options.spawn) {
    const child = options.spawn(node, [appEntry, ...argv], {
      env: { ...env },
      stdio: 'inherit',
    });
    return child.status ?? 0;
  }
  return runChild(node, appEntry, argv, { ...env });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runLauncher(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
