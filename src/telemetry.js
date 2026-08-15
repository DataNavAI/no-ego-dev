import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: packageVersion } = require('../package.json');

export const TELEMETRY_SCHEMA_VERSION = 1;
export const CENTRAL_TELEMETRY = Object.freeze({
  host: 'https://us.i.posthog.com',
  // Public PostHog project ingest configuration; never use a personal/admin key here.
  projectKey: ['phc_DbHJxjsZNgQTNF75xfLDUXJsNGUMVhJu5pYTfC8Lskx2'].join(''),
  privacyPolicy: 'https://github.com/DataNavAI/no-ego-dev/blob/main/docs/ned-create/TELEMETRY_PRIVACY.md',
});
export const TELEMETRY_EVENTS = Object.freeze({
  createStarted: 'cli_create_started',
  createCompleted: 'cli_create_completed',
  createFailed: 'cli_create_failed',
  chatCompleted: 'cli_chat_completed',
  chatFailed: 'cli_chat_failed',
  doctorCompleted: 'cli_doctor_completed',
  resetCompleted: 'cli_reset_completed',
  destroyCompleted: 'cli_destroy_completed',
});

export const DURATION_BUCKETS = Object.freeze({
  underOneSecond: '<1s',
  underTenSeconds: '1-10s',
  underOneMinute: '10-60s',
  underFiveMinutes: '1-5m',
  fiveMinutesOrMore: '5m+',
});

const ALLOWED_EVENTS = new Set(Object.values(TELEMETRY_EVENTS));
const ALLOWED_RESULT_CLASSES = new Set(['started', 'success', 'validation_error', 'operation_error', 'health_check_failed']);

function durationBucket(durationMs) {
  const milliseconds = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  if (milliseconds < 1_000) return DURATION_BUCKETS.underOneSecond;
  if (milliseconds < 10_000) return DURATION_BUCKETS.underTenSeconds;
  if (milliseconds < 60_000) return DURATION_BUCKETS.underOneMinute;
  if (milliseconds < 300_000) return DURATION_BUCKETS.underFiveMinutes;
  return DURATION_BUCKETS.fiveMinutesOrMore;
}

function osFamily(platform) {
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  if (platform === 'linux') return 'linux';
  return 'other';
}

function validateEnableOptions({ host, projectKey, privacyPolicy, consent }) {
  if (!privacyPolicy) throw new Error('A published privacy policy URL is required');
  if (consent !== true) throw new Error('Affirmative consent is required');
  for (const [name, value] of [['collector host', host], ['privacy policy', privacyPolicy]]) {
    let url;
    try { url = new URL(value); } catch { throw new Error(`${name} must be a valid HTTPS URL`); }
    if (url.protocol !== 'https:') throw new Error(`${name} must be a valid HTTPS URL`);
  }
  if (!projectKey || typeof projectKey !== 'string') throw new Error('A public project ingest key is required');
}

export function createFileTelemetry({
  home = os.homedir(),
  fetch: fetchImplementation = globalThis.fetch,
  cliVersion = packageVersion,
  platform = process.platform,
  timeoutMs = 250,
} = {}) {
  const directory = path.join(home, '.ned');
  const configPath = path.join(directory, 'telemetry.json');

  async function load() {
    try {
      return JSON.parse(await readFile(configPath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async function save(config) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${configPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, configPath);
  }

  return {
    path: configPath,

    async status() {
      const config = await load();
      if (!config) return { enabled: false };
      return {
        enabled: config.enabled === true,
        installationId: config.installationId,
        host: config.host,
        privacyPolicy: config.privacyPolicy,
        schemaVersion: config.schemaVersion,
      };
    },

    async enable(options = {}) {
      const hasCustomCollector = ['host', 'projectKey', 'privacyPolicy'].some((key) => options[key] !== undefined);
      const resolvedOptions = hasCustomCollector ? options : {
        ...CENTRAL_TELEMETRY,
        ...options,
      };
      validateEnableOptions(resolvedOptions);
      const existing = await load();
      const config = {
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
        enabled: true,
        installationId: existing?.installationId || randomUUID(),
        host: new URL(resolvedOptions.host).origin,
        projectKey: resolvedOptions.projectKey,
        privacyPolicy: new URL(resolvedOptions.privacyPolicy).href,
      };
      await save(config);
      return this.status();
    },

    async disable() {
      const existing = await load();
      if (existing) await save({ ...existing, enabled: false });
      return this.status();
    },

    async delete() {
      await rm(configPath, { force: true });
      return { enabled: false };
    },

    async capture(event, properties = {}) {
      if (!ALLOWED_EVENTS.has(event)) throw new Error(`Unsupported telemetry event: ${event}`);
      if (!ALLOWED_RESULT_CLASSES.has(properties.resultClass)) {
        throw new Error(`Unsupported telemetry result class: ${properties.resultClass}`);
      }

      try {
        const config = await load();
        if (!config?.enabled || config.schemaVersion !== TELEMETRY_SCHEMA_VERSION) return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImplementation(`${config.host}/capture/`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              api_key: config.projectKey,
              event,
              properties: {
                distinct_id: config.installationId,
                schema_version: TELEMETRY_SCHEMA_VERSION,
                cli_version: cliVersion,
                os_family: osFamily(platform),
                result_class: properties.resultClass,
                duration_bucket: durationBucket(properties.durationMs),
              },
            }),
            signal: controller.signal,
          });
          return response?.ok !== false;
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        return false;
      }
    },
  };
}
