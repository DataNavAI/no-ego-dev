import { Daytona } from '@daytona/sdk';
import { randomUUID } from 'node:crypto';

const HERMES_COMMIT = '3ef6bbd201263d354fd83ec55b3c306ded2eb72a';

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
  secretNameFactory = () => `ned_openrouter_${randomUUID().replaceAll('-', '')}`,
} = {}) {
  if (!apiKey) {
    throw new Error('Daytona authorization is required. Set DAYTONA_API_KEY in your shell; do not paste it into chat.');
  }
  const client = new DaytonaClass({ apiKey });

  return {
    async createWorkspace(plan, credentials = {}) {
      if (!credentials.openRouterApiKey) {
        throw new Error('OpenRouter authorization is required. Set OPENROUTER_API_KEY in your shell; do not paste it into chat.');
      }

      const secretName = secretNameFactory();
      if (!/^ned_openrouter_[A-Za-z0-9]+$/.test(secretName)) {
        throw new Error('Invalid generated Daytona secret name');
      }
      const secret = await client.secret.create({
        name: secretName,
        value: credentials.openRouterApiKey,
        description: 'OpenRouter access for NED',
        hosts: ['openrouter.ai'],
      });

      try {
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
          labels: { app: 'ned', managedBy: 'ned-cli' },
          secrets: { OPENROUTER_API_KEY: secretName },
        }, { timeout: 300 });
        return {
          id: sandbox.id,
          name: sandbox.name,
          nedSecretId: secret.id,
          nedSecretName: secretName,
        };
      } catch (error) {
        try {
          await client.secret.delete(secret.id);
        } catch (cleanupError) {
          const aggregate = new AggregateError(
            [error, cleanupError],
            `Daytona sandbox creation failed: ${error.message}; secret cleanup also failed: ${cleanupError.message}`,
          );
          aggregate.recoveryState = {
            workspaceId: null,
            workspaceName: null,
            secretId: secret.id,
            secretName,
          };
          throw aggregate;
        }
        throw error;
      }
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
        `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/${HERMES_COMMIT}/scripts/install.sh -o /tmp/hermes-install.sh`,
        `bash /tmp/hermes-install.sh --skip-setup --skip-browser --non-interactive --commit ${HERMES_COMMIT}`,
        'export PATH="$HOME/.local/bin:$PATH"',
        'rm -rf /tmp/ned-profile && mkdir -p /tmp/ned-profile',
        'tar -xzf /tmp/ned-profile.tgz -C /tmp/ned-profile',
        `hermes profile install /tmp/ned-profile --name ${plan.profile} --force --yes`,
        `hermes --profile ${plan.profile} config set model.provider openrouter`,
        `hermes --profile ${plan.profile} config set model.default openai/gpt-5.5`,
        `hermes profile info ${plan.profile}`,
      ].join('\n');
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 900);
      if (result.exitCode !== 0) {
        throw new Error(`Hermes/NED installation failed: ${result.result || 'unknown error'}`);
      }
      return { hermesVersion: plan.hermesVersion };
    },

    async doctor(workspace, plan) {
      const sandbox = await client.get(workspace.id);
      const command = [
        'set -euo pipefail',
        'export PATH="$HOME/.local/bin:$PATH"',
        'hermes --version',
        `hermes profile info ${plan.profile}`,
        `hermes --profile ${plan.profile} -z 'Reply with exactly: ready'`,
      ].join('\n');
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 120);
      return {
        ok: result.exitCode === 0,
        checks: result.exitCode === 0 ? ['sandbox', 'hermes', 'ned-profile', 'inference'] : ['sandbox'],
        output: result.result || '',
      };
    },

    async start(workspaceId) {
      const sandbox = await client.get(workspaceId);
      if (sandbox.state !== 'started') {
        await sandbox.start(300);
      }
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
      if (workspace.id) {
        try {
          const sandbox = await client.get(workspace.id);
          await sandbox.delete(300, true);
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      }
      const secretId = workspace.secretId || workspace.nedSecretId;
      if (secretId) {
        try {
          await client.secret.delete(secretId);
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      }
    },
  };
}
