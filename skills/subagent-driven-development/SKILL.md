---
name: subagent-driven-development
description: "Execute plans through fresh Hermes leaf subagents with immutable consolidated review."
version: 1.12.0
author: Hermes Agent (adapted from obra/superpowers)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [delegation, subagent, implementation, workflow, parallel]
    related_skills: [writing-plans, requesting-code-review, test-driven-development, delegation-reliability]
---

# Subagent-Driven Development

## Overview

Execute a plan as small dependency-safe slices. Each slice gets a fresh implementer and one composite independent reviewer against an immutable candidate by default.

**Core principle:** fresh implementer + one independent composite review of specification, correctness, quality, security, and regression evidence. Split review kinds only for genuinely specialized, high-consequence boundaries that one qualified reviewer cannot credibly cover.

**Bounded review principle:** Fresh context does not mean repeated execution of the same unchanged candidate. Every review stage has a fixed budget, a durable attempt-scoped result, and an exact `(candidate SHA, review kind)` identity. Reserve the final 20% for report closure. Reuse verified exact-SHA CI for broad coverage, run only missing focused/adversarial checks, and return `INCOMPLETE` rather than timing out without evidence. A valid negative verdict routes one fixer; it is not retried against the same SHA.

For scheduled controllers, never rely on async completion reinjection. Dispatch at most one reviewer per run, require a durable external report or marked tracker comment, end as `REVIEW_PENDING`, and reconcile the durable sink before the next retry. Attach only the controller skill to the cron job by default; each child loads its role-specific review skills.

## Controller Contract

1. Read the plan and governing artifacts once; create the tracked task list.
2. Pass the timeout and contract preflights before the first delegation.
3. Dispatch one fresh leaf implementer for one independently testable vertical slice.
4. Freeze and verify the resulting candidate, then write and validate a review-readiness receipt before review.
5. Dispatch one reviewer per immutable candidate using the composite review bundle by default. Add a specialized reviewer only for a named high-risk boundary and keep all required kinds in one shared round.
6. Correct one consolidated finding set and rerun every invalidated exact-SHA gate.
7. Continue automatically to the next dependency-safe slice; finish with integration review and canonical verification.

`delegate_task` returns immediately. A top-level `tasks=[...]` call creates **N independent background children**: each receives its own handle and each completion re-enters the parent as a separate message. The parent should finish the dispatch turn and reconcile each completion independently; do not poll background children. Use separate single-task calls only when the controller needs explicit per-call ownership, timing, retry, or capacity boundaries—not to manufacture completion behavior that a modern batch already provides.

## Upfront Requirement Confirmation and Automatic Continuation

Before production work, derive the contract from the plan, governing artifacts, repository, tests, and recorded decisions. Escalate only unanswered requirements whose later reversal would materially change scope, public or persisted contracts, security/privacy, supported interfaces, provider/runtime, cost, or destructive behavior.

If confirmation is needed, ask **one upfront batch of no more than three short questions**. Every question must be costly to reverse, easy to understand, one decision only, unanswered by tools or artifacts, and paired with a recommended default or compact choices. If more than three genuinely blocking decisions remain, present a compact decision table or mark intake blocked; do not omit material decisions or start a serial interview. Subagents return material contract blockers to the parent.

After confirmation, automatically dispatch the next dependency-safe implementer or reviewer as gates pass. Progress updates are informational. **Do not ask for routine phase approval.** Pause only for a newly discovered costly contradiction, missing access, unresolved blocking review finding, or external spend, production, publication, credential, or destructive authority.

## Risk-weighted review convergence

Apply **Risk-weighted review** across specification, quality, domain, and integration gates. Spend depth on hard-to-reverse or high-consequence changes: public contracts, migrations, destructive data paths, authorization/privacy/security, payments, infrastructure commitments, critical journeys, and decisions without credible rollback. Omit reversible nits such as naming taste, cosmetic formatting, optional refactors, and minor polish.

Enforce **first-round completeness**. **Round 1** inspects the full authorized scope and returns all independently discoverable Critical/Important or otherwise material findings in one deduplicated correction matrix with evidence and enough direction to fix each bounded defect class. **Round 2** verifies dispositions and correction-introduced regressions. **Round 3** is final. Later-round feedback is limited to unresolved findings, correction-introduced regressions, genuinely unavailable evidence, or a material defect that could not reasonably have been found earlier; every new blocker states `Why it was not discoverable in round 1: <cause>`.

