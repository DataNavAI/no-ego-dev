import { NED_PLAN, createNedPlan } from './plan.js';

export function createNedApp({ provider, stateStore }) {
  if (!provider || !stateStore) {
    throw new TypeError('provider and stateStore are required');
  }

  return {
    async create(credentials) {
      const plan = credentials?.modelConnection
        ? createNedPlan({ modelProvider: credentials.modelConnection.providerId })
        : NED_PLAN;
      const existing = await stateStore.load();
      if (existing) {
        if (existing.cleanupPending) {
          throw new Error('NED cleanup is pending. Run `ned destroy --yes` before creating again.');
        }
        throw new Error(`NED already exists in workspace ${existing.workspaceId}`);
      }

      const managed = await provider.listManagedWorkspaces?.() || [];
      if (managed.length > 0) {
        const ids = managed.map((workspace) => workspace.id).join(', ');
        throw new Error(`A managed Daytona workspace already exists (${ids}) but local ownership state is absent. Reconcile exact ownership before retrying create.`);
      }

      let workspace;
      try {
        workspace = await provider.createWorkspace(plan, credentials);
      } catch (error) {
        if (error.recoveryState) {
          const recoveryState = {
            schemaVersion: 2,
            provider: plan.provider,
            profile: plan.profile,
            hermesVersion: plan.hermesVersion,
            ...error.recoveryState,
            cleanupPending: true,
          };
          try {
            await stateStore.save(recoveryState);
          } catch (stateError) {
            throw new AggregateError(
              [error, stateError],
              `${error.message}; recovery state could not be saved: ${stateError.message}`,
            );
          }
        }
        throw error;
      }
      const workspaceState = {
        schemaVersion: 2,
        provider: plan.provider,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        profile: plan.profile,
        hermesVersion: plan.hermesVersion,
        secretId: workspace.nedSecretId,
        secretName: workspace.nedSecretName,
        telegramSecretId: workspace.telegramSecretId,
        telegramSecretName: workspace.telegramSecretName,
        telegramBotUsername: workspace.telegramBotUsername,
        telegramBotUrl: workspace.telegramBotUrl,
      };
      if (workspace.createAttemptId) workspaceState.createAttemptId = workspace.createAttemptId;
      if (credentials?.modelConnection) workspaceState.modelProvider = plan.modelProvider;
      try {
        await provider.bootstrap(workspace, plan);
        const health = await provider.doctor(workspace, plan);
        if (!health.ok) {
          throw new Error('NED health check failed');
        }

        await stateStore.save(workspaceState);
        return { ready: true, workspace: workspaceState, health };
      } catch (error) {
        try {
          await provider.destroy(workspace);
        } catch (cleanupError) {
          try {
            await stateStore.save({ ...workspaceState, cleanupPending: true });
          } catch (stateError) {
            throw new AggregateError(
              [error, cleanupError, stateError],
              `NED setup failed: ${error.message}; cleanup failed: ${cleanupError.message}; recovery state could not be saved: ${stateError.message}`,
            );
          }
          throw new AggregateError(
            [error, cleanupError],
            `NED setup failed: ${error.message}; cleanup failed: ${cleanupError.message}`,
          );
        }
        throw error;
      }
    },

    async chat(prompt, modelConnection) {
      if (!prompt || !prompt.trim()) {
        throw new Error('A prompt is required: ned chat "What should NED build?"');
      }
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      await provider.start(state.workspaceId, state.profile);
      return provider.chat(state.workspaceId, state.profile, prompt.trim());
    },

    async doctor(modelConnection) {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      await provider.start(state.workspaceId, state.profile);
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openai-codex' });
      return provider.doctor({ id: state.workspaceId, name: state.workspaceName }, plan);
    },

    async reset(modelConnection) {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      const workspace = { id: state.workspaceId, name: state.workspaceName };
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openai-codex' });
      await provider.start(state.workspaceId, state.profile);
      await provider.bootstrap(workspace, plan);
      return provider.doctor(workspace, plan);
    },

    async pair(code) {
      const normalized = String(code || '').toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
        throw new Error('Pairing code must be the 8 characters shown by the bot. See https://ned.datanav.app/docs/v1/telegram/');
      }
      const state = await stateStore.load();
      if (!state?.workspaceId) throw new Error('No NED workspace found. Run ned create first.');
      await provider.start(state.workspaceId, state.profile);
      return provider.pair(state.workspaceId, state.profile, normalized);
    },

    async destroy() {
      const state = await stateStore.load();
      if (!state) return { destroyed: false, alreadyDeleted: true };
      await provider.destroy({
        id: state.workspaceId,
        name: state.workspaceName,
        createAttemptId: state.createAttemptId,
        secretId: state.secretId,
        secretName: state.secretName,
        telegramSecretId: state.telegramSecretId,
        telegramSecretName: state.telegramSecretName,
      });
      await stateStore.clear();
      return { destroyed: true, alreadyDeleted: false };
    },
  };
}
