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
  telegramSecretNameFactory = () => `ned_telegram_${randomUUID().replaceAll('-', '')}`,
  createAttemptIdFactory = () => randomUUID().replaceAll('-', ''),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (!apiKey) {
    throw new Error('Daytona authorization is required. Set DAYTONA_API_KEY in your shell; do not paste it into chat.');
  }
  const client = new DaytonaClass({ apiKey });

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

  async function telegramGatewayReady(sandbox, profile) {
    const command = [
      'set -euo pipefail',
      'export PATH="$HOME/.local/bin:$PATH"',
      `export HERMES_HOME="$HOME/.hermes/profiles/${profile}"`,
      'test -x "$HOME/.hermes/venv/bin/python"',
      `"$HOME/.hermes/venv/bin/python" - <<'PY'`,
      'from gateway.status import read_runtime_status',
      'status = read_runtime_status() or {}',
      'telegram = (status.get("platforms") or {}).get("telegram") or {}',
      'raise SystemExit(0 if status.get("gateway_state") == "running" and telegram.get("state") == "connected" else 1)',
      'PY',
      `hermes --profile ${profile} gateway status`,
    ].join('\n');
    const result = await sandbox.process.executeCommand(command, undefined, undefined, 30);
    return result.exitCode === 0;
  }

  async function startAndVerifyTelegramGateway(sandbox, profile) {
    if (await telegramGatewayReady(sandbox, profile)) return;
    const sessionId = 'ned-telegram-gateway';
    try {
      await sandbox.process.createSession(sessionId);
    } catch {
      try { await sandbox.process.deleteSession(sessionId); } catch {}
      await sandbox.process.createSession(sessionId);
    }
    await sandbox.process.executeSessionCommand(sessionId, {
      command: `export PATH="$HOME/.local/bin:$PATH"\nexec hermes --profile ${profile} gateway run --replace`,
      runAsync: true,
      suppressInputEcho: true,
    }, 30);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(2_000);
      if (await telegramGatewayReady(sandbox, profile)) return;
    }
    throw new Error('Remote Hermes Telegram gateway did not reach connected polling state. See https://ned.datanav.app/docs/v1/telegram/');
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
      const telegramSecretName = telegramSecretNameFactory();
      const createAttemptId = createAttemptIdFactory();
      if (!/^ned_model_[a-z0-9_]+_[A-Za-z0-9]+$/.test(secretName)
          || !/^ned_telegram_[A-Za-z0-9_]+$/.test(telegramSecretName)
          || !/^[A-Za-z0-9]{8,64}$/.test(createAttemptId)) {
        throw new Error('Invalid generated Daytona resource identity');
      }
      const secret = await client.secret.create({
        name: secretName,
        value: modelConnection.consumeCredential(),
        description: `${modelProvider.label} access for NED`,
        hosts: modelProvider.allowedHosts,
      });
      let telegramSecret;
      try {
        telegramSecret = await client.secret.create({
          name: telegramSecretName,
          value: telegramConnection.consumeToken(),
          description: 'Telegram bot access for NED',
          hosts: ['api.telegram.org'],
        });
        const sandbox = await client.create({
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
            TELEGRAM_BOT_TOKEN: telegramSecretName,
          },
        }, { timeout: 300 });
        return {
          id: sandbox.id,
          name: sandbox.name,
          nedSecretId: secret.id,
          nedSecretName: secretName,
          telegramSecretId: telegramSecret.id,
          telegramSecretName,
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
        for (const ownedSecret of [telegramSecret, secret]) {
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
            telegramSecretId: telegramSecret?.id || null,
            telegramSecretName: telegramSecret ? telegramSecretName : null,
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
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 900);
      if (result.exitCode !== 0) {
        throw new Error(`Hermes/NED installation failed: ${result.result || 'unknown error'}`);
      }
      await startAndVerifyTelegramGateway(sandbox, plan.profile);
      return { hermesVersion: plan.hermesVersion };
    },

    async doctor(workspace, plan) {
      const sandbox = await client.get(workspace.id);
      const gatewayReady = await telegramGatewayReady(sandbox, plan.profile);
      const command = [
        'set -euo pipefail',
        'export PATH="$HOME/.local/bin:$PATH"',
        'hermes --version',
        `hermes profile info ${plan.profile}`,
        `hermes --profile ${plan.profile} -z 'Reply with exactly: ready'`,
      ].join('\n');
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 120);
      const inferenceReady = result.exitCode === 0;
      return {
        ok: inferenceReady && gatewayReady,
        checks: [
          'sandbox',
          ...(inferenceReady ? ['hermes', 'ned-profile', 'inference'] : []),
          ...(gatewayReady ? ['telegram-gateway'] : []),
        ],
        output: result.result || '',
      };
    },

    async start(workspaceId, profile = 'ned') {
      const sandbox = await client.get(workspaceId);
      if (sandbox.state !== 'started') {
        await sandbox.start(300);
      }
      await startAndVerifyTelegramGateway(sandbox, profile);
    },

    async pair(workspaceId, profile, code) {
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
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 60);
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
      const telegramSecretId = workspace.telegramSecretId;
      const secretAbsent = await deleteSecretAndProveAbsence(secretId);
      const telegramSecretAbsent = await deleteSecretAndProveAbsence(telegramSecretId);

      let workspaceAbsent = !workspace.id;
      if (workspace.id) {
        try {
          await client.get(workspace.id);
        } catch (error) {
          if (isNotFound(error)) workspaceAbsent = true;
          else throw error;
        }
      }
      if (!workspaceAbsent || !secretAbsent || !telegramSecretAbsent) {
        throw new Error('Daytona deletion readback did not prove the exact Sandbox and both owned Secrets absent');
      }
      return { workspaceAbsent, secretAbsent, telegramSecretAbsent };
    },
  };
}
