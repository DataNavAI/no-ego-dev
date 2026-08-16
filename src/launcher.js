import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';

const launcherRoot = dirname(fileURLToPath(import.meta.url));

export function needsDaytona(argv) {
  const [command, ...flags] = argv;
  if (['--version', 'version', '--help', '-h', 'help'].includes(command)) return false;
  return command === 'create' ? !flags.includes('--dry-run') : Boolean(command);
}

export function buildLaunchEnvironment({ baseEnv = process.env, token }) {
  const env = { ...baseEnv };
  if (token) env.DAYTONA_API_KEY = token;
  else delete env.DAYTONA_API_KEY;
  return env;
}

function readKeychainToken() {
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'no-ego-dev/daytona', '-a', 'DAYTONA_API_KEY', '-w'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readFileToken(home) {
  try {
    return readFileSync(join(home, '.config/ned/daytona-api-key'), 'utf8').split(/\r?\n/, 1)[0];
  } catch {
    return '';
  }
}

async function promptHidden() {
  if (!process.stdin.isTTY) throw new Error('NED: interactive terminal required to enter the Daytona API key.');
  const tty = createReadStream('/dev/tty');
  const readline = createInterface({ input: tty, output: process.stderr, terminal: true });
  const ttyFd = tty.fd;
  if (ttyFd === undefined) throw new Error('NED: interactive terminal required to enter the Daytona API key.');
  spawnSync('stty', ['-echo'], { stdio: ['ignore', ttyFd, ttyFd] });
  try {
    const value = await readline.question('Daytona API key (input hidden): ');
    process.stderr.write('\n');
    return value;
  } finally {
    spawnSync('stty', ['echo'], { stdio: ['ignore', ttyFd, ttyFd] });
    readline.close();
    tty.destroy();
  }
}

async function defaultReadCredential(home) {
  if (process.platform === 'darwin') {
    const keychain = readKeychainToken();
    if (keychain) return keychain;
  }
  const stored = readFileToken(home);
  if (stored) return stored;
  const token = await promptHidden();
  if (!token) throw new Error('NED: Daytona API key cannot be empty.');
  return token;
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
  const token = needsDaytona(argv)
    ? await (options.readCredential || defaultReadCredential)(home)
    : undefined;
  const child = (options.spawn || spawn)(options.node || process.execPath, [appEntry, ...argv], {
    env: buildLaunchEnvironment({ baseEnv: env, token }),
    stdio: 'inherit',
  });
  if (options.spawn) return child.status ?? 0;
  return await new Promise((resolve) => child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0))));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runLauncher(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
