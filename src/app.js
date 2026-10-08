import { createNedPlan } from './plan.js';

export function createNedApp({ provider, stateStore, progress = () => {} }) {
  if (!provider || !stateStore) {
    throw new TypeError('provider and stateStore are required');
  }

  return {
    async verifyAuthorization() {
      return provider.verifyAuthorization?.();
    },

    async chat(prompt, modelConnection, telegramConnection) {
      if (!prompt || !prompt.trim()) {
        throw new Error('A prompt is required: ned chat "What should NED build?"');
      }
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No saved NED workspace found. This CLI manages existing workspaces only.');
      }
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      await provider.start(state.workspaceId, state.profile, telegramConnection);
      return provider.chat(state.workspaceId, state.profile, prompt.trim());
    },

    async doctor(modelConnection, telegramConnection) {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No saved NED workspace found. This CLI manages existing workspaces only.');
      }
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      await provider.start(state.workspaceId, state.profile, telegramConnection);
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openai-codex' });
      return provider.doctor({ id: state.workspaceId, name: state.workspaceName }, plan);
    },

    async reset(modelConnection, telegramConnection) {
      const state = await stateStore.load();
      if (!state) {
        throw new Error('No saved NED workspace found. This CLI manages existing workspaces only.');
      }
      const workspace = { id: state.workspaceId, name: state.workspaceName };
      if (!modelConnection || modelConnection.providerId !== state.modelProvider) {
        throw new Error('A matching local ChatGPT OAuth connection is required.');
      }
      await provider.updateModelCredential(state, modelConnection);
      const plan = createNedPlan({ modelProvider: state.modelProvider || 'openai-codex' });
      await provider.start(state.workspaceId, state.profile, telegramConnection);
      await provider.bootstrap(workspace, plan);
      return provider.doctor(workspace, plan);
    },

    async pair(code, telegramConnection) {
      const normalized = String(code || '').toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
        throw new Error('Pairing code must be the 8 characters shown by the bot. See https://ned.datanav.app/docs/v1/telegram/');
      }
      const state = await stateStore.load();
      if (!state?.workspaceId) throw new Error('No saved NED workspace found. This CLI manages existing workspaces only.');
      await provider.start(state.workspaceId, state.profile, telegramConnection);
      return provider.pair(state.workspaceId, state.profile, normalized, telegramConnection);
    },

    async destroy() {
      const state = await stateStore.load();
      if (!state) return { destroyed: false, alreadyDeleted: true };
      const receipt = await provider.destroy({
        id: state.workspaceId,
        name: state.workspaceName,
        createAttemptId: state.createAttemptId,
        secretId: state.secretId,
        secretName: state.secretName,
      });
      if (!receipt?.workspaceAbsent || !receipt?.secretAbsent) {
        throw new Error('Daytona destroy did not prove workspace and model secret absence; local recovery state was preserved.');
      }
      await stateStore.clear();
      return { destroyed: true, alreadyDeleted: false };
    },
  };
}
