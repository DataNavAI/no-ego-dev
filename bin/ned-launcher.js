#!/usr/bin/env node

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const home = process.env.HOME;
const launcherModule = process.env.NED_LAUNCHER_MODULE || join(home, '.local/share/ned/launcher-runtime.js');
const { runLauncher } = await import(pathToFileURL(launcherModule).href);

try {
  process.exitCode = await runLauncher(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
