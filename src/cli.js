import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);
const { version: NED_VERSION } = require('../package.json');

async function defaultAppFactory({ env, verbose = false, log = () => {}, progress = () => {} }) {
  return createNedApp({
    provider: createDaytonaProvider({
      apiKey: env.DAYTONA_API_KEY,
      verbose,
      log,
      profileArchive: createProfileArchive,
    }),
    stateStore: createFileStateStore(),
    progress,
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

function createVerboseLogger(io, enabled) {
  if (!enabled) return () => {};
  return (message) => io.log(`[verbose] ${redactTelegramText(String(message))}`);
}

export async function runCli(argv, io = console, dependencies = {}) {
  const [command, ...flags] = argv;
  const env = dependencies.env || process.env;
  const verbose = flags.includes('--verbose');
  const verboseLog = createVerboseLogger(io, verbose);
  if (command === '--version' || command === 'version') {
    io.log(NED_VERSION);
    return 0;
  }
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
      `NED — private hosted product partner (version ${NED_VERSION})`,
      '',
      'Usage:',
      '  ned --version',
      '  ned version',
      '  ned create [--dry-run --json] [--verbose]',
      '  ned chat "What should NED build?"',
      '  ned doctor',
      '  ned pair <8-character-code>',
      '  ned repair',
      '  ned reset  # legacy alias for repair',
      '  ned destroy --yes',
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
      io.error('Daytona API authorization is needed to create and manage your private Sandbox. Get a key at https://app.daytona.io/dashboard/keys, grant write:sandboxes, delete:sandboxes, and manage:secrets, set DAYTONA_API_KEY, then rerun ned create. Do not paste secrets into chat.');
      return 2;
    }
    try {
      const provider = getModelProviderRuntime(providerId);
      verboseLog('create: initializing Daytona provider');
      const app = await appFactory({ env, verbose, log: verboseLog, progress: (message) => io.log(message) });
      verboseLog('create: validating Daytona authorization');
      await app.verifyAuthorization?.();
      verboseLog('create: Daytona authorization accepted');
      verboseLog(`create: authorizing ${provider.label}`);
      const modelConnection = await getModelConnection();
      verboseLog(`create: ${provider.label} authorization accepted`);
      io.log(`Connecting ${provider.label} as your model provider...`);
      verboseLog('create: starting Telegram bot setup');
      const telegramConnection = await getTelegramConnection();
      verboseLog(`create: Telegram bot validated as @${telegramConnection.botUsername}`);
      const botUrl = telegramConnection.botUrl;
      io.log('Creating your private NED workspace and Telegram gateway...');
      io.log('This can take a few minutes. NED will print each completed step.');
      verboseLog('create: provisioning Daytona workspace and gateway');
      await app.create({ modelConnection, telegramConnection });
      verboseLog('create: workspace health verified and local state persisted');
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
      io.error('Daytona API authorization is needed to access your existing private Sandbox. Set DAYTONA_API_KEY from a key created at https://app.daytona.io/dashboard/keys, then rerun ned chat.');
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
      const telegramConnection = await getTelegramConnection();
      const response = await app.chat(prompt, modelConnection, telegramConnection);
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
      const telegramConnection = await getTelegramConnection();
      await app.pair(code, telegramConnection);
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
      io.error(`Daytona API authorization is needed to manage your private Sandbox. Set DAYTONA_API_KEY from a key created at https://app.daytona.io/dashboard/keys, then retry ned ${command}.`);
      return 2;
    }
    if (command === 'destroy' && !flags.includes('--yes')) {
      io.error(`Destroy permanently deletes the NED workspace. Rerun: ned destroy --yes. See ${CREDENTIALS_DOCS_URL}`);
      return 2;
    }
    try {
      const app = await appFactory({ env });
      if (command === 'doctor') {
        const telegramConnection = await getTelegramConnection();
        const health = await app.doctor(await getModelConnection(), telegramConnection);
        capture(telemetry, completedEvent, startedAt, health.ok ? 'success' : 'health_check_failed');
        io.log(health.ok ? `✓ NED is healthy: ${health.checks.join(', ')}` : 'NED is not healthy.');
        return health.ok ? 0 : 1;
      }
      if (command === 'repair' || command === 'reset') {
        const telegramConnection = await getTelegramConnection();
        const health = await app.reset(await getModelConnection(), telegramConnection);
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
