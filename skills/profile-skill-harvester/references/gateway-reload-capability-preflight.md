# Gateway reload capability preflight

Use this before any multi-profile rollout whose completion criteria include reloading long-lived gateways.

## Core distinction

First classify the changed artifact, then choose its adoption proof:

1. **Skill hot-swap:** existing same-name `SKILL.md` and support files are read from disk when invoked. New sessions/workers use the updated bytes without a gateway restart. Existing conversations should use `/reset` or `/new`; `/reload-skills` is for added or removed skill names.
2. **Process-loaded change:** Hermes code, plugins, environment, startup-loaded configuration, and any artifact proven to be cached by the long-lived process require lifecycle adoption.
3. **Package gate:** in either case, approved bytes must be copied safely into the named profiles and verified after the applicable adoption smoke.
4. **Lifecycle gate:** only process-loaded changes require an authorized, actually callable mechanism to reload each target gateway.

Skill instructions express workflow policy; they do not grant execution capabilities or override runtime enforcement. Passing the package gate does not imply passing a lifecycle gate—but a lifecycle gate must not be invented for content that Hermes hot-loads.

## Preflight before target mutation

1. Inventory the changed paths and classify each as skill-hot-loadable or process-loaded. If the package contains both, use the stricter process-loaded path.
2. For skill-only overlays, record the expected proof: canonical byte equality, one enabled frontmatter identity, a fresh-process explicit skill load/provider smoke, and a post-smoke re-hash. Plan `/reset` or `/new` for existing conversations that previously loaded the skill.
3. Only when process adoption is required, identify the controller profile/service label/PID and every target service label/PID; prove each target differs from the controller.
4. Inspect the active runtime/tool policy and determine whether lifecycle commands originating from this context are permitted. Do not infer capability from old transcripts or skill wording.
5. If an external supervisor is required, confirm that it already exists and has an authenticated handoff path before copying packages. Do not invent cron, AppleScript, detached-shell, or GUI-terminal trampolines during rollout.
6. State the transaction shape before mutation:
   - `deploy-with-skill-hot-swap` for same-name skill/support-file updates;
   - `deploy-and-reload` for process-loaded changes when the lifecycle gate is executable now;
   - `deploy-only, reload-pending` when process adoption is required but unavailable and the user explicitly wants bytes applied;
   - `stop-before-deploy` when process adoption is required for the requested outcome and no lifecycle path exists.

## Execution and evidence

For a skill hot-swap, do not restart merely to manufacture a PID change. Run a fresh process that explicitly loads a changed skill, require the expected provider response, then re-hash canonical and preserved target-only files. Record that existing conversations need `/reset` or `/new` for a clean context. This proves the updated content is available to the runtime path that consumes it.

For a process-loaded change, reload one sibling at a time. A successful command exit is not enough: require a changed PID/generation, healthy platform connection, provider smoke, and package re-hash. If the lifecycle attempt is rejected before reaching the supervisor, preserve the package backup/manifest, stop additional lifecycle attempts, and report the exact targets as reload-pending. Do not repeat the same blocked mechanism through wrappers.

## Reporting contract

Use distinct statements:

- **Installed:** target package bytes match the frozen source and preserved target-only files still match their pre-rollout hashes.
- **Hot-swap verified:** a new one-shot process explicitly loaded the updated same-name skill and provider successfully; existing conversations require `/reset` or `/new` for clean adoption.
- **Catalog rescanned:** `/reload-skills` refreshed added/removed skill names; this is not required for same-name content edits.
- **Gateway reloaded/adopted:** only for process-loaded changes—the target gateway generation changed and passed readiness plus post-reload verification.

Never call a skill-only rollout reload-pending merely because a restart command was unavailable, and never call a process-loaded change adopted based only on a fresh-process skill smoke.
