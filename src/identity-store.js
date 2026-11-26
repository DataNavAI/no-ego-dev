import {createSecretStore, SecretError} from './secrets.js';
import {IdentityError} from './identity-providers.js';

export function nativeIdentityAllowed(env = process.env) {
  return process.platform !== 'win32' && env.HERMES_PROFILE !== 'ned-staging' && !env.NED_MANAGED_INSTANCE_ID;
}

export function containerAwsIdentityAllowed(env = process.env) {
  return process.platform !== 'win32' && env.NED_CONTAINER === '1' && Boolean(env.NED_HUB_TOKEN_FILE && env.NED_INSTANCE_NAME);
}

export function createIdentityStore(home, env) {
  const vault = createSecretStore({home, env, namespace: 'provider-identities'});
  function key(provider) { return provider.toUpperCase(); }
  return {
    get(provider) {
      try {return JSON.parse(vault.get(key(provider)));}
      catch (error) {
        if (error instanceof SecretError && error.code === 'not_found') return null;
        throw error;
      }
    },
    save(provider, connection, previous) {
      vault.set(key(provider), JSON.stringify(connection), {expected: previous ? JSON.stringify(previous) : null});
    },
    remove(provider, previous) {
      try {vault.delete(key(provider), {expected: previous ? JSON.stringify(previous) : null});}
      catch (error) {
        if (!(error instanceof SecretError && error.code === 'not_found')) throw error;
      }
    },
  };
}

export function identityStatus(record, clock = Date.now) {
  if (!record) return {status: 'disconnected'};
  return {
    status: record.expiresAt !== null && record.expiresAt <= clock() ? 'expired' : 'connected',
    identity: record.identity,
    expiresAt: record.expiresAt,
  };
}

export function requireConnection(store, provider, clock) {
  const record = store.get(provider);
  if (identityStatus(record, clock).status !== 'connected') {
    throw new IdentityError('not_connected', 'Connect the provider in private NED Settings before using it.', 409);
  }
  return record;
}