**No round 4** is dispatched for the same stable scope or lineage. If Round 3 is not approved, keep the candidate blocked and escalate the unresolved risk or scope choice. Tests and scanners cannot waive the unresolved gate.

### Canonical round accounting

**One review round is one immutable candidate generation.** The composite reviewer and every predeclared specialist **share one candidate generation and round number**. Persist one receipt keyed by repository/artifact, lineage, round, **candidate SHA, current base SHA, and complete authorized review-bundle manifest**, with per-bundle outcomes. **A corrected candidate advances exactly one round** and invalidates all prior commit-bound verdicts.

### Review consolidation and readiness

Before spending independent reviewer capacity, the controller completes its own risk-weighted audit and validates one machine-readable **review-readiness receipt** bound to repository, PR/artifact, lineage, round, candidate SHA, current base, and the complete review-bundle manifest. It must prove a clean worktree, empty unintended/untracked scope, static analysis, focused tests, canonical full tests, build, secret scan, exact-SHA provider checks, and self-audit. Only an actually absent provider check may use `PASS_OR_NOT_REQUIRED`; implementation gates must be `PASS`. Missing, foreign, or negative evidence routes back to the implementer without starting review.

For ordinary changes, dispatch one **composite independent reviewer** that covers specification, correctness, security, regression honesty, repository conventions, and operational risk in one complete pass. Use a separate specialized reviewer only for a clearly named hard-to-reverse domain—such as destructive migration, authorization/privacy, payments, cryptography, accessibility evidence, or broad infrastructure blast radius—that the composite reviewer is not qualified to assess. Required specialized kinds share the same frozen candidate and round; collect all results before one deduplicated correction packet.

Use an atomic review index keyed by repository, PR/artifact, lineage, round, exact candidate SHA, and review bundle. One structurally valid `APPROVED` or `REQUEST_CHANGES` closes that bundle for the unchanged SHA; an active attempt suppresses another launch. An `INCOMPLETE` result permits at most one replacement restricted to its declared missing evidence. A changed SHA creates the next candidate round, never a retry of the old bytes.

## When to Use

Use this workflow for multi-slice implementation where specification and quality matter. For one small reversible edit, execute directly with TDD and one independent final review instead of manufacturing a multi-agent project.

## The Process

### 1. Parse and Track the Plan

Read the plan once, extract every task with dependencies and governing context, and create a todo list. Children receive the complete slice and contract directly; do not make them rediscover the plan.

### 1.4 Delegation Timeout Pre-flight

Before the first `delegate_task` call, verify the **active profile's** execution budget. Do not assume a copied profile, gateway, or prior session inherited it.

1. Resolve the active profile and config path with `hermes config path`, then read that exact `config.yaml`.
2. Require `delegation.child_timeout_seconds` to be positive and at least **`1800` seconds**. For the standard baseline:

   ```bash
   hermes config set delegation.child_timeout_seconds 1800
   ```

3. Require `agent.gateway_timeout` to be strictly greater than the child timeout. For an 1800-second child:

   ```bash
   hermes config set agent.gateway_timeout 3600
   ```

   For a child timeout above 3000 seconds, use at least `child_timeout_seconds + 600`.
4. Re-read the active profile's `config.yaml`. **Do not dispatch** while either value is missing, invalid, too small, internally inconsistent, or written to another profile.
5. Prove the running gateway adopted the saved value **even when the persisted value was already correct**. Prefer trustworthy process-owned startup receipt or timeout-specific generation evidence that binds the PID, profile, and adopted timeout without exposing process environment or secrets. If that evidence is unavailable, compare the gateway PID and process start time with the config file's modification time. If the runtime predates the relevant config, service identity is ambiguous, or you cannot prove adoption, checkpoint the plan, restart that profile's gateway, and stop without dispatching.
6. After restart, continue only in a **fresh request**. Re-read persisted values and prove the new runtime generation adopted them. A config write or successful restart command alone is insufficient.

Record profile, config path, child timeout, gateway timeout, runtime evidence type, and restart status.

### 1.5 Contract-Alignment Pre-flight

Compare the slice against its governing PRD, technical specification, schemas, examples, and reviewed UI brief. Freeze exact field names, collections, enums, timestamps, stable error codes, routes, and accepted/forbidden terminology in one compact contract table.

A task excerpt does not override a higher-level contract. Resolve drift before RED. Use [references/contract-alignment-gates.md](references/contract-alignment-gates.md) and [references/contract-drift-review.md](references/contract-drift-review.md).

