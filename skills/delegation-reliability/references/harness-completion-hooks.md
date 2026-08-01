# Harness Completion Hooks for Worker-State Continuation

Use this reference when work should continue automatically as workers stop, complete, fail, time out, or become interrupted.

## Primitive selection

| Need | Primary primitive | Why |
|---|---|---|
| Observe delegated-child lifecycle | `subagent_start` / `subagent_stop` plugin hooks | The delegation harness emits structured child lifecycle events. |
| Dispatch the next dependency-ready engineering task | Hermes Kanban | Durable dependency state, atomic claims, retries, worktrees, and restart survival. |
| React to a standalone Kanban worker finishing | Kanban dispatcher/state reconciliation | A Kanban worker is a separate agent process; its completion is not necessarily a `delegate_task` child event. |
| Supervise a single bounded OS command | `terminal(background=True, notify_on_complete=True)` | The process watcher owns its completion event. |
| Detect missing/stale orchestration | Quiet watchdog | Alerts on unhealthy transitions; it must not become the primary scheduler. |
| Run work at a time | Cron | Time-driven, not completion-driven. Do not use frequent cron as a fake event bus. |

## Event semantics that prevent false scheduling

- `subagent_stop` fires once for each child created by `delegate_task`, with `child_status`, `child_summary`, duration, and parent identity.
- It is an **observer hook**. Its return value is ignored, and `child_status=completed` says the child stopped normally—not that its requested artifact exists, tests passed, review approved, or a dependency can be released.
- In current Hermes delegation, a `tasks:[...]` batch is drained before the parent receives the consolidated result; hook callbacks are marshalled on the parent thread. Do not assume a batch gives truly immediate first-finisher continuation. When the workflow must react independently to each child, launch separate single-task delegations (which may still be initiated in parallel) or put each work unit on Kanban.
- `failed`, `error`, `interrupted`, and `timeout` are state changes worth sensing, but they usually trigger recovery/blocking—not downstream promotion.
- A Kanban worker is not automatically a `delegate_task` child. Keep Kanban completion/dependency reconciliation as the authority for its lifecycle; the subagent hook is only a latency optimization for delegated children.

## Hook-only continuation without Kanban

Use this mode when the user explicitly prefers no duplicate execution queue and accepts that active `delegate_task` children are coupled to the current parent/gateway process.

1. Keep GitHub, Linear, or the chosen tracker as the only task queue and specification source. Derive the next task from live dependency, label, milestone, PR, and review state after every callback.
2. Launch each continuation-sensitive worker as a separate single-task `delegate_task` call. Independent calls may be initiated in parallel, but do not put them in one `tasks:[...]` batch when first-finisher reaction matters.
3. Rely on Hermes's async delegation completion delivery to re-enter the parent session. The new parent turn verifies the stopped child's durable artifact and verdict, reconciles the canonical tracker, selects the next dependency-safe task, and immediately calls `delegate_task` again.
4. Treat `subagent_stop` as a harness observation/wakeup signal only. The hook callback cannot call `delegate_task` through its ignored return value and must not infer acceptance. Any actual next-worker kickoff happens in the parent agent turn created by completion delivery.
5. Keep only transient session todos for visibility; do not recreate issue bodies or a second persistent queue. Re-read the live tracker at every handoff because session todos can become stale.
6. If the gateway/parent stops, process-local children may be interrupted and no future callback is guaranteed. On restoration, inspect remote branches, PRs, requested artifact paths, and surviving worktrees before resuming. Do not claim hook-only mode is restart-durable.
7. Use a quiet stale-work watchdog only when needed to alert that an expected completion callback never arrived. It may not dispatch replacement workers itself.
8. Treat timeout/interruption delivery as a real state-change callback, not an empty result. Before retrying, inspect every requested durable report, checksum, remote branch/PR, and evidence path. Recompute report integrity from final bytes; if a complete FAIL artifact survives, independently confirm the blocker and dispatch one remediation worker—not the downstream review. Follow `references/recovered-review-artifact-integrity.md`.

This mode minimizes coordination duplication and is appropriate for a supervised, continuously attached engineering session. Switch to a durable queue only when restart survival or unattended dependency execution is a material requirement and the user accepts that trade-off.

## Durable Kanban continuation architecture

1. Keep GitHub, Linear, or the chosen issue system canonical. Kanban cards are thin execution records with canonical issue URL, idempotency key, dependency edges, worktree, assignee, retries, and evidence contract.
2. Model implementation → spec review → quality review → integration/merge/QA as separate cards. Do not let a hook skip gates.
3. Register a profile-local `subagent_stop` plugin or shell hook. Scope it by parent/task metadata when possible; otherwise make the invoked dispatcher safe when no relevant card is ready.
4. Keep the callback short and non-blocking. It may log state and invoke one idempotent `hermes kanban ... dispatch` pass. It must not call an LLM, mutate issue specifications, infer success, merge, deploy, recursively create cron jobs, or spin in a polling loop.
5. Rely on Kanban's atomic claim transaction and capacity limits so a hook racing the periodic gateway dispatcher cannot start the same card twice.
6. Reconcile the stopped worker before promotion: verify the remote SHA/PR/artifact, exact required checks, and gate verdict; then mark the authoritative card complete or blocked. A raw lifecycle event alone never releases children.
7. Preserve a periodic dispatcher interval as fallback. Use a quiet watchdog only for stale/missing dispatch, repeated crashes, or service failure.

