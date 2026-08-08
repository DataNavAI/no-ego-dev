import { createNedApp } from './app.js';
import { authorizeOpenAICodex } from './auth/openai-codex.js';
import { getModelProviderRuntime } from './model-providers.js';
import { createDryRunPlan } from './plan.js';
import { createProfileArchive } from './profile-archive.js';
import { createDaytonaProvider } from './providers/daytona.js';
import { createFileStateStore } from './state.js';
import { createFileTelemetry, TELEMETRY_EVENTS } from './telemetry.js';
import {
  acquireTelegramConnection,
  CREDENTIALS_DOCS_URL,
  QUICKSTART_DOCS_URL,
  redactTelegramText,
  TELEGRAM_DOCS_URL,
} from './telegram.js';

async function defaultAppFactory({ env }) {
  return createNedApp({
    provider: createDaytonaProvider({
      apiKey: env.DAYTONA_API_KEY,
      profileArchive: createProfileArchive,
    }),
    stateStore: createFileStateStore(),
  });
}

const NOOP_TELEMETRY = { async capture() { return false; } };

function flagValue(flags, name) {
  const index = flags.indexOf(name);
  return index >= 0 ? flags[index + 1] : undefined;
}

function validateV1ModelProvider(flags, io) {
  const providerId = flagValue(flags, '--model-provider') || 'openai-codex';
  if (providerId !== 'openai-codex') {
    io.error('NED V1 defaults to ChatGPT OAuth. Optional provider integrations are available only through documented advanced extension points.');
    return null;
  }
  return providerId;
}

function capture(telemetry, event, startedAt, resultClass) {
  try {
    void telemetry.capture(event, { durationMs: Date.now() - startedAt, resultClass }).catch(() => {});
  } catch {
    // Telemetry must never affect the product operation.
  }
}

