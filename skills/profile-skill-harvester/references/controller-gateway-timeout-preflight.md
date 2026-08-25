# Controller Gateway Timeout Preflight and Restart Boundary

Use this reference whenever a harvest may dispatch background reviewers, implementers, or comparison workers.

## Preflight the controller, not only the targets

Before the first `delegate_task`, identify the profile and `HERMES_HOME` of the **controller session** running the harvest. Target-profile timeout settings do not govern children spawned by the controller.

Verify all of the following:

1. the active controller config path is unambiguous;
2. `delegation.child_timeout_seconds` is positive and covers the longest legitimate delegated stage (NoEgoDev default: at least `1800` seconds);
3. `agent.gateway_timeout` is strictly greater than the child timeout (NoEgoDev default: `3600` seconds);
4. the running gateway has adopted those values, using process-owned startup/generation evidence when available;
5. if precise adoption evidence is unavailable, the gateway process generation/start time postdates the relevant config write.

Persisted YAML alone is not runtime proof because the gateway snapshots timeout settings at startup.

## Fail-closed restart boundary

If the controller config must change or runtime adoption is stale/ambiguous:

- persist the corrected config;
- do not dispatch another child;
- do not continue exact-SHA review, merge, or rollout in the same request;
- persist durable continuation coordinates: isolated worktree, branch, PR, exact candidate SHA, validation evidence, live-source digests, and remaining gates;
- stop and return control without dispatching more work;
- allow a user/admin to issue the supported messaging `/restart` command, which gracefully drains active runs before restarting and confirms when the gateway returns, or restart from a genuinely external shell/supervisor;
- never have the agent invoke a terminal lifecycle command against the gateway that owns its current request;
- resume only in a fresh request after re-reading config and proving a new runtime generation.

The safe boundary is **who initiates and how the restart is drained**, not whether the command name appears in the messaging surface. A user-issued `/restart` is supported. An agent-initiated `hermes gateway restart`, `launchctl`, or equivalent terminal command against its own active gateway remains prohibited because SIGTERM propagation can strand the request or create restart loops.

A user-authorized restart of a **different named profile gateway** is a separate operation. On macOS, the controller may use the sibling's exact launchd label directly—for example, `launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway-<target>`—only after proving that `<target>` is not the controller profile. Capture the sibling's current PID/generation, restart one target at a time, wait for platform readiness, require a changed PID/generation, run a provider smoke, and re-hash installed package bytes. If the execution layer rejects the lifecycle command, record that sibling as restart-pending; never claim that a restart occurred.

Do not use cron as a lifecycle-command trampoline, and do not route through AppleScript or an unverified launchd label. If unattended continuation is required, arrange an external supervisor before the harvest begins, then have the fresh post-restart run recover durable state.

## Workflow design implication

Run this preflight before creating review fan-out—and preferably before opening a publication PR. Discovering an unsafe controller timeout after the candidate is pushed creates an avoidable split transaction: publication is pending, but independent review cannot safely start until a human or external supervisor restarts the controller.

## Fresh-request verification

On the first request after restart:

1. verify persisted child/gateway values;
2. verify the gateway PID or generation changed and is newer than the config adoption boundary;
3. verify the isolated worktree is clean at the recorded SHA;
4. verify the remote branch/PR still points to that SHA;
5. rerun any evidence that may have become stale;
6. only then dispatch exact-SHA reviewers.
