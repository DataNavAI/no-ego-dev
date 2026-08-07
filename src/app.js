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

      let workspace;
      try {
        workspace = await provider.createWorkspace(plan, credentials);
      } catch (error) {
        if (error.recoveryState) {
          const recoveryState = {
            schemaVersion: 1,
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
        schemaVersion: 1,
        provider: plan.provider,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        profile: plan.profile,
        hermesVersion: plan.hermesVersion,
        secretId: workspace.nedSecretId,
        secretName: workspace.nedSecretName,
      };
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

    async chat(prompt) {
      if (!prompt || !prompt.trim()) {
        throw new Error('A prompt is required: ned chat "What should NED build?"');
      }
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      await provider.start(state.workspaceId);
      return provider.chat(state.workspaceId, state.profile, prompt.trim());
    },

    async doctor() {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      await provider.start(state.workspaceId);
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openrouter' });
      return provider.doctor({ id: state.workspaceId, name: state.workspaceName }, plan);
    },

    async reset() {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No NED workspace found. Run ned create first.');
      }
      const workspace = { id: state.workspaceId, name: state.workspaceName };
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openrouter' });
      await provider.start(state.workspaceId);
      await provider.bootstrap(workspace, plan);
      return provider.doctor(workspace, plan);
    },

    async destroy() {
      const state = await stateStore.load();
      if (!state) return { destroyed: false, alreadyDeleted: true };
      await provider.destroy({
        id: state.workspaceId,
        name: state.workspaceName,
        secretId: state.secretId,
        secretName: state.secretName,
      });
      await stateStore.clear();
      return { destroyed: true, alreadyDeleted: false };
    },
  };
}