### 1.6 Continuation Mode

Prefer hook-only continuation when GitHub or Linear is canonical and the user rejects a duplicate queue. A top-level `delegate_task(tasks=[...])` batch is independent fan-out: each child has its own handle and completion delivery, so the first verified finisher can wake dependency reconciliation without waiting for siblings. Use separate single-task calls when explicit per-call ownership or retry boundaries improve control.

Hook-only mode is process-local. Use Hermes Kanban only when restart survival and unattended dependencies justify a durable second queue. Load `delegation-reliability`; observer hooks are wake signals, never acceptance or merge authority.

**Every worker completion must wake scheduling reconciliation.** In an attached interactive workflow, Hermes completion delivery re-enters the parent turn. In a durable workflow, a `subagent_stop` hook emits a content-free wake to the serialized Kanban or scheduled controller. The controller re-reads durable artifacts, dependencies, claims, candidate identity, and capacity, then schedules the next eligible worker immediately. **The hook never dispatches a child directly**, promotes a dependency from lifecycle status, or carries child-controlled text into executable arguments; it only triggers the authoritative reconciler. Keep a periodic fallback for lost wakeups and make duplicate wakes idempotent.

**Work-conserving rule:** keep one real worker active while dependency-safe work exists. `in_progress` without a live worker is stale bookkeeping. Zero workers is valid only when every remaining item has an explicit dependency, access, safety, external-operation, or user-decision blocker.

### Active Subagent Status for Users

**Prefer Hermes's in-process active-subagent registry** and completion events while the owning process is alive. Hermes already tracks live children internally. **Do not require a duplicate lifecycle ledger** for ordinary attached delegation. Keep only the workflow checkpoint needed to associate the returned handle with its goal, expected artifact, and blocked successor.

On gateway messaging surfaces, `/agents` or `/tasks` may not expose that child registry, so do not use the command's output or absence as proof. When the parent is busy, tell the user to queue this non-interrupting request:

```text
/queue Report active subagent status from Hermes runtime tracking and completion events. For each known handle, give its goal, verified state, and evidence source. Do not use /agents as authoritative evidence. Mark unconfirmed liveness as unknown.
```

Report only what the owning runtime or a terminal completion establishes. **Mark unconfirmed liveness as `unknown`** instead of creating a shadow truth source. Use an optional profile-scoped `subagent_start`/`subagent_stop` hook ledger only when operators need cross-surface or post-restart history that Hermes's process-local registry cannot provide. For durable Kanban work, use `hermes kanban list --status running --json` and inspect `hermes kanban runs <task_id> --json`. Load `delegation-reliability` and its active-visibility reference for the exact boundary.

### 2. Implement One Vertical Slice

#### Step 1: Dispatch Implementer Subagent

Dispatch a fresh leaf with complete context and strict TDD:

```python
delegate_task(
    goal="Implement the named vertical slice using strict RED-GREEN-refactor",
    context="""
    Include: exact task, governing contract, allowed paths, repository identity,
    focused and canonical commands, required durable artifact/commit, and
    explicit non-goals. Write one failing behavioral test, observe RED, make the
    smallest GREEN change, refactor while green, and verify before handoff.
    """,
    role="leaf",
)
```

One task is **one independently testable vertical slice** that fits the verified execution envelope. Do not impose an arbitrary minute count. Split by dependency and independently reviewable behavior, not by horizontal layers.

Never overlap writers on the same paths. Before accepting a handoff, inspect actual Git status, commits, remote refs, and changed files; asynchronous summary order is not repository authority.

### 3. Freeze the Candidate

**Before consuming reviewer capacity**, finish the parent's cross-layer audit and every planned verification edit. Then stop mutation, run the required checks, and establish a clean commit or explicitly staged snapshot.

For a staged candidate, record base `HEAD`, branch, `git write-tree`, staged binary-diff SHA-256, staged path count, unstaged state, untracked set, and durable evidence locations. Each reviewer revalidates that receipt before verdict; the parent recomputes it before commit. Any edit, restage, generation, or base update invalidates a pending verdict.

Do not run generators or mutating checks in a shared checkout while a read-only reviewer is inspecting it. If a shared checkout moves but the requested commit remains available, materialize `git archive <sha>` into a reviewer-owned directory, verify extracted bytes against Git objects, and run checks with that directory as the explicit cwd. Never reset or restore someone else's checkout to make it reviewable.

