#!/usr/bin/env node

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const home = process.env.HOME;
const appRoot = process.env.NED_APP_ROOT || join(home, '.local/share/ned/current/app');
const { runLauncher } = await import(pathToFileURL(join(appRoot, 'src/launcher.js')).href);

try {
  process.exitCode = await runLauncher(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
