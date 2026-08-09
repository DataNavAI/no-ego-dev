import { getModelProviderRuntime } from './model-providers.js';

export function createNedPlan({ modelProvider = 'openai-codex' } = {}) {
  const runtime = getModelProviderRuntime(modelProvider);
  return {
    provider: 'daytona',
    region: 'auto',
    resources: { cpu: 2, memory: 4, disk: 10 },
    image: 'ubuntu:24.04',
    modelProvider,
    hermesModelProvider: runtime.hermesProvider,
    model: runtime.defaultModel,
    hermesVersion: 'v2026.7.20',
    profile: 'ned',
    // Messaging is the default NED interface; keep the gateway available
    // instead of stopping an idle sandbox and silently dropping messages.
    autoStopMinutes: 0,
    autoArchiveMinutes: 10080,
  };
}

const defaultPlan = createNedPlan();
export const NED_PLAN = Object.freeze({
  ...defaultPlan,
  resources: Object.freeze({ ...defaultPlan.resources }),
});

export function createDryRunPlan(options) {
  const { hermesModelProvider: _hermesModelProvider, model: _model, ...publicPlan } = createNedPlan(options);
  return {
    action: 'create',
    dryRun: true,
    ...publicPlan,
    questionsAsked: 0,
  };
}
