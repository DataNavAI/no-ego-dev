# Local container-runtime recovery for a required gate

Use this only when this issue monitor is blocked because a required local container-backed gate cannot run. It is not general host maintenance authority and does not apply when container execution is optional or when repository/provider CI already supplies the required evidence.

## Preserve serialized authority

Official Kanban remains the scheduling, claim, heartbeat, stale-reclaim, and dispatch authority. Recovery stays inside the existing serialized issue lineage with `max_in_progress=1`. It must not create a custom worker pool, lifecycle-plugin scheduler, direct detached runner, private wake protocol, or multi-slot controller. A recovery run must use the existing official Kanban task and at most one official dispatch.

## Classify the block

Read live state together:

1. official Kanban task/run/heartbeat evidence;
2. latest durable attempt receipt and terminal result;
3. issue labels and canonical issue/PR comments;
4. PR head/base identity and required checks; and
5. scheduler last/next tick.

Distinguish a handoff delay, intentional gate block, orphaned claim, and local runtime failure. Do not infer the answer from labels, process listings, or the previous chat message.

## Container-runtime investigation

1. Reproduce the repository's exact canonical gate command.
2. Inspect host disk and inode pressure, runtime status, VM filesystem access, daemon metadata, active/stopped containers, and recent runtime logs.
3. Determine whether any live container, volume, process, or worktree belongs to another task; do not interrupt it.
4. Read the authoritative image tag/digest and runtime command from the current candidate repository. Comments and prior notes are evidence, not authority.
5. Separate invalid image identity, runtime/VM filesystem corruption, and host/VM capacity exhaustion.

Do not call the runtime healthy merely because `docker info` succeeds. Cross-check VM filesystem reads, container metadata consistency, capacity, and the repository-authoritative immutable image pull.

## Least-destructive recovery ladder

Use one step at a time and verify before continuing:

1. Free safe host capacity without touching active repository/worktree data. Remove a clean registered worktree only after positive durable proof that it was **transaction-created**, **exact-task-owned**, declared **disposable**, currently **ownerless**, has **no unpushed commits**, has its exact head already on fetched default, and has terminal PR/issue state read back. Absence of a live process or a clean status is not ownership proof. Preserve external receipts and review evidence; otherwise leave the worktree untouched.
2. Confirm no foreign live container or process owns the runtime.
3. Perform one controlled runtime stop/start that preserves images and volumes.
4. Verify runtime status, VM filesystem reads, disk availability, consistent container counts, and the authoritative image pull.
5. Re-run the exact failed gate at the unchanged candidate SHA through the existing official Kanban lineage, using at most one bounded recovery dispatch.

A **VM delete/reset**, **container-store wipe**, **broad image/volume prune**, or **filesystem rebuild** is destructive. Require explicit approval after documenting affected local state and rebuildability. Without that approval, stop with the exact blocker; do not substitute a destructive action.

## Durable reconciliation

After recovery, persist and read back root-cause evidence, repair performed, a no-data-deletion statement, authoritative runtime identity, exact candidate SHA/tree, and the remaining gate. Replace blocked state only after the runtime probe passes. The recovery stage reruns the missing gate without speculative code changes; independent review starts only after that gate passes and candidate identity is re-read.
