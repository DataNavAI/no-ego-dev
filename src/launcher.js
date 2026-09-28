import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
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

export function buildLaunchEnvironment({ baseEnv = process.env }) {
  const env = { ...baseEnv };
  delete env.DAYTONA_API_KEY;
  return env;
}

export async function defaultReadCredential() {
  throw new Error('NED: Daytona authorization is available only from the owner-only runtime credential file. Environment variables, Keychain, config files, and TTY entry are not accepted.');
}

async function runChild(node, appEntry, argv, env) {
  const child = spawn(node, [appEntry, ...argv], {
    env,
    stdio: ['inherit', 'inherit', 'pipe'],
  });
  let rawStderr = '';
  let pendingOutput = '';
  const credentials = [];
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
  if (options.spawn) {
    const child = options.spawn(node, [appEntry, ...argv], {
      env: buildLaunchEnvironment({ baseEnv: env }),
      stdio: 'inherit',
    });
    return child.status ?? 0;
  }
  const result = await runChild(node, appEntry, argv, buildLaunchEnvironment({ baseEnv: env }));
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
