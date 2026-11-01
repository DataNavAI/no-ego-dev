import {runSecretCli} from './secret-cli.js';
import { createRequire } from 'node:module';
import { runCommunicatorCli } from './communicator/cli.js';
import { runTaskCli } from './task-cli.js';
import { createFileTelemetry } from './telemetry.js';

const require = createRequire(import.meta.url);
const { version: NED_VERSION } = require('../package.json');

function flagValue(flags, name) {
  const index = flags.indexOf(name);
  return index >= 0 ? flags[index + 1] : undefined;
}

export async function runCli(argv, io = console, dependencies = {}) {
  const [command, ...flags] = argv;
  if (command === 'secret') return runSecretCli(flags, io, dependencies);
  if (command === 'com') return runCommunicatorCli(flags, io, dependencies);
  if (['goal', 'subgoal', 'task', 'issue', 'ready', 'status', 'tree'].includes(command)) {
    return runTaskCli(argv, io, dependencies);
  }
  if (command === '--version' || command === 'version') {
    io.log(NED_VERSION);
    return 0;
  }

  if (['--help', '-h', 'help'].includes(command)) {
    io.log([
      `NED — local project tasks and Hermes profile (version ${NED_VERSION})`,
      '',
      'Usage:',
      '  ned --version',
      '  ned secret <list|set|get|delete|share> (see ned secret --help)',
      '  ned com [--login [--no-browser] | --logout] [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--public] [--help]',
      '  ned version',
      '  ned task init [--project <directory>] [--database <SQLite-path-or-file-URL>]',
      '  ned <goal|subgoal|task|issue> create <title> [--parent <id>] [--json]',
      '  ned task create <title> [--goal <milestone-id>] [--json]',
      '  ned task <list|get|start|block|unblock|done|history|children> [id] [--json]',
      '  ned <ready|status|tree> [--json]',
      '  ned telemetry status',
      '  ned telemetry enable --yes  # centralized NED metrics (custom collector flags are optional)',
      '  ned telemetry disable',
      '  ned telemetry delete',
    ].join('\n'));
    return 0;
  }

  if (command === 'telemetry') {
    const [action] = flags;
    const telemetryStore = dependencies.telemetry || createFileTelemetry();
    try {
      if (action === 'status') {
        const status = await telemetryStore.status();
        io.log(status.enabled
          ? `Telemetry enabled. Collector: ${status.host}; privacy policy: ${status.privacyPolicy}; schema: ${status.schemaVersion}.`
          : 'Telemetry disabled.');
        return 0;
      }
      if (action === 'enable') {
        const telemetryOptions = { consent: flags.includes('--yes') };
        const optionNames = { host: 'host', 'project-key': 'projectKey', 'privacy-policy': 'privacyPolicy' };
        for (const name of Object.keys(optionNames)) {
          const value = flagValue(flags, `--${name}`);
          if (value !== undefined) telemetryOptions[optionNames[name]] = value;
        }
        await telemetryStore.enable(telemetryOptions);
        io.log('Telemetry enabled with affirmative consent. No prompts, responses, or workspace identifiers are collected.');
        return 0;
      }
      if (action === 'disable') {
        await telemetryStore.disable();
        io.log('Telemetry disabled. The local random installation ID is retained; run `ned telemetry delete` to remove it.');
        return 0;
      }
      if (action === 'delete') {
        await telemetryStore.delete();
        io.log('Local telemetry configuration and installation ID deleted.');
        return 0;
      }
      io.error('Usage: ned telemetry <status|enable|disable|delete>');
      return 2;
    } catch (error) {
      io.error(`NED telemetry ${action || 'command'} failed: ${error.message}`);
      return 2;
    }
  }

  io.error('Usage: ned <task|goal|subgoal|issue|ready|status|tree|com|telemetry> (see ned --help)');
  return 2;
}
