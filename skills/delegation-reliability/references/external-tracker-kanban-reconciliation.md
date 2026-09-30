# External tracker to Kanban reconciliation

Use only when an external tracker remains canonical and unattended continuation must survive restarts. This must not replace hook-only continuation when the user rejects a duplicate persistent queue.

## Boundaries

- Keep issues, comments, labels, and PRs authoritative; Kanban cards are a thin execution index.
- Use a deterministic, profile-local poller only to mirror missing open items. Native Kanban owns claims, workspaces, heartbeats, retries, dependencies, and worker processes.
- Match by stable tracker identity and idempotency key, never title alone.
- Treat tracker closure as completion authority. A done card is stale while its canonical item or related PR remains open.
- Before recovery, preserve any live branch, PR, workspace, and artifact; never duplicate a running or queued attempt.
- Read the board and run state back after mutation. A successful command is not proof of dispatch.
- If canonical work is open and no worker runs, request one bounded dispatch pass only after proving no existing owner. Healthy reconciliation is silent.

## Worker contract

Require live tracker and current-base reconciliation, one writer per branch, RED/GREEN evidence, an early pushed checkpoint, exact-head independent review, guarded merge, closure readback, and cleanup. Opening a PR or reporting tests is not terminal completion.
