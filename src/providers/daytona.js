import { Daytona } from '@daytona/sdk';
import { randomUUID } from 'node:crypto';
import { getModelProviderRuntime } from '../model-providers.js';

const HERMES_COMMIT = '3ef6bbd201263d354fd83ec55b3c306ded2eb72a';
const HERMES_INSTALLER_SHA256 = 'c5ba7e89627577fab914514736ecfb3359b66956ca00199bfef616ca35953cb9';

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function isNotFound(error) {
  return error?.status === 404 || error?.statusCode === 404 || error?.response?.status === 404;
}

export function createDaytonaProvider({
  apiKey,
  DaytonaClass = Daytona,
  profileArchive,
  secretNameFactory = (providerId) => `ned_model_${providerId.replaceAll(/[^a-z0-9]/g, '_')}_${randomUUID().replaceAll('-', '')}`,
  createAttemptIdFactory = () => randomUUID().replaceAll('-', ''),
  runtimeTelegramTokenFactory = () => null,
  verbose = false,
  log = () => {},
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (!apiKey) {
    throw new Error('Daytona authorization is required. Set DAYTONA_API_KEY in your shell; do not paste it into chat.');
  }
  const client = new DaytonaClass({ apiKey });
  const debug = (message) => {
    if (verbose) log(`[daytona] ${message}`);
  };
  const errorSummary = (error) => {
    const status = error?.status || error?.statusCode || error?.response?.status;
    const message = String(error?.message || error?.name || 'unknown error')
      .replaceAll(/(?:bot)?\d{6,}:[A-Za-z0-9_-]{20,}/gi, '[REDACTED]')
      .replaceAll(/(?:api[_ -]?key|token|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
      .replaceAll(/\b[A-Za-z0-9_-]{40,}\b/g, '[REDACTED]')
      .slice(0, 240);
    return status ? `${message} (HTTP ${status})` : message;
  };
  const runStage = async (name, operation) => {
    debug(`${name}: started`);
    try {
      const result = await operation();
      debug(`${name}: completed`);
      return result;
    } catch (error) {
      debug(`${name}: failed — ${errorSummary(error)}`);
      throw error;
    }
  };
  const runtimeTelegramTokens = new Map();

  function runtimeTelegramEnv(workspaceId) {
    const token = runtimeTelegramTokens.get(workspaceId) || runtimeTelegramTokenFactory(workspaceId);
    if (!token) throw new Error('Verified Telegram runtime authorization is required for gateway start or health verification.');
    return { TELEGRAM_BOT_TOKEN: token };
  }

  function consumeRuntimeTelegramToken(workspaceId, telegramConnection) {
    const token = telegramConnection && typeof telegramConnection.consumeToken === 'function'
      ? telegramConnection.consumeToken()
      : (runtimeTelegramTokens.get(workspaceId) || runtimeTelegramTokenFactory(workspaceId));
    if (typeof token !== 'string' || !token) throw new Error('Verified Telegram runtime authorization is required before compute can be created.');
    runtimeTelegramTokens.set(workspaceId, token);
  }

  async function deleteSecretAndProveAbsence(secretId) {
    if (!secretId) return true;
    try {
      await client.secret.delete(secretId);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    try {
      await client.secret.get(secretId);
      return false;
    } catch (error) {
      if (isNotFound(error)) return true;
      throw error;
    }
  }

  async function deleteSandboxAndProveAbsence(sandbox) {
    await sandbox.delete(300, true);
    try {
      await client.get(sandbox.id);
      return false;
    } catch (error) {
      if (isNotFound(error)) return true;
      throw error;
    }
  }

  async function telegramGatewayReady(sandbox, profile, workspaceId) {
    const statusPath = '/tmp/ned-gateway-status.txt';
    const command = [
      'set -euo pipefail',
      'export PATH="$HOME/.local/bin:$PATH"',
      'export HERMES_HOME="$HOME/.hermes"',
      `hermes --profile ${profile} gateway status >/dev/null 2>&1 || true`,
      `python3 - <<'PY' >${statusPath}
import json
import os
import re
import urllib.error
import urllib.request

profile_path = os.path.expanduser("~/.hermes/profiles/${profile}/gateway_state.json")
try:
    with open(profile_path, encoding="utf-8") as handle:
        record = json.load(handle)
except Exception:
    record = {}
telegram = (record.get("platforms") or {}).get("telegram") or {}
state = str(telegram.get("state", "")).lower()
token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
http_status = 0
if token:
    try:
        request = urllib.request.Request("https://api.telegram.org/bot" + token + "/getMe")
        with urllib.request.urlopen(request, timeout=8) as response:
            http_status = int(response.status)
    except urllib.error.HTTPError as error:
        http_status = int(error.code)
    except Exception:
        http_status = 0
print("NED_STATUS_TELEGRAM=" + str(bool(telegram)).lower())
print("NED_STATUS_CONNECTED=" + str(state == "connected").lower())
print("NED_STATUS_DISCONNECTED=" + str(state == "disconnected").lower())
print("NED_DIAG_TOKEN_PRESENT=" + str(bool(token)).lower())
print("NED_DIAG_TOKEN_SHAPE=" + str(bool(re.fullmatch(r"\\d+:[A-Za-z0-9_-]+", token))).lower())
print("NED_DIAG_API_HTTP=" + str(http_status))
PY`,
    ].join('\n');
    const result = await sandbox.process.executeCommand(command, undefined, runtimeTelegramEnv(workspaceId), 30);
    if (typeof sandbox.fs?.downloadFile !== 'function') {
      return { ready: false, diagnostic: `NED_STATUS_UNAVAILABLE=true NED_EXIT=${result.exitCode}` };
    }
    let statusText = '';
    try {
      statusText = (await sandbox.fs.downloadFile(statusPath, 30)).toString('utf8').slice(0, 16_384);
    } catch {
      return { ready: false, diagnostic: `NED_STATUS_UNAVAILABLE=true NED_EXIT=${result.exitCode}` };
    }
    const readMarker = (name) => {
      const match = statusText.match(new RegExp(`^${name}=(true|false)$`, 'mi'));
      return match ? match[1] === 'true' : null;
    };
    const telegram = readMarker('NED_STATUS_TELEGRAM');
    const connected = readMarker('NED_STATUS_CONNECTED');
    const disconnected = readMarker('NED_STATUS_DISCONNECTED');
    const tokenPresent = readMarker('NED_DIAG_TOKEN_PRESENT');
    const tokenShape = readMarker('NED_DIAG_TOKEN_SHAPE');
    const apiHttpMatch = statusText.match(/^NED_DIAG_API_HTTP=(\d+)$/mi);
    const apiHttp = apiHttpMatch ? Number(apiHttpMatch[1]) : null;
    if ([telegram, connected, disconnected, tokenPresent, tokenShape].some((value) => value === null) || apiHttp === null) {
      return { ready: false, diagnostic: 'NED_STATUS_UNAVAILABLE=true' };
    }
    const ready = telegram && connected && !disconnected && tokenPresent && apiHttp === 200;
    return { ready, diagnostic: `NED_STATUS_TELEGRAM=${telegram} NED_STATUS_CONNECTED=${connected} NED_STATUS_DISCONNECTED=${disconnected} NED_DIAG_TOKEN_PRESENT=${tokenPresent} NED_DIAG_TOKEN_SHAPE=${tokenShape} NED_DIAG_API_HTTP=${apiHttp}` };
  }

  async function startAndVerifyTelegramGateway(sandbox, profile) {
    const workspaceId = sandbox.id;
    let lastDiagnostic = '';
    const existing = await telegramGatewayReady(sandbox, profile, workspaceId);
    if (existing.ready) return;
    lastDiagnostic = existing.diagnostic;
    const gatewayCommand = `export PATH="$HOME/.local/bin:$PATH"\nexport HERMES_HOME="$HOME/.hermes"\nnohup hermes --profile ${profile} gateway run --replace >/dev/null 2>&1 </dev/null &`;
    await sandbox.process.executeCommand(gatewayCommand, undefined, runtimeTelegramEnv(workspaceId), 30);
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await sleep(2_000);
      const status = await telegramGatewayReady(sandbox, profile, workspaceId);
      lastDiagnostic = status.diagnostic;
      if (status.ready) return;
    }
    throw new Error(`Remote Hermes Telegram gateway did not reach connected polling state${lastDiagnostic ? ` (${lastDiagnostic})` : ''}. See https://ned.datanav.app/docs/v1/telegram/`);
  }

  return {
    async listManagedWorkspaces() {
      const workspaces = [];
      for await (const sandbox of client.list({ labels: { app: 'ned', managedBy: 'ned-cli' } })) {
        workspaces.push({ id: sandbox.id, name: sandbox.name, state: sandbox.state });
      }
      return workspaces;
    },

    async createWorkspace(plan, credentials = {}) {
      const modelConnection = credentials.modelConnection || null;
      const telegramConnection = credentials.telegramConnection || null;
      if (!modelConnection) {
        throw new Error('Model-provider authorization is required before compute can be created.');
      }
      if (!telegramConnection?.botUsername || typeof telegramConnection.consumeToken !== 'function') {
        throw new Error('Verified Telegram bot authorization is required before compute can be created.');
      }
      if (modelConnection.providerId !== plan.modelProvider) {
        throw new Error('Model-provider connection does not match the provisioning plan');
      }
      const modelProvider = getModelProviderRuntime(modelConnection.providerId);

      const secretName = secretNameFactory(modelConnection.providerId);
      const createAttemptId = createAttemptIdFactory();
      if (!/^ned_model_[a-z0-9_]+_[A-Za-z0-9]+$/.test(secretName)
          || !/^[A-Za-z0-9]{8,64}$/.test(createAttemptId)) {
        throw new Error('Invalid generated Daytona resource identity');
      }
      const secret = await runStage('create-model-secret', () => client.secret.create({
        name: secretName,
        value: modelConnection.consumeCredential(),
        description: `${modelProvider.label} access for NED`,
        hosts: modelProvider.allowedHosts,
      }));
      try {
        const sandbox = await runStage('create-sandbox', () => client.create({
          name: 'ned-product-partner',
          image: plan.image,
          language: 'typescript',
          public: false,
          ephemeral: false,
          resources: { ...plan.resources },
          autoStopInterval: plan.autoStopMinutes,
          autoArchiveInterval: plan.autoArchiveMinutes,
          autoDeleteInterval: -1,
          labels: { app: 'ned', managedBy: 'ned-cli', createAttempt: createAttemptId },
          secrets: {
            [modelProvider.sandboxEnvironmentVariable]: secretName,
          },
        }, { timeout: 300 }));
        consumeRuntimeTelegramToken(sandbox.id, telegramConnection);
        return {
          id: sandbox.id,
          name: sandbox.name,
          nedSecretId: secret.id,
          nedSecretName: secretName,
          telegramBotUsername: telegramConnection.botUsername,
          telegramBotUrl: telegramConnection.botUrl,
          createAttemptId,
          modelProvider: modelConnection.providerId,
        };
      } catch (error) {
        const cleanupErrors = [];
        let unresolvedWorkspace = null;
        if (typeof client.list === 'function') {
          try {
            const query = { labels: { app: 'ned', managedBy: 'ned-cli', createAttempt: createAttemptId } };
            for await (const acceptedSandbox of client.list(query)) {
              try {
                if (!(await deleteSandboxAndProveAbsence(acceptedSandbox))) {
                  unresolvedWorkspace ||= acceptedSandbox;
                  cleanupErrors.push(new Error(`sandbox cleanup readback did not prove absence for ${acceptedSandbox.id}`));
                }
              } catch (cleanupError) {
                unresolvedWorkspace ||= acceptedSandbox;
                cleanupErrors.push(cleanupError);
              }
            }
          } catch (reconciliationError) {
            cleanupErrors.push(new Error(`sandbox reconciliation failed for create attempt ${createAttemptId}: ${reconciliationError.message}`));
          }
        }
        for (const ownedSecret of [secret]) {
          if (!ownedSecret) continue;
          try {
            if (!(await deleteSecretAndProveAbsence(ownedSecret.id))) {
              cleanupErrors.push(new Error(`secret cleanup readback did not prove absence for ${ownedSecret.id}`));
            }
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
        if (cleanupErrors.length) {
          const aggregate = new AggregateError(
            [error, ...cleanupErrors],
            `Daytona sandbox creation failed and exact secret cleanup was incomplete: ${error.message}; ${cleanupErrors.map((item) => item.message).join('; ')}`,
          );
          aggregate.recoveryState = {
            workspaceId: unresolvedWorkspace?.id || null,
            workspaceName: unresolvedWorkspace?.name || null,
            createAttemptId,
            secretId: secret.id,
            secretName,
          };
          throw aggregate;
        }
        throw error;
      }
    },

    async updateModelCredential(state, modelConnection) {
      if (!state?.secretId || !state?.secretName) {
        throw new Error('Saved NED state does not identify the exact model credential.');
      }
      if (modelConnection?.providerId !== state.modelProvider) {
        throw new Error('Model-provider connection does not match saved NED ownership state.');
      }
      const modelProvider = getModelProviderRuntime(modelConnection.providerId);
      const updated = await client.secret.update(state.secretId, {
        value: modelConnection.consumeCredential(),
        hosts: modelProvider.allowedHosts,
      });
      if (updated.id !== state.secretId || updated.name !== state.secretName) {
        throw new Error('Daytona model credential update did not preserve exact owned identity.');
      }
      if (!state.workspaceId || !/^[a-z0-9-]+$/.test(state.profile || '')) {
        throw new Error('Saved NED workspace identity is incomplete for credential synchronization.');
      }
      const sandbox = await client.get(state.workspaceId);
      if (sandbox.state !== 'started') await sandbox.start(300);
      const profileDir = `$HOME/.hermes/profiles/${state.profile}`;
      const syncCommand = [
        'set -euo pipefail',
        `profile_dir="${profileDir}"`,
        'test -n "${NED_OPENAI_CODEX_ACCESS_TOKEN:-}"',
        'NED_PROFILE_DIR="$profile_dir" python3 - <<\'PY\'',
        'import json, os, pathlib, tempfile',
        'root = pathlib.Path(os.environ["NED_PROFILE_DIR"])',
        'token = os.environ["NED_OPENAI_CODEX_ACCESS_TOKEN"]',
        'payload = {"version": 1, "active_provider": "openai-codex", "providers": {"openai-codex": {"tokens": {"access_token": token, "refresh_token": "ned-local-refresh-managed"}, "auth_mode": "chatgpt"}}}',
        'fd, temporary = tempfile.mkstemp(prefix=".auth.json.ned-", dir=root)',
        'try:',
        '    os.fchmod(fd, 0o600)',
        '    with os.fdopen(fd, "w", encoding="utf-8") as handle:',
        '        json.dump(payload, handle, separators=(",", ":"))',
        '        handle.write("\\n")',
        '        handle.flush()',
        '        os.fsync(handle.fileno())',
        '    os.replace(temporary, root / "auth.json")',
        'finally:',
        '    try: os.unlink(temporary)',
        '    except FileNotFoundError: pass',
        'PY',
      ].join('\n');
      const synced = await sandbox.process.executeCommand(syncCommand, undefined, undefined, 120);
      if (synced.exitCode !== 0) {
        throw new Error(`Daytona model credential synchronization failed: ${synced.result || 'unknown error'}`);
      }
      return { id: updated.id, name: updated.name };
    },

    async bootstrap(workspace, plan) {
      if (!profileArchive) {
        throw new Error('NED profile archive builder is not configured');
      }
      const sandbox = await client.get(workspace.id);
      const archive = await profileArchive();
      await sandbox.fs.uploadFile(archive, '/tmp/ned-profile.tgz');
      const command = [
        'set -euo pipefail',
        'if ! command -v curl >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1 || ! command -v xz >/dev/null 2>&1; then',
        '  command -v apt-get >/dev/null 2>&1 || { echo "Required bootstrap tools are missing and apt-get is unavailable" >&2; exit 1; }',
        '  if [ "$(id -u)" -eq 0 ]; then',
        '    apt-get update -qq',
        '    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl python3 tar xz-utils',
        '  elif command -v sudo >/dev/null 2>&1; then',
        '    sudo apt-get update -qq',
        '    sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl python3 tar xz-utils',
        '  else',
        '    echo "Required bootstrap tools are missing and no root/sudo path is available" >&2; exit 1',
        '  fi',
        'fi',
        `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/${HERMES_COMMIT}/scripts/install.sh -o /tmp/hermes-install.sh`,
        `if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum /tmp/hermes-install.sh | cut -d ' ' -f 1); else actual=$(shasum -a 256 /tmp/hermes-install.sh | cut -d ' ' -f 1); fi`,
        `test "$actual" = ${HERMES_INSTALLER_SHA256} || { echo 'Hermes installer checksum mismatch' >&2; exit 1; }`,
        `bash /tmp/hermes-install.sh --skip-setup --skip-browser --non-interactive --commit ${HERMES_COMMIT}`,
        'export PATH="$HOME/.local/bin:$PATH"',
        'rm -rf /tmp/ned-profile && mkdir -p /tmp/ned-profile',
        'tar -xzf /tmp/ned-profile.tgz -C /tmp/ned-profile',
        `hermes profile install /tmp/ned-profile --name ${plan.profile} --force --yes`,
        `hermes --profile ${plan.profile} config set model.provider ${plan.hermesModelProvider || 'openai-codex'}`,
        `hermes --profile ${plan.profile} config set model.default ${plan.model || 'gpt-5.6-sol'}`,
        `hermes --profile ${plan.profile} config set display.platforms.telegram.notifications important`,
        `profile_dir="$HOME/.hermes/profiles/${plan.profile}"`,
        'install -d -m 700 "$profile_dir"',
        'NED_PROFILE_DIR="$profile_dir" python3 - <<\'PY\'',
        'import json, os, pathlib, tempfile',
        'root = pathlib.Path(os.environ["NED_PROFILE_DIR"])',
        'token = os.environ["NED_OPENAI_CODEX_ACCESS_TOKEN"]',
        'payload = {"version": 1, "active_provider": "openai-codex", "providers": {"openai-codex": {"tokens": {"access_token": token, "refresh_token": "ned-local-refresh-managed"}, "auth_mode": "chatgpt"}}}',
        'fd, temporary = tempfile.mkstemp(prefix=".auth.json.ned-", dir=root)',
        'try:',
        '    os.fchmod(fd, 0o600)',
        '    with os.fdopen(fd, "w", encoding="utf-8") as handle:',
        '        json.dump(payload, handle, separators=(",", ":"))',
        '        handle.write("\\n")',
        '        handle.flush()',
        '        os.fsync(handle.fileno())',
        '    os.replace(temporary, root / "auth.json")',
        'finally:',
        '    try: os.unlink(temporary)',
        '    except FileNotFoundError: pass',
        'PY',
        `hermes profile info ${plan.profile}`,
      ].join('\n');
      const result = await runStage('bootstrap-hermes-profile', () => sandbox.process.executeCommand(command, undefined, runtimeTelegramEnv(workspace.id), 900));
      if (result.exitCode !== 0) {
        throw new Error(`Hermes/NED installation failed: ${result.result || 'unknown error'}`);
      }
      await runStage('verify-telegram-gateway', () => startAndVerifyTelegramGateway(sandbox, plan.profile));
      return { hermesVersion: plan.hermesVersion };
    },

    async doctor(workspace, plan) {
      const sandbox = await client.get(workspace.id);
      const gatewayReady = await telegramGatewayReady(sandbox, plan.profile, workspace.id);
      const command = [
        'set -euo pipefail',
        'export PATH="$HOME/.local/bin:$PATH"',
        'hermes --version',
        `hermes profile info ${plan.profile}`,
        `hermes --profile ${plan.profile} -z 'Reply with exactly: ready'`,
      ].join('\n');
      const result = await sandbox.process.executeCommand(command, undefined, runtimeTelegramEnv(workspace.id), 120);
      const inferenceReady = result.exitCode === 0;
      return {
        ok: inferenceReady && gatewayReady.ready,
        checks: [
          'sandbox',
          ...(inferenceReady ? ['hermes', 'ned-profile', 'inference'] : []),
          ...(gatewayReady.ready ? ['telegram-gateway'] : []),
        ],
        output: result.result || '',
      };
    },

    async start(workspaceId, profile = 'ned', telegramConnection) {
      consumeRuntimeTelegramToken(workspaceId, telegramConnection);
      const sandbox = await client.get(workspaceId);
      if (sandbox.state !== 'started') {
        await sandbox.start(300);
      }
      await startAndVerifyTelegramGateway(sandbox, profile);
    },

    async pair(workspaceId, profile, code, telegramConnection) {
      if (!/^[a-z0-9-]+$/.test(profile) || !/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
        throw new Error('Invalid Telegram owner pairing request');
      }
      const sandbox = await client.get(workspaceId);
      if (sandbox.state !== 'started') await sandbox.start(300);
      await startAndVerifyTelegramGateway(sandbox, profile);
      const command = [
        'set -euo pipefail',
        'export PATH="$HOME/.local/bin:$PATH"',
        `hermes --profile ${profile} pairing approve telegram ${code}`,
      ].join('\n');
      const result = await sandbox.process.executeCommand(command, undefined, runtimeTelegramEnv(workspaceId), 60);
      if (result.exitCode !== 0 || !/Approved!/i.test(result.result || '')) {
        throw new Error('Telegram pairing approval failed. Send hello again for a fresh code, then retry. See https://ned.datanav.app/docs/v1/telegram/');
      }
      return { approved: true };
    },

    async chat(workspaceId, profile, prompt) {
      if (!/^[a-z0-9-]+$/.test(profile)) {
        throw new Error('Invalid NED profile name in local state');
      }
      const sandbox = await client.get(workspaceId);
      const command = `export PATH="$HOME/.local/bin:$PATH"\nhermes --profile ${profile} -z ${shellQuote(prompt)}`;
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 1800);
      if (result.exitCode !== 0) {
        throw new Error(`NED chat failed: ${result.result || 'unknown error'}`);
      }
      return (result.result || '').trim();
    },

    async destroy(workspace) {
      if (!workspace.id && workspace.createAttemptId) {
        const query = { labels: { app: 'ned', managedBy: 'ned-cli', createAttempt: workspace.createAttemptId } };
        for await (const sandbox of client.list(query)) {
          if (!(await deleteSandboxAndProveAbsence(sandbox))) {
            throw new Error(`Daytona deletion readback did not prove Sandbox ${sandbox.id} absent`);
          }
        }
      }
      if (workspace.id) {
        try {
          const sandbox = await client.get(workspace.id);
          await sandbox.delete(300, true);
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      }
      const secretId = workspace.secretId || workspace.nedSecretId;
      const secretAbsent = await deleteSecretAndProveAbsence(secretId);

      let workspaceAbsent = !workspace.id;
      if (workspace.id) {
        try {
          await client.get(workspace.id);
        } catch (error) {
          if (isNotFound(error)) workspaceAbsent = true;
          else throw error;
        }
      }
      if (!workspaceAbsent || !secretAbsent) {
        throw new Error('Daytona deletion readback did not prove the exact Sandbox and model Secret absent');
      }
      runtimeTelegramTokens.delete(workspace.id);
      return { workspaceAbsent, secretAbsent };
    },
  };
}