export async function runCli(argv, io = console, dependencies = {}) {
  const [command, ...flags] = argv;
  const env = dependencies.env || process.env;
  const appFactory = dependencies.appFactory || defaultAppFactory;
  const getModelConnection = dependencies.getModelConnection || ((options = {}) => authorizeOpenAICodex({
    env,
    io,
    ...options,
  }));
  const getTelegramConnection = dependencies.getTelegramConnection
    || (() => acquireTelegramConnection({ log: (message) => io.log(message) }));
  // Unit-level dependency injection must not accidentally use a developer's real telemetry config.
  const telemetry = dependencies.telemetry
    || (Object.keys(dependencies).length === 0 ? createFileTelemetry() : NOOP_TELEMETRY);

  if (flags.some((flag) => flag === '--telegram-token' || flag.startsWith('--telegram-token='))) {
    io.error(`NED never accepts Telegram tokens through argv, shell history, chat, URLs, logs, or analytics. Use hidden TTY input. See ${TELEGRAM_DOCS_URL}`);
    return 2;
  }

  if (['--help', '-h', 'help'].includes(command)) {
    io.log([
      'NED — private hosted product partner',
      '',
      'Usage:',
      '  ned create [--dry-run --json]',
      '  ned chat "What should NED build?"',
      '  ned doctor',
      '  ned pair <8-character-code>',
      '  ned repair',
      '  ned reset  # legacy alias for repair',
      '  ned destroy --yes',
      '  ned telemetry status',
      '  ned telemetry enable --yes --host <url> --project-key <public-key> --privacy-policy <url>',
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
        await telemetryStore.enable({
          consent: flags.includes('--yes'),
          host: flagValue(flags, '--host'),
          projectKey: flagValue(flags, '--project-key'),
          privacyPolicy: flagValue(flags, '--privacy-policy'),
        });
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
      io.error(`NED telemetry ${action || 'command'} failed: ${redactTelegramText(error.message)}`);
      return 2;
    }
  }

  if (command === 'create' && flags.includes('--dry-run')) {
    const providerId = validateV1ModelProvider(flags, io);
    if (!providerId) return 2;
    const plan = createDryRunPlan({ modelProvider: providerId });
    if (flags.includes('--json')) {
      io.log(JSON.stringify(plan));
    } else {
      io.log('NED create plan');
      io.log(JSON.stringify(plan, null, 2));
    }
    return 0;
  }

  if (command === 'create') {
    const startedAt = Date.now();
    capture(telemetry, TELEMETRY_EVENTS.createStarted, startedAt, 'started');
    const providerId = validateV1ModelProvider(flags, io);
    if (!providerId) {
      capture(telemetry, TELEMETRY_EVENTS.createFailed, startedAt, 'validation_error');
      return 2;
    }
    if (!env.DAYTONA_API_KEY) {
      capture(telemetry, TELEMETRY_EVENTS.createFailed, startedAt, 'validation_error');
      io.error('Daytona authorization required. Create an API key at https://app.daytona.io/dashboard/keys, set DAYTONA_API_KEY in your shell, then rerun ned create. Do not paste secrets into chat.');
      return 2;
    }
    try {
      const provider = getModelProviderRuntime(providerId);
      const modelConnection = await getModelConnection();
      io.log(`Connecting ${provider.label} as your model provider...`);
      const telegramConnection = await getTelegramConnection();
      const botUrl = telegramConnection.botUrl;
      io.log('Creating your private NED workspace and Telegram gateway...');
      const app = await appFactory({ env });
      await app.create({ modelConnection, telegramConnection });
      capture(telemetry, TELEMETRY_EVENTS.createCompleted, startedAt, 'success');
      io.log('✓ Your product partner is ready.');
      io.log(`1. Open ${botUrl}.`);
      io.log('2. Tap Start.');
      io.log('3. Send hello.');
      io.log('4. If the bot sends a pairing code, run: ned pair <code>');
      io.log(`Quickstart and recovery: ${QUICKSTART_DOCS_URL}`);
      return 0;
    } catch (error) {
      capture(telemetry, TELEMETRY_EVENTS.createFailed, startedAt, 'operation_error');
      io.error(`NED create failed: ${redactTelegramText(error.message)}`);
      return 1;
    }
  }

  if (command === 'chat') {
    const startedAt = Date.now();
    if (!env.DAYTONA_API_KEY) {
      capture(telemetry, TELEMETRY_EVENTS.chatFailed, startedAt, 'validation_error');
      io.error('Daytona authorization required. Set DAYTONA_API_KEY in your shell, then rerun ned chat.');
      return 2;
    }
    const prompt = flags.join(' ').trim();
    if (!prompt) {
      capture(telemetry, TELEMETRY_EVENTS.chatFailed, startedAt, 'validation_error');
      io.error('Usage: ned chat "What should NED build?"');
      return 2;
    }
    try {
      const modelConnection = await getModelConnection();
      const app = await appFactory({ env });
      const response = await app.chat(prompt, modelConnection);
      capture(telemetry, TELEMETRY_EVENTS.chatCompleted, startedAt, 'success');
      io.log(response);
      return 0;
    } catch (error) {
      capture(telemetry, TELEMETRY_EVENTS.chatFailed, startedAt, 'operation_error');
      io.error(`NED chat failed: ${redactTelegramText(error.message)}`);
      return 1;
    }
  }

  if (command === 'pair') {
    if (!env.DAYTONA_API_KEY) {
      io.error(`Daytona authorization required. Repair your local Daytona credential, then retry. See ${CREDENTIALS_DOCS_URL}`);
      return 2;
    }
    const code = String(flags[0] || '').toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code) || flags.length !== 1) {
      io.error(`Usage: ned pair <8-character-code>. Send hello to the bot for a fresh code. See ${TELEGRAM_DOCS_URL}`);
      return 2;
    }
    try {
      const app = await appFactory({ env });
      await app.pair(code);
      io.log('✓ Telegram owner approved. Return to the verified bot and send hello again.');
      return 0;
    } catch (error) {
      io.error(`NED pairing failed: ${redactTelegramText(error.message)}`);
      return 1;
    }
  }

  if (['doctor', 'repair', 'reset', 'destroy'].includes(command)) {
    const startedAt = Date.now();
    const completedEvent = {
      doctor: TELEMETRY_EVENTS.doctorCompleted,
      repair: TELEMETRY_EVENTS.resetCompleted,
      reset: TELEMETRY_EVENTS.resetCompleted,
      destroy: TELEMETRY_EVENTS.destroyCompleted,
    }[command];
    if (!env.DAYTONA_API_KEY) {
      io.error(`Daytona authorization required. Set DAYTONA_API_KEY in your shell, then rerun ned ${command}.`);
      return 2;
    }
    if (command === 'destroy' && !flags.includes('--yes')) {
      io.error(`Destroy permanently deletes the NED workspace. Rerun: ned destroy --yes. See ${CREDENTIALS_DOCS_URL}`);
      return 2;
    }
    try {
      const app = await appFactory({ env });
      if (command === 'doctor') {
        const health = await app.doctor(await getModelConnection());
        capture(telemetry, completedEvent, startedAt, health.ok ? 'success' : 'health_check_failed');
        io.log(health.ok ? `✓ NED is healthy: ${health.checks.join(', ')}` : 'NED is not healthy.');
        return health.ok ? 0 : 1;
      }
      if (command === 'repair' || command === 'reset') {
        const health = await app.reset(await getModelConnection());
        capture(telemetry, completedEvent, startedAt, health.ok ? 'success' : 'health_check_failed');
        io.log(health.ok ? '✓ NED was reset and is healthy.' : 'NED reset completed but health checks failed.');
        return health.ok ? 0 : 1;
      }
      await app.destroy();
      capture(telemetry, completedEvent, startedAt, 'success');
      io.log(`✓ NED workspace deleted. Credential revocation and local cleanup: ${CREDENTIALS_DOCS_URL}`);
      return 0;
    } catch (error) {
      io.error(`NED ${command} failed: ${redactTelegramText(error.message)}`);
      return 1;
    }
  }

  io.error('Usage: ned <create|chat|doctor|pair|repair|destroy|telemetry>');
  return 2;
}