## Plugin pattern

`plugin.yaml`:

```yaml
name: dispatch-on-subagent-stop
version: 1.0.0
description: Request an idempotent Kanban dispatch pass after delegated children stop.
provides_hooks:
  - subagent_stop
```

`__init__.py` outline:

```python
import os
import subprocess

TERMINAL_STATES = {"completed", "success", "failed", "error", "interrupted", "timeout"}


def on_stop(child_status="", **kwargs):
    if child_status not in TERMINAL_STATES:
        return
    # Observer only: dispatch reads authoritative Kanban state. It does not
    # complete the stopped child's task or infer acceptance from this event.
    subprocess.run(
        ["hermes", "kanban", "--board", os.environ["HERMES_KANBAN_BOARD"],
         "dispatch", "--max", os.environ.get("HERMES_KANBAN_DISPATCH_MAX", "1"),
         "--json"],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )


def register(ctx):
    ctx.register_hook("subagent_stop", on_stop)
```

Productionize the outline by using an absolute Hermes executable path for launchd/service environments, preserving the active profile's `HERMES_HOME`, logging non-zero exit/stderr without secrets, and avoiding project-hardcoded behavior in a global plugin unless that scope is intentional.

## Read-only independent verification of a completion hook

When reviewing an installed hook without firing it or mutating state:

1. Verify the hook name, payload, invocation point, and callback-error isolation in the installed Hermes source.
2. Trace trust boundaries. Child-controlled summaries, statuses, IDs, paths, and output must not influence executable argv, shell text, profile selection, or job identity. Ignore the payload when the hook is only a wake signal.
3. Verify scope from fixed callback constants, the active profile's enabled-plugin entry, and the live cron/Kanban target.
4. Require one shared lock, decision-under-lock, and atomic state replacement for cross-process debounce. Check missing/corrupt state, negative clock deltas, launch failure, timeout, and concurrent logging.
5. Verify detached-launch hygiene: fixed argv with no shell, null stdin, bounded output, closed descriptors, a new session, timeout, and secret-safe failure records.
6. Establish activation from process evidence. CLI discoverability does not prove a long-lived gateway loaded the plugin; compare gateway start with plugin/config generation or use a process-owned registration receipt. Never restart while process-local children are active.
7. Keep verification non-invasive. Do not call the callback, run the cron target, or mutate debounce state. Compile in memory or disable bytecode writes.
8. Separate code verdict from activation: `APPROVED — code correct; activation pending gateway reload` is valid when stated explicitly.

## Installation and activation

1. Check prerequisites before changing the harness:
   - `hermes gateway status`
   - `hermes kanban diagnostics`
   - `hermes kanban boards list`
   - `hermes plugins list`
2. Install under the **active profile's** plugin directory. Never edit another profile without explicit user direction.
3. Enable with `hermes plugins enable <name>`. Do not grant tool override; a hook-only plugin does not need it.
4. A gateway/plugin reload is required. Do not restart while process-local `delegate_task` children are active; that would interrupt them. Wait for them to stop or explicitly accept interruption. For durable Kanban workers, still verify restart behavior rather than assuming it.
5. Verify manifest parsing, plugin enabled state, import/registration, callback timeout behavior, and an idempotent no-ready-task dispatch.
6. After gateway reload, run one disposable single-child smoke delegation and verify:
   - exactly one `subagent_stop` observation;
   - no duplicate Kanban claim when the periodic dispatcher races it;
   - a ready card starts within the expected latency;
   - an unverified or failed parent card does not promote dependent work;
   - logs redact secrets.

## State-transition response table

| Observed state | Controller action |
|---|---|
| `completed` + verified artifact/gate PASS | Complete authoritative card; dispatch may promote children. |
| `completed` + missing/partial artifact | Keep gate closed; recover or create a narrower replacement. |
| `timeout` | Inspect remote refs, PRs, requested paths, and worktrees before retrying. |
| `failed` / `error` | Record evidence; retry within policy or block. |
| `interrupted` | Confirm writer stopped, recover durable residue, then resume safely. |
| event observed but no ready card | No-op; this is healthy and should stay quiet. |
| ready card not claimed within fallback interval | Run diagnostics and alert once; do not launch duplicate writers blindly. |

## Verification checklist

- [ ] Canonical task truth and Kanban execution state are separated.
- [ ] Hook event semantics match the actual worker type.
- [ ] Batch-vs-single delegation latency behavior is intentional.
- [ ] Callback is observer-only, bounded, idempotent, and non-recursive.
- [ ] Artifact/review verification—not child status—controls dependency release.
- [ ] Atomic claims and worker-capacity limits are configured.
- [ ] Gateway periodic dispatch remains as fallback.
- [ ] Plugin is enabled for the correct profile and tool override is denied.
- [ ] Gateway reload avoids interrupting active process-local children.
- [ ] A real completion smoke test proves one observation and no duplicate worker.
- [ ] Failure, timeout, and interruption routes block/recover rather than promote.
