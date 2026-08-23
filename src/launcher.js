import { existsSync, readFileSync, openSync, closeSync, readSync, writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { redactTelegramText } from './telegram.js';

const launcherRoot = dirname(fileURLToPath(import.meta.url));

function redactStreamedStderr(value, credentials) {
  let redacted = redactTelegramText(value);
  for (const credential of credentials) {
    const secret = String(credential ?? '');
    if (secret) redacted = redacted.split(secret).join('[REDACTED]');
  }
  return redacted;
}

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

export async function readHiddenDaytonaKey(prompt = 'Daytona API key (input hidden): ') {
  let ttyFd;
  let echoDisabled = false;
  try {
    ttyFd = openSync('/dev/tty', 'r+');
    echoDisabled = spawnSync('stty', ['-echo'], { stdio: [ttyFd, 'ignore', 'ignore'] }).status === 0;
    if (!echoDisabled) throw new Error('Could not disable terminal echo');
    writeSync(ttyFd, prompt);
    const byte = Buffer.alloc(1);
    let value = '';
    while (true) {
      const bytesRead = readSync(ttyFd, byte, 0, 1, null);
      if (bytesRead === 0) break;
      const character = byte.toString('utf8', 0, bytesRead);
      if (character === '\r' || character === '\n') break;
      if (character === '\u0003' || character === '\u0004') {
        throw new Error('Daytona API key entry cancelled.');
      }
      if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
      else value += character;
    }
    writeSync(ttyFd, '\n');
    return value;
  } catch (error) {
    if (error?.message === 'Daytona API key entry cancelled.') throw error;
    throw new Error('NED: interactive terminal with hidden input is required to enter the Daytona API key.');
  } finally {
    if (echoDisabled) spawnSync('stty', ['echo'], { stdio: [ttyFd, 'ignore', 'ignore'] });
    if (ttyFd !== undefined) closeSync(ttyFd);
  }
}

export async function defaultReadCredential(home, env = process.env) {
  if (env.DAYTONA_API_KEY?.trim()) return env.DAYTONA_API_KEY.trim();
  if (process.platform === 'darwin') {
    const keychain = readKeychainToken();
    if (keychain) return keychain;
  }
  const stored = readFileToken(home);
  if (stored) return stored;
  const token = await readHiddenDaytonaKey();
  if (!token) throw new Error('NED: Daytona API key cannot be empty.');
  return token;
}

async function runChild(node, appEntry, argv, env) {
  const child = spawn(node, [appEntry, ...argv], {
    env,
    stdio: ['inherit', 'inherit', 'pipe'],
  });
  let rawStderr = '';
  let pendingOutput = '';
  const credentials = [env.DAYTONA_API_KEY];
  const writeRedactedLines = (flush = false) => {
    let newline;
    while ((newline = pendingOutput.indexOf('\n')) !== -1) {
      const line = pendingOutput.slice(0, newline + 1);
      pendingOutput = pendingOutput.slice(newline + 1);
      process.stderr.write(redactStreamedStderr(line, credentials));
    }
    if (flush && pendingOutput) {
      process.stderr.write(redactStreamedStderr(pendingOutput, credentials));
      pendingOutput = '';
    }
  };
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    rawStderr += text;
    pendingOutput += text;
    writeRedactedLines();
  });
  const code = await new Promise((resolve) => child.once('close', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0))));
  writeRedactedLines(true);
  return { code, rejectedKey: /(?:HTTP\s+401|API key was rejected)/i.test(rawStderr) };
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
  const readCredential = options.readCredential || defaultReadCredential;
  const promptCredential = options.promptCredential || readHiddenDaytonaKey;
  let token = needsDaytona(argv) ? await readCredential(home, env) : undefined;
  if (options.spawn) {
    const child = options.spawn(node, [appEntry, ...argv], {
      env: buildLaunchEnvironment({ baseEnv: env, token }),
      stdio: 'inherit',
    });
    return child.status ?? 0;
  }
  let result = await runChild(node, appEntry, argv, buildLaunchEnvironment({ baseEnv: env, token }));
  if (token && result.rejectedKey) {
    process.stderr.write('Daytona API key rejected. Enter a replacement key (input hidden):\n');
    token = await promptCredential();
    if (!token) throw new Error('NED: Daytona API key cannot be empty.');
    result = await runChild(node, appEntry, argv, buildLaunchEnvironment({ baseEnv: env, token }));
  }
  return result.code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runLauncher(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
