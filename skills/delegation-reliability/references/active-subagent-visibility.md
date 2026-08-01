# Active subagent visibility when `/agents` is unreliable

## Product reason

Users need to know whether the project is actively moving, waiting for evidence, or blocked. Do not make them interpret gateway process lists or assume that a dispatch receipt means a worker is still alive.

## Current Hermes boundary

On messaging/gateway surfaces, `/agents` is not an authoritative view of `delegate_task` children. The gateway command reports top-level gateway agents, tracked terminal processes, and background gateway jobs, but it does not query the in-process `tools.delegate_tool.list_active_subagents()` registry.

Hermes currently exposes no separate supported CLI command that can query another running gateway process's in-memory delegate-task registry. The TUI's `delegation.status` RPC and subagent overlay are process-local: a newly launched TUI cannot inspect children owned by an already-running Telegram or Discord gateway.

Do not infer child liveness from:

- the absence or output of `/agents` or `/tasks`;
- a process listing;
- a delegation handle by itself;
- a todo marked `in_progress`;
- the existence of a partial artifact.

## User check on a messaging surface

The controller must maintain a ledger from dispatch and completion events. When the parent is busy, the user can queue a non-interrupting status request:

```text
/queue Report the current subagent ledger: for each handle, goal, dispatched time, latest known state, and completion evidence. Do not use /agents. Mark unconfirmed liveness as unknown.
```

The response must distinguish:

- `dispatched_unconfirmed` — Hermes returned a handle, but no independent start evidence exists;
- `running_confirmed` — a `subagent_start` event or same-process runtime observation confirms a live child;
- `completion_received` — a terminal completion delivery exists;
- `interrupted_or_timed_out` — lifecycle evidence says the run stopped abnormally;
- `unknown` — the controller cannot currently prove either active or stopped.

Never relabel `dispatched_unconfirmed` as `running`. A truthful `unknown` is better than a false progress claim.

## Persistent out-of-band ledger

For operator-visible status independent of the parent conversation, install persistent profile-scoped hooks for both lifecycle events:

```yaml
hooks:
  subagent_start:
    - command: "/absolute/path/subagent-ledger update"
  subagent_stop:
    - command: "/absolute/path/subagent-ledger update"
```

The hook consumer should:

1. Read the hook JSON from stdin.
2. Key children by `child_session_id`, with a documented fallback only when that identifier is absent.
3. Record parent session, goal/role, start time, terminal state, and duration under a file lock or transactional database.
4. Treat duplicate events idempotently.
5. Mark old entries `unknown` after gateway shutdown or when the owning process generation changes without a matching stop event.
6. Offer a read-only `status` command that prints active, terminal, and unknown rows.

A hook is loaded at Hermes process startup and applies to every future child in that profile/process. Restart the corresponding CLI or gateway after installing it. Install it separately in each Hermes profile/process whose delegations need to be observed.

Do not let the hook dispatch children or promote dependencies. It records lifecycle evidence and may emit a content-free wake to an authoritative reconciler.

## Durable Kanban workers

When work is represented in Hermes Kanban, query durable board state instead of the delegate-task registry:

```bash
hermes kanban list --status running --json
hermes kanban runs <task_id> --json
```

The first command lists cards currently recorded as running. The second shows attempts for one task. Board state is durable but still requires stale-lease reconciliation after a crash; `running` is not proof of recent heartbeat unless the run evidence confirms it.

## Controller reporting contract

Every user status update includes:

- `Purpose:` why status is being reported;
- `Executive summary:` whether product work is moving, waiting, or blocked;
- `Action needed:` the user's exact product decision/action, or `None`;
- `Detailed information:` verified links and the subagent ledger rows/handles.

State how the status was established: parent ledger, lifecycle-hook ledger, Kanban, completion artifact, or `unknown`. Never tell a user to use `/agents` as the source of truth.
