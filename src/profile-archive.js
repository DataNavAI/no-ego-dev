import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tar from 'tar';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_PATHS = [
  'distribution.yaml',
  'SOUL.md',
  'AGENTS.md',
  'config.yaml',
  'skills',
  'eval_runner',
  'evaldata',
  '.env.EXAMPLE',
  'LICENSE',
  'README.md',
  'README.ko.md',
];

export async function createProfileArchive() {
  const chunks = [];
  const archive = tar.create({
    cwd: packageRoot,
    gzip: true,
    portable: true,
    noMtime: true,
    filter: (entry) => !entry.split('/').includes('__pycache__') && !entry.endsWith('.pyc'),
  }, PROFILE_PATHS);
  for await (const chunk of archive) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
