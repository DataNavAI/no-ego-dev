# Canonical issue tracker with a thin Hermes Kanban execution queue

Use when GitHub, Linear, or another external tracker already owns product/task truth and Hermes Kanban is added for durable automatic dispatch.

## Authority map

| Concern | Canonical authority |
|---|---|
| Problem, scope, exclusions, acceptance, labels, milestone, user discussion | External issue |
| Code review, checks, merge state, commit identity | Pull request and repository |
| Ready/running/blocked worker state, retries, heartbeats, dependency promotion, run logs | Kanban |
| Current project snapshot | Repository `STATUS.md` or established status artifact |

Kanban is an execution index and durable queue—not a second product backlog.

## Thin-card contract

Create one card per independently reviewable issue/PR with only:

- canonical issue URL and stable ID;
- repository/project and assigned profile;
- isolated workspace/branch policy;
- forced specialist skills when needed;
- machine-readable parent links needed by the dispatcher;
- idempotency key such as `github:<owner>/<repo>#<number>`;
- completion contract: exact commit/PR, tests, evidence, and blocker behavior.

The card must say `read the live canonical issue before editing`. Do not paste the complete issue body unless the external tracker is unavailable or an immutable snapshot is required for a review; in that case record the snapshot revision/hash and reconciliation rule.

## Lifecycle

1. **Create/reconcile:** fetch the live issue; create the card idempotently or update orchestration metadata. If the issue is closed, superseded, or blocked, do not dispatch stale work.
2. **Promote:** Kanban links express dispatch dependencies. Reconcile those edges when the canonical tracker changes; creation order is not dependency order.
3. **Execute:** the worker re-reads the issue and governing artifacts, works in an isolated worktree, and posts branch/PR/evidence to the canonical tracker.
4. **Review:** use dependent exact-head spec and quality-review cards. Review verdicts point to immutable PR SHAs rather than duplicating findings into multiple mutable descriptions.
5. **Complete:** verify the remote branch/PR/test evidence, update or close the external issue as appropriate, then complete the Kanban card. Treat these as one handoff transaction; if either side fails, leave an explicit reconciliation comment/blocker.
6. **Recover:** on timeout/interruption, inspect remote PRs/refs/commits and surviving worktrees before creating replacement work. Reuse the same idempotency key to prevent duplicate cards.

## Completion triggers

- Kanban worker completion promotes dependency-ready children durably; the gateway dispatcher launches them subject to capacity.
- A `subagent_stop` hook may request an immediate idempotent dispatch/reconciliation pass after each delegated child. It does not replace Kanban and does not prove that the child produced a valid artifact.
- Cron is a fallback reconciliation/watchdog, not the primary completion trigger. Keep it silent when state is healthy and never let recurring jobs create duplicate cards.
- Webhooks may synchronize external issue/PR events when available. Verify the installation's actual integration; do not claim native two-way sync without evidence.

## Reconciliation checks

Before dispatch and before completion, verify:

- canonical issue still open and scope/dependencies unchanged;
- idempotency key maps to exactly one non-archived card;
- card branch/worktree does not overlap another writer;
- PR head SHA equals reviewed/tested SHA;
- external issue and Kanban status agree, or a recorded reconciliation action explains the difference;
- no copied issue body has become a hidden second source of truth.
