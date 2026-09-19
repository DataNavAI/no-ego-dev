# Durable workstream reconciliation

## Stable accounting

Assign one stable ID per product outcome. The capacity cap counts those IDs, not implementers, reviewers, fixers, attempts, or candidate generations. Explicit sequential mode sets the cap to one until exact verification, approval, merge, and parent/frontier reconciliation finish.

Each lease records workstream ID, repository/workdir, issue/PR, base/head, dependencies, state, worker/run handle, heartbeat/expiry, expected artifact, and last verified evidence. Before replacement, prove the old writer cannot mutate and compare runtime, remote, tracker, and artifact state atomically.

## Durable handoff

A summary is a claim. Read exact bytes from the canonical checkout or remote object; verify changed paths, hashes, base/head, and remote existence. Missing local-only bytes are `UNDELIVERED`, never reconstructed from prose.

For stacked work, identify the actual child target and parent feature branch. If a child merged into a synthetic exact-base branch, use an explicit bridge into the parent, review that bridge, refresh the parent head/base, and perform aggregate review. Child approval does not transfer.

## Review hold and scheduled context

Before review, persist an exact-SHA `REVIEW_PENDING` hold in a required status/review mechanism or canonical tracker. Every merger rereads it immediately before promotion. Scheduled controllers use an explicit absolute workdir or repository argument and verify the repository marker before product commands.

## Frontier reconciliation

After every terminal event and merge: reread plan/tracker, remote refs, durable bytes, review verdicts/holds, dependencies, and capacity. Dispatch one highest-priority eligible owner per free slot or record the exact blocker. Lifecycle completion is only a wake signal.

## Cleanup gate

Delete only inventoried task-owned residue after proving exact ownership, terminal/no-open-handle state, no uncommitted or unpushed work, and preservation of all required commits, reports, and evidence. Uncertainty, shared/user paths, credentials, production resources, or sole evidence block cleanup.