### 4. Composite Independent Review

Dispatch one fresh read-only leaf that did not author the ordinary candidate:

```python
delegate_task(
    goal="Review the frozen candidate comprehensively for material release blockers",
    context="""
    Include the exact candidate identity, absolute checkout, original contract,
    allowed scope, evidence locations, failure-class inventory, and output schema.
    In one pass cover specification compliance, correctness, security, regression-
    test honesty, repository conventions, integration, and operational risk. Do
    not edit. Omit reversible nits. Return APPROVED, REQUEST_CHANGES, or INCOMPLETE
    with one complete evidence-backed material finding set.
    """,
    role="leaf",
)
```

The composite reviewer checks both the local slice and governing artifacts and returns all independently discoverable material findings in one result. Preserve distinct evidence states inside that single result; never collapse selection, accessibility, security, or implementation evidence into an unsupported blanket PASS.

Predeclare an additional specialized bundle in the readiness manifest only when a named hard-to-reverse boundary requires expertise the composite reviewer cannot credibly supply—for example cryptography, payments, destructive migrations, authorization/privacy, difficult accessibility evidence, or broad infrastructure blast radius. Every authorized bundle reviews the same frozen candidate and round, receives only its non-overlapping specialty scope, and completes before one consolidated correction matrix. Do not add separate specification and quality reviewers for ordinary changes, and do not split overlapping concerns merely to reduce latency.

### 5. Correct and Re-review

Route one consolidated matrix to one fresh fixer. Add a behavioral RED for each correction, obtain GREEN, rerun affected checks, and freeze a new candidate. A test-only correction changes the commit SHA and can alter the asserted contract; **rerun every required exact-SHA review kind** against the final commit.

A timeout, empty summary, or partial transcript is not approval. Recover the durable report before replacing a reviewer. If the full summary path is named, read it before counting findings.

### 6. Final Integration and Completion

After all slices pass their gates, dispatch one fresh integration reviewer against the complete immutable result. Run canonical tests, static analysis, package checks, diff checks, and required security scans. Mark the plan complete only after every required verdict and check applies to the same final candidate.

## Failure Recovery

### Implementer timeout or interruption

A timeout is transport state, not proof of implementation failure. Follow [references/timeout-recovery-and-semantic-review.md](references/timeout-recovery-and-semantic-review.md): inspect remote branch/PR/commits first, then shared and isolated residue; verify exact identities; preserve coherent RED or GREEN checkpoints; and dispatch only the missing continuation after confirming the old writer stopped. Never invent missing RED evidence.

### Reviewer timeout or missing verdict

Keep the gate closed. Read the complete attempt-scoped report and checksum if present. Reuse trustworthy exact-candidate CI, narrow only missing evidence, and never dispatch duplicate broad reviews for an unchanged `(SHA, review kind)`.

### Questions and blockers

Answer from contracts, repository evidence, or recorded defaults. Escalate only unresolved costly-to-reverse decisions. Continue other dependency-safe, non-overlapping work while one slice is blocked.

## Non-Negotiable Rules

- No implementation without a plan or clear slice contract.
- No production change without observed RED and GREEN evidence unless the user explicitly authorized an exception.
- No overlapping writers or mutation of a review snapshot.
- No self-review as a substitute for independent review.
- No fragmented specification/quality reviewer chain for an ordinary candidate; use one composite independent verdict.
- No downstream promotion from lifecycle `completed`; verify artifacts and verdicts.
- Every terminal worker completion wakes scheduling reconciliation; callback code never directly dispatches or promotes a child.
- No stale approval after any byte change.
- No unresolved Critical/Important or otherwise material finding at completion.

## Further Reading

Load only the reference needed for the current risk:

- [references/context-budget-discipline.md](references/context-budget-discipline.md) — context degradation and bounded reading.
- [references/gates-taxonomy.md](references/gates-taxonomy.md) — preflight, revision, escalation, and abort gates.
- [references/generated-browser-runtime-verification.md](references/generated-browser-runtime-verification.md) — generated/browser runtime evidence.
- [references/timeout-recovery-and-semantic-review.md](references/timeout-recovery-and-semantic-review.md) — remote-first timeout recovery.
- [references/contract-alignment-gates.md](references/contract-alignment-gates.md) and [references/contract-drift-review.md](references/contract-drift-review.md) — governing-contract alignment.

The context-budget and gates references are adapted from gsd-build/get-shit-done (MIT © 2025 Lex Christopherson).
