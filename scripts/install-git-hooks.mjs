import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const repository = git(['rev-parse', '--show-toplevel']);
if (repository.status !== 0 || realpathSync(repository.stdout.trim()) !== realpathSync(root)) {
  console.error('Hook installation requires a NED Git checkout.');
  process.exit(1);
}
const existing = git(['config', '--get', 'core.hooksPath']);
if (existing.status !== 0 && existing.status !== 1) {
  console.error('Cannot read the existing Git hooks configuration.');
  process.exit(1);
}
if (existing.stdout.trim() && existing.stdout.trim() !== '.githooks') {
  console.error('A different core.hooksPath is configured; preserve it and integrate NED checks before changing it.');
  process.exit(1);
}
const installed = git(['config', '--local', 'core.hooksPath', '.githooks']);
if (installed.status !== 0) {
  console.error('Could not install NED Git hooks.');
  process.exit(1);
}
console.log('NED pre-commit hook installed for this checkout.');
