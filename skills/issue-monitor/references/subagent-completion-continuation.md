# Subagent-Completion Continuation Trigger

Use this pattern when periodic polling leaves avoidable idle gaps between a completed worker and the next issue-management stage.

## Design

Keep the normal recurring issue-monitor cron as the durable fallback. Add a profile-local Hermes plugin that observes the plugin lifecycle hook `subagent_stop` and requests an immediate run of that same cron job.

The hook is an accelerator, not the source of truth:

1. Subscribe to `subagent_start` to create a live-worker lease and `subagent_stop` to remove it and wake the monitor.
2. Ignore `child_summary` and all other child-owned output. Completion is only a wake signal; the monitor must re-read durable GitHub, git, claim, and review state.
3. Atomically debounce across processes with a file lock plus timestamp state. A 10-second window is usually sufficient to collapse batch/nested-child completion bursts.
4. Launch a tiny detached runner and return immediately. `subagent_stop` is serialized on the parent thread and must stay fast.
5. Delay the runner briefly (for example five seconds) before calling `hermes -p PROFILE cron run JOB_ID`. This lets the parent cron tick release its lock; an immediate nested trigger may collide with the still-active tick.
6. Keep the recurring cron enabled (typically every 5–30 minutes) so missed hooks, restarts, plugin failures, and no-child stages still reconcile.
7. The monitor remains serialized and stage-bounded. A wake must never bypass exact-SHA gates, claim reconciliation, review-round accounting, CI, or merge policy.

## Cross-process active-worker registry

A cron run is a separate process/session and cannot infer live gateway-thread children from `ps`, a GitHub label, or its own in-process delegation registry. Add `subagent_start` alongside `subagent_stop` and maintain a small locked JSON lease file outside repositories.

Recommended non-secret record:

```json
{
  "gateway_pid": 12345,
  "updated_at": 1710000000.0,
  "workers": {
    "child-session-id": {
      "child_session_id": "child-session-id",
      "child_subagent_id": "sa-0-abcd1234",
      "parent_session_id": "parent-session-id",
      "role": "leaf",
      "scope": "OWNER/REPO",
      "goal_sha256": "digest-only-not-raw-goal",
      "started_at": 1710000000.0,
      "gateway_pid": 12345,
      "worktree": "/tmp/owned-worktree-if-known"
    }
  }
}
```

Rules:

1. Guard read-modify-write with `fcntl.flock` (or the platform equivalent) and publish with temporary-file + `os.replace`.
2. Persist no raw goal, child summary, token, credential, command output, or issue text. Derive scope only against an explicit allowlisted repository and hash the goal for correlation.
3. `subagent_start` adds the lease; `subagent_stop` removes it by stable child session ID before scheduling continuation.
4. The monitor accepts a lease only when repository scope matches, the recorded gateway PID is alive, age is within the declared maximum stage envelope, and any worktree path exists. It should cross-check durable stage/GitHub evidence but must not require a standalone OS process.
5. While a valid lease exists, never delete its worktree, release its claim, preserve it as stale, or spawn overlapping mutation work. Read-only reconciliation is safe.
6. With actionable work and no valid lease, dispatch exactly one next-stage worker. After dispatch, allow registration latency and preserve the stage until its declared budget; do not immediately decide that the worker is absent.
7. If the gateway PID dies, the lease ages out, or the worktree disappears, verify external state and preserve dirty owned work before cleanup/recovery.
8. For delegation started before plugin activation, pause polling or create a clearly marked temporary bridge lease. A bridge keyed by a delegation handle cannot be removed by a stop hook that keys on child session ID: mark it `manual_bridge: true`, record controller ownership, and remove it explicitly when the asynchronous completion arrives. Never restart the gateway to activate hooks while that child is live—the restart discards background delegations.
9. Force one monitor tick with a harmless live lease and verify it preserves the worktree and does not dispatch a duplicate.
10. Treat `cron run` reporting “already being fired” as serialization evidence, not a failed supervisor; inspect that in-flight tick rather than launching a competing controller.

This registry is an ownership signal, not a correctness or merge gate. Exact-SHA review artifacts and live GitHub checks remain authoritative for candidate approval.

## Runtime budget preflight

A completion hook cannot compensate for workers that are deterministically killed before they can persist results. Before enabling the accelerator:

1. Read the effective profile value of `delegation.child_timeout_seconds` and compare it with the longest legitimate stage—not the cron cadence or claim stale time.
2. Keep a positive timeout of at least 1800 seconds. Set it above the full stage envelope and keep `agent.gateway_timeout` strictly greater; when increasing the child budget, increase the gateway budget too. Keep heartbeat staleness protection for genuinely stuck children.
3. Verify `delegation.max_iterations` independently; it can end a worker even when wall-clock time remains.
4. Simulate or observe one stage longer than the former cap and confirm it reaches its durable result sink.
5. Treat an exit exactly at the configured cap as a runtime-budget defect. Inspect and preserve the owned worktree, then continue valid implementer work only after proving no scoped process remains and the remote head is unchanged.

The issue monitor should never convert a delegation timeout into a permanent product `agent:blocked` state without first applying this recovery classification.

## Plugin placement and activation

For a named profile, place the plugin under:

```text
~/.hermes/profiles/PROFILE/plugins/issue-worker-continuation/
├── plugin.yaml
├── __init__.py
└── runner.py
```

Enable it with:

```bash
hermes -p PROFILE plugins enable issue-worker-continuation
```

Plugins load at process/session startup. A running gateway must be restarted before the hook becomes active. Hermes intentionally blocks a gateway from restarting itself because termination propagates to child commands; ask the user to send `/restart` or run `hermes -p PROFILE gateway restart` from an external shell. Before asking, compare the running gateway's process start time with the plugin's modification/enable time: if the gateway predates the plugin, enablement is only pending configuration, not an active hook. Defer restart while any background delegation is live.

## Verification

Before activation:

- compile plugin Python files;
- instantiate a fake plugin context and verify both `register_hook("subagent_start", ...)` and `register_hook("subagent_stop", ...)`;
- exercise concurrent starts against a temporary state directory and prove the locked registry retains every worker without storing raw goals;
- prove stop removes only its worker, ignores child output, first wake succeeds, an in-window wake is suppressed, and a post-window wake succeeds;
- mock process launch and verify fixed argv plus no child-controlled command data;
- confirm `hermes -p PROFILE plugins list --plain --no-bundled` reports the plugin enabled;
- confirm the target cron is enabled, recurring, profile-scoped, and points at the intended repository;
- seed a harmless live lease, force one monitor tick, and verify its owned worktree survives and no duplicate worker is dispatched.

After restart, let a harmless subagent start and finish. Verify the live lease appears then disappears, the runner log advances, and cron `last_run_at` advances. Do not infer activation merely from config enablement. Run focused ad-hoc plugin verification from an OS-safe temporary `hermes-verify-*.py` script and clean it afterward when the plugin has no canonical suite.