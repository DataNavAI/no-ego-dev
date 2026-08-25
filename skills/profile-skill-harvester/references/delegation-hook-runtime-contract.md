# Delegation completion-hook runtime contract

Use this reference when harvesting or canonicalizing skills that claim completion-driven scheduling behavior in Hermes.

## Authoritative behavior

Hermes supports a persistent, process-wide `subagent_stop` lifecycle subscription. It is registered once through either:

- a shell hook under the profile's `hooks.subagent_stop` configuration; or
- a Python plugin calling `ctx.register_hook("subagent_stop", callback)` from `register(ctx)`.

The hook applies to future `delegate_task` children created by that loaded Hermes process. It is not attached separately to every delegation call.

Registration is loaded at CLI or gateway startup. Configuration persists on disk, but runtime adoption requires a new process generation. Profiles and separately running worker processes have separate `HERMES_HOME`/plugin/config scope; installing a hook only in the default profile does not cover every sibling profile or Kanban worker.

## Top-level batch and nested-delegation semantics

In the current Hermes runtime, a top-level `delegate_task(tasks=[...])` call starts each task as an independent background child. Each child has its own handle, future callback, terminal lifecycle event, and completion delivery into the parent session. Therefore:

- top-level batch fan-out does **not** impose an all-children drain barrier before the first completion delivery;
- the authoritative parent may reconcile the first finisher and start one newly eligible successor while siblings remain active;
- separate single-task calls are still useful for explicit ownership, timing, capacity, cancellation, or retry boundaries, but are not required merely to obtain first-finisher continuation.

Do not generalize this to nested delegation. An orchestrator's internal aggregate path may synchronously wait for its delegated children and return one aggregate result. Verify top-level and nested behavior separately against the installed implementation and active tool schema before canonicalizing either claim.

## Scheduling boundary

`subagent_stop` is an observer hook; its return value is ignored. A reliable callback should:

1. emit a content-free wake or enqueue a reconciliation event;
2. return quickly;
3. let an authoritative controller re-read durable artifacts, verdicts, dependencies, claims, active leases, and capacity;
4. schedule at most one eligible successor under a lock/idempotency key;
5. retain periodic reconciliation as lost-event recovery.

Do not select work from a child-controlled summary, equate lifecycle completion with acceptance, or call `delegate_task` directly from an unbounded callback.

## Verification before promotion

For runtime/API claims, compare all three surfaces before canonicalizing:

1. the live Hermes Event Hooks documentation;
2. the installed `tools/delegate_tool.py` implementation;
3. the active `delegate_task` tool schema.

Fail closed when they disagree. Document the narrowest behavior proven by the running generation, and add an eval for the batch-versus-single-child boundary.

## Compact eval scenario

- A and B are independent and both runnable in one top-level `tasks=[A, B]` fan-out.
- A unlocks C; B is unrelated.
- A's independent completion delivery wakes reconciliation, verifies A's artifact, and may start C while B remains active.
- Replaying A's event cannot dispatch a second C.
- A separate nested-orchestrator scenario proves whether that installed aggregate path waits for all nested children; it must not be inferred from top-level behavior.
