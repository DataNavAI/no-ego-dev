# Active subagent visibility when `/agents` is unreliable

## Product reason

Users need to know whether product work is moving, waiting for evidence, or blocked. The status should come from Hermes's runtime when possible, not from a second tracker that can drift.

## What Hermes already tracks

Hermes keeps active delegated children in process-local runtime registries:

- `tools.delegate_tool.list_active_subagents()` snapshots the currently running direct and nested child tree.
- `tools.async_delegation.list_async_delegations()` reports background delegation records retained by that process.
- completion events re-enter the owning parent session when children stop.

For ordinary attached delegation, these are the runtime authority. **Do not require a duplicate lifecycle ledger.** Keep a workflow checkpoint only for durable business context: returned handle, goal, expected artifact, immutable target, blocked successor, and required acceptance evidence.

## Surface limitation

On messaging/gateway surfaces, `/agents` may not expose the child registry. The gateway command can report top-level gateway agents, tracked terminal processes, and background gateway jobs without querying `list_active_subagents()`. Its output or absence is therefore not delegated-child evidence.

The TUI's `delegation.status` RPC and subagent overlay are process-local. They can inspect children owned by that TUI gateway process; a newly launched TUI cannot inspect children already owned by a separate Telegram or Discord gateway.

Hermes currently exposes no separate supported CLI command that can query another live gateway process's in-memory child registry. This is a visibility gap, not a reason to duplicate state for every workflow.

## User check on a messaging surface

When the parent is busy, the user can queue a non-interrupting request:

```text
/queue Report active subagent status from Hermes runtime tracking and completion events. For each known handle, give its goal, verified state, and evidence source. Do not use /agents as authoritative evidence. Mark unconfirmed liveness as unknown.
```

The response should use only states supported by runtime or durable evidence:

- `running_confirmed` — the owning runtime confirms a live child;
- `completion_received` — a terminal completion delivery exists;
- `interrupted_or_timed_out` — lifecycle evidence says the run stopped abnormally;
- `unknown` — the current surface cannot query the owning registry and has no terminal event.

A dispatch receipt proves acceptance, not continuing liveness. Mark unconfirmed liveness `unknown` instead of creating a shadow truth source.

## Optional hook ledger

Install an optional hook ledger only when operators need out-of-band, cross-surface, audit, or post-restart history that Hermes's process-local registries do not retain:

```yaml
hooks:
  subagent_start:
    - command: "/absolute/path/subagent-ledger update"
  subagent_stop:
    - command: "/absolute/path/subagent-ledger update"
```

This is an observability projection, not scheduling authority. It must be profile-scoped, locked or transactional, idempotent, generation-aware, and reconciled after crashes. It must not dispatch children, release dependencies, or override the owning runtime while that runtime is available.

Hooks load at process startup. Restart the relevant CLI or gateway after installation, and install the hook separately in each profile/process that needs external observation.

## Durable Kanban workers

When work is represented in Hermes Kanban, query durable board state rather than maintaining another delegate-task ledger:

```bash
hermes kanban list --status running --json
hermes kanban runs <task_id> --json
```

Board state survives restarts, but `running` still requires lease/heartbeat reconciliation after a crash.

## Controller reporting contract

Every user status update uses:

- a natural opening sentence explaining why status is being reported, never a `Purpose:` label;
- `Executive summary:` whether product work is moving, waiting, or blocked;
- `Human action needed:` only a human-owned decision/task with actor, imperative action, timing, result unblocked, and why automation cannot perform it safely, or exactly `None`; autonomous follow-up stays in the executive summary;
- `Detailed information:` verified artifacts plus the status evidence source.

Name the source: owning Hermes runtime, completion delivery, Kanban, optional hook ledger, or `unknown`. Never present `/agents` output as authoritative child state when the gateway surface does not expose the child registry.
