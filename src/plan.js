export const NED_PLAN = Object.freeze({
  provider: 'daytona',
  region: 'auto',
  resources: Object.freeze({ cpu: 2, memory: 4, disk: 20 }),
  image: 'ubuntu:24.04',
  modelProvider: 'openrouter',
  hermesVersion: 'v2026.7.20',
  profile: 'ned',
  autoStopMinutes: 15,
  autoArchiveMinutes: 10080,
});

export function createDryRunPlan() {
  return {
    action: 'create',
    dryRun: true,
    ...NED_PLAN,
    resources: { ...NED_PLAN.resources },
    questionsAsked: 0,
  };
}
