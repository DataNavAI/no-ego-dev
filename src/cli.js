import { createNedApp } from './app.js';
import { authorizeOpenRouter } from './auth/openrouter.js';
import { createDryRunPlan } from './plan.js';
import { createProfileArchive } from './profile-archive.js';
import { createDaytonaProvider } from './providers/daytona.js';
import { createFileStateStore } from './state.js';

async function defaultAppFactory({ env }) {
  return createNedApp({
    provider: createDaytonaProvider({
      apiKey: env.DAYTONA_API_KEY,
      profileArchive: createProfileArchive,
    }),
    stateStore: createFileStateStore(),
  });
}

export async function runCli(argv, io = console, dependencies = {}) {
  const [command, ...flags] = argv;
  const env = dependencies.env || process.env;
  const appFactory = dependencies.appFactory || defaultAppFactory;
  const getOpenRouterKey = dependencies.getOpenRouterKey || authorizeOpenRouter;

  if (['--help', '-h', 'help'].includes(command)) {
    io.log([
      'NED — private hosted product partner',
      '',
      'Usage:',
      '  ned create [--dry-run --json]',
      '  ned chat "What should NED build?"',
      '  ned doctor',
      '  ned reset',
      '  ned destroy --yes',
    ].join('\n'));
    return 0;
  }

  if (command === 'create' && flags.includes('--dry-run')) {
    const plan = createDryRunPlan();
    if (flags.includes('--json')) {
      io.log(JSON.stringify(plan));
    } else {
      io.log('NED create plan');
      io.log(JSON.stringify(plan, null, 2));
    }
    return 0;
  }

  if (command === 'create') {
    if (!env.DAYTONA_API_KEY) {
      io.error('Daytona authorization required. Create an API key at https://app.daytona.io/dashboard/keys, set DAYTONA_API_KEY in your shell, then rerun ned create. Do not paste secrets into chat.');
      return 2;
    }
    try {
      let openRouterApiKey = env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        io.log('Opening OpenRouter sign-in...');
        openRouterApiKey = await getOpenRouterKey();
      }
      io.log('Creating your private NED workspace...');
      const app = await appFactory({ env });
      await app.create({
        openRouterApiKey,
      });
      io.log('✓ Your product partner is ready.');
      io.log('Start with: ned chat "What product should we build?"');
      return 0;
    } catch (error) {
      io.error(`NED create failed: ${error.message}`);
      return 1;
    }
  }

  if (command === 'chat') {
    if (!env.DAYTONA_API_KEY) {
      io.error('Daytona authorization required. Set DAYTONA_API_KEY in your shell, then rerun ned chat.');
      return 2;
    }
    const prompt = flags.join(' ').trim();
    if (!prompt) {
      io.error('Usage: ned chat "What should NED build?"');
      return 2;
    }
    try {
      const app = await appFactory({ env });
      io.log(await app.chat(prompt));
      return 0;
    } catch (error) {
      io.error(`NED chat failed: ${error.message}`);
      return 1;
    }
  }

  if (['doctor', 'reset', 'destroy'].includes(command)) {
    if (!env.DAYTONA_API_KEY) {
      io.error(`Daytona authorization required. Set DAYTONA_API_KEY in your shell, then rerun ned ${command}.`);
      return 2;
    }
    if (command === 'destroy' && !flags.includes('--yes')) {
      io.error('Destroy permanently deletes the NED workspace. Rerun: ned destroy --yes');
      return 2;
    }
    try {
      const app = await appFactory({ env });
      if (command === 'doctor') {
        const health = await app.doctor();
        io.log(health.ok ? `✓ NED is healthy: ${health.checks.join(', ')}` : 'NED is not healthy.');
        return health.ok ? 0 : 1;
      }
      if (command === 'reset') {
        const health = await app.reset();
        io.log(health.ok ? '✓ NED was reset and is healthy.' : 'NED reset completed but health checks failed.');
        return health.ok ? 0 : 1;
      }
      await app.destroy();
      io.log('✓ NED workspace deleted.');
      return 0;
    } catch (error) {
      io.error(`NED ${command} failed: ${error.message}`);
      return 1;
    }
  }

  io.error('Usage: ned <create|chat|doctor|reset|destroy>');
  return 2;
}
