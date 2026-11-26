import {loadApiCredential} from '../apps/core/src/auth.js';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createIdentityProviders, IdentityError, providers} from './identity-providers.js';
import {createIdentityStore, identityStatus, nativeIdentityAllowed, requireConnection} from './identity-store.js';

const usage = [
  'Usage: ned identity connect <github|aws|godaddy> --url <private-loopback-COM-origin>',
  '       ned identity status [github|aws|godaddy]',
  '       ned identity exec <github|aws> -- <gh|aws> <arguments>',
  '       ned identity domain',
].join('\n');
const programs = {github: 'gh', aws: 'aws'};
const blockedAwsCommands = new Set(['configure', 'login', 'logout', 'sso', 'sso-oidc']);
const awsAuthorityFlags = ['profile', 'endpoint-url', 'no-verify-ssl', 'ca-bundle', 'no-sign-request', 'debug', 'cli-auto-prompt'];

function unsafeFlag(provider, arg) {
  if (provider === 'github') return /^(?:--(?:hostname|header|verbose)(?:=|$)|-H)/.test(arg);
  const flag = /^--([^=]+)/.exec(arg)?.[1];
  return flag && awsAuthorityFlags.some(blocked => blocked.startsWith(flag));
}

function localOrigin(value) {
  const match = /^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})\/?$/.exec(value);
  if (!match || Number(match[1]) > 65535) throw new IdentityError('invalid_url', 'Use the private 127.0.0.1 URL printed by ned com.');
  return `http://127.0.0.1:${match[1]}`;
}

async function requestConnection(provider, url, request, credentials) {
  const origin = localOrigin(url);
  const response = await request(`${origin}/api/v1/identity/${provider}/request`, {
    method: 'POST', headers: {Origin: origin, Authorization: 'Bearer ' + loadApiCredential(credentials), 'X-NED-Identity': '1'}, redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new IdentityError('com_unavailable', 'Open a private native NEDCOM instance and try again.');
  return {provider, status: 'requested', settings: origin};
}

async function execute(provider, command, args, {store, adapters, clock, launch, env}) {
  if (command !== programs[provider] || !args.length || !/^[a-z][a-z0-9-]*$/.test(args[0]) || (provider === 'aws' && blockedAwsCommands.has(args[0]))
    || (provider === 'github' && (args[0] !== 'api' || !/^[a-zA-Z0-9_][a-zA-Z0-9_./?%=&+-]*$/.test(args[1] || '')))
    || args.some(arg => unsafeFlag(provider, arg))) {
    throw new IdentityError('unsupported_command', 'Use a supported gh or aws command for the connected provider.');
  }
  const connection = requireConnection(store, provider, clock);
  const auth = provider === 'github' ? {GH_TOKEN: connection.token} : await adapters.awsCredentials(connection);
  const home = await mkdtemp(join(tmpdir(), 'ned-identity-'));
  try {
    return await new Promise((resolve, reject) => {
      const child = launch(command, args, {
        stdio: 'inherit',
        env: {
          HOME: home, USERPROFILE: home, PATH: env.PATH, LANG: env.LANG || 'C.UTF-8',
          XDG_CONFIG_HOME: home, GH_CONFIG_DIR: home, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1',
          AWS_CONFIG_FILE: join(home, 'config'), AWS_SHARED_CREDENTIALS_FILE: join(home, 'credentials'),
          AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off',
          ...auth,
        },
      });
      child.once('error', reject);
      child.once('close', code => resolve(code ?? 1));
    });
  } finally {await rm(home, {recursive: true, force: true});}
}

export async function runIdentityCli(args, io, dependencies = {}) {
  const [action, provider, separator, command, ...rest] = args;
  const clock = dependencies.identityOptions?.clock || Date.now;
  const request = dependencies.identityOptions?.fetch || fetch;
  try {
    if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(action))) {
      io.log(usage);
      return 0;
    }
    if (!nativeIdentityAllowed(dependencies.env))
      throw new IdentityError('identity_disabled', 'Provider connections are unavailable in this NED environment.');
    if (action === 'connect' && args.length === 4 && providers.includes(provider) && separator === '--url') {
      io.log(JSON.stringify(await requestConnection(provider, command, request, dependencies)));
      return 0;
    }
    if (action === 'status' && args.length <= 2 && (!provider || providers.includes(provider))) {
      const store = createIdentityStore(dependencies.home, dependencies.env);
      io.log(JSON.stringify({connections: (provider ? [provider] : providers).map(name => ({
        provider: name, ...identityStatus(store.get(name), clock),
      }))}));
      return 0;
    }
    const domain = action === 'domain' && args.length === 1;
    const exec = action === 'exec' && ['github', 'aws'].includes(provider) && separator === '--';
    if (domain || exec) {
      const store = createIdentityStore(dependencies.home, dependencies.env);
      const adapters = createIdentityProviders(dependencies.identityOptions);
      if (domain) {
        io.log(JSON.stringify(await adapters.domain(requireConnection(store, 'godaddy', clock))));
        return 0;
      }
      return await execute(provider, command, rest, {store, adapters, clock,
        launch: dependencies.identityOptions?.spawn || spawn, env: process.env});
    }
    io.error(usage);
    return 2;
  } catch (error) {
    io.error(error instanceof IdentityError ? error.message : 'Provider connection is unavailable. Check NEDCOM or reconnect in Settings.');
    return 1;
  }
}
