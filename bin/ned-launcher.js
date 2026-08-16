#!/usr/bin/env node

import { runLauncher } from '../src/launcher.js';

try {
  process.exitCode = await runLauncher(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
