import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function createFileStateStore({ home = os.homedir() } = {}) {
  const directory = path.join(home, '.ned');
  const statePath = path.join(directory, 'state.json');

  return {
    path: statePath,

    async load() {
      try {
        return JSON.parse(await readFile(statePath, 'utf8'));
      } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
      }
    },

    async save(state) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const temporaryPath = `${statePath}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
      await rename(temporaryPath, statePath);
    },

    async clear() {
      await rm(statePath, { force: true });
    },
  };
}
