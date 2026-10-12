import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { createTaskService } from '../../../../src/tasks.js';
import { openNedDatabase } from '../../../../src/database.js';
import { runCli } from '../../../../src/cli.js';
export { assert, createTaskService, openNedDatabase, runCli, spawnSync, spawn };
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ned-spec-'));
  const home = path.join(directory, 'home'),
    project = path.join(directory, 'P'),
    other = path.join(directory, 'Q');
  await Promise.all([mkdir(home), mkdir(project), mkdir(other)]);
  const databaseUrl = path.join(home, '.ned', 'ned.sqlite');
  const services = [],
    databases = [];
  t.after(async () => {
    services.forEach((s) => s.close());
    databases.forEach((d) => d.close());
    await rm(directory, { recursive: true, force: true });
  });
  const options = { home, project, databaseUrl, actor: 'agent:first', env: {} };
  async function service(extra = {}, initialize = true) {
    const s = await createTaskService({ ...options, ...extra });
    services.push(s);
    if (initialize) await s.initialize();
    return s;
  }
  function database(extra = {}) {
    const d = openNedDatabase({ ...options, ...extra });
    databases.push(d);
    return d;
  }
  async function cli(args, extra = {}) {
    const stdout = [],
      stderr = [];
    const code = await runCli(
      [...args, '--project', project, '--database', databaseUrl, '--actor', 'agent:first'],
      { log: (s) => stdout.push(s), error: (s) => stderr.push(s) },
      { env: {}, taskHome: home, ...extra },
    );
    return { code, stdout, stderr };
  }
  function processCli(args, extraEnv = {}, cwd = root) {
    return spawnSync(
      process.execPath,
      [
        path.join(root, 'bin/ned.js'),
        ...args,
        '--project',
        project,
        '--database',
        databaseUrl,
        '--actor',
        'agent:first',
      ],
      { cwd, env: { ...process.env, HOME: home, ...extraEnv }, encoding: 'utf8', timeout: 15_000 },
    );
  }
  return {
    directory,
    home,
    project,
    other,
    databaseUrl,
    options,
    service,
    database,
    cli,
    processCli,
  };
}
export async function rejectsCode(operation, code) {
  await assert.rejects(operation, (error) => error.code === code);
}
export async function complete(s, id) {
  await s.startTask(id);
  return s.completeTask(id, 'Verified');
}
export async function worker(args) {
  const child = spawn(
    process.execPath,
    [path.join(root, 'docs/features/task-management/tests/worker.js'), ...args],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let out = '',
    err = '';
  child.stdout.on('data', (c) => (out += c));
  child.stderr.on('data', (c) => (err += c));
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  return { code, stdout: out, stderr: err };
}
