---
name: unblocker
description: Use when a task, issue, job, PR, CI run, controller, or delegated work item cannot progress. Diagnose from authoritative evidence, apply one bounded causal action, prove RED to GREEN, trigger the canonical retry, and verify its readback without bypassing ownership or review gates.
version: 1.2.0
author: NoEgoDev
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [unblocker, blockers, recovery, retries, locks, evidence]
    related_skills: [project-manager, issue-monitor, product-communication, systematic-debugging, requesting-code-review]
---

# Unblocker

## Overview

Use an evidence-first recovery loop for blocked work:

```text
authoritative read → narrow reproduction → one causal action → RED → GREEN
→ canonical retry → authoritative retry readback
```

A recovery attempt is one diagnosis, one action (or an explicit no-action decision), verification, and one retry request. Keep attempts bounded by the owning workflow's policy. Never turn that operational budget into an approval shortcut: a recovery-attempt limit must never cap canonical review rounds. Review until approval or until an actual authority, safety, or external blocker is recorded.

## When to Use

Use this skill when a canonical task, CI job, PR, deployment, cron run, controller, or worker receipt says work is blocked and a safe autonomous repair may exist.

Do not use it to bypass branch protection, independent review, security, privacy, billing, compliance, credentials, destructive-change approval, or ambiguous product decisions. Do not weaken tests, redefine acceptance criteria, hide evidence, or substitute a different task.

## Recovery Contract

1. **Read authoritative state.** Read the canonical task/job/PR, exact failed attempt, current base, dependencies, owner receipts, logs, and repository instructions. A stale comment or child summary is only a lead.
2. **Name one falsifiable cause.** Prefer an exit code, failed assertion, missing prerequisite, exact lock claimant, API response, or state transition over a theory.
3. **Preserve RED.** For code, configuration, deterministic data, or reproducible orchestration, add the smallest task-owned test, fixture, script, or command and run it before changing behavior. Preserve command, exit status, and relevant output. If safe reproduction is impossible, record `NON_REPRODUCIBLE`, why, and the closest repeatable probe; do not invent a test.
4. **Route by ownership.** A coordinator diagnoses and sequences work but routes fixes to the task or domain owner. It must not seize a product repository, credential, scheduler, reviewer, or service merely because it detected the blocker.
5. **Apply one causal action.** Choose the narrowest reversible, task-owned intervention. Multiple speculative changes destroy attribution.
6. **Prove RED → GREEN.** Run the same reproduction after the action, then the relevant broader check. A zero exit status is not enough if authoritative state remains blocked.
7. **Use the canonical retry.** Re-run through the existing CI provider, scheduler, queue, worker contract, or exact failed command. Preserve lineage and avoid duplicate work.
8. **Require authoritative retry readback.** Read the canonical system again. Require a new attempt/run/receipt identifier, correct admitted revision and parameters, and its terminal outcome or bounded observed state.
9. **Repeat only with evidence.** A new attempt needs a new or still-falsifiable cause and another single action. Stop for authority, safety, unknown ownership, unavailable external dependencies, or exhausted recovery policy.

## Durable Receipt

Keep one receipt in the existing tracker rather than creating a competing system:

```text
task: canonical ID and URL/path
attempt: owning workflow attempt number
blocker: category, evidence, first observed time
reproduction: command/path and RED result, or NON_REPRODUCIBLE rationale
hypothesis: falsifiable cause
action: one exact bounded intervention or NO_ACTION
owner: task or domain owner responsible for the fix
verification: same reproduction GREEN plus broader check
retry: canonical runner, new ID, revision/parameters, state
next_state: COMPLETED | BLOCKED_NEW_CAUSE | BLOCKED_UNRESOLVED | HUMAN_REQUIRED | ATTEMPT_LIMIT
```

Changing error text is not completion. A retry request is not admission, and admission is not success.

## Review Rejections Are Not Retry Budgets

A material review rejection is a correction trigger. Re-read the immutable candidate, full blocking set, current base, and review lineage. Preserve the rejection as evidence, route each correction to its task or domain owner, run focused RED→GREEN checks, then obtain independent review of the changed bytes.

Operational recovery limits may bound repeated CI reruns, transient retries, or speculative remediation. They do not authorize approval by exhaustion. The recovery-attempt limit must never cap canonical review rounds, discard valid findings, or merge an unapproved candidate. Continue review until approval; if review cannot continue, record the concrete external or authority blocker rather than relabeling the limit as approval.

## Safe Lock Recovery

A lock path and old timestamp do not prove staleness. Before touching a task-owned lock, identify all of:

- the owning helper or controller that created and releases it;
- the exact owner token and, when present, lease nonce;
- recorded PID plus the live command line;
- process ancestry and controller/session relationship;
- lease age/expiry and associated task, worktree, PR, or run;
- whether the official helper exposes an authenticated release or reclaim command.

Then perform race-safe revalidation immediately before mutation: reopen/re-read the claim, compare identity fields and file metadata, confirm the same owner is still dead/expired and no replacement appeared, claim only that exact stale generation when the protocol supports it, and use the owning helper's authenticated operation. Verify the helper receipt, process disposition, and lexical lock absence afterward.

Never delete a shared or controller lock with a generic file-removal command. Never recursively delete a lock directory, signal a PID based only on stale metadata, remove an unknown/live owner's claim, or improvise an inline replacement for the owning helper. If token, nonce, command, ancestry, ownership, or race-safe revalidation is unavailable, leave the lock intact and report the exact owner action required.

A local deterministic fixture may simulate owner replacement races and helper receipts. It must not imply that a real process was killed or a real controller lock was removed.

## Scheduled Jobs and CI

For a failed scheduled job, read the job record, exact command/prompt, configured workdir, owner, and latest run. Reproduce from the declared context before repair. Fix the smallest task/profile-owned cause; do not create a duplicate scheduler or revive a retired endpoint. Run the repaired command, trigger the existing job once, and read it back for enabled state, expected next run, new run identity, execution result, and product-level output when applicable.

For CI, use provider read APIs first. Confirm the failed job belongs to the intended repository, revision, and workflow. After local RED→GREEN evidence, trigger the provider's canonical rerun and read back the new run ID, head SHA, jobs, and conclusion.

## Deterministic Evaluation Boundary

An eval without authenticated disposable infrastructure is an explicit deterministic simulation. State the fixed initial records, permitted transitions, expected commands, and terminal readbacks. It may verify decision order, refusal of unsafe actions, receipt contents, review-budget separation, and lock-race handling.

Simulation output is never evidence of real CI side effects, a real scheduler rerun, a real lock release, a merge, deployment, or production repair. Do not call fake endpoints, fabricate provider IDs, write marker files that masquerade as remote receipts, or report simulated transitions as executed operations. Production recovery must use verified real coordinates and authoritative readback.

## Low-Risk Defaults

- Use documented commands, pinned dependencies, isolated task-owned workspaces, bounded timeouts, and provider retry guidance.
- Preserve uncommitted work, logs, failed outputs, durable receipts, and credentials.
- Treat permission/authentication, destructive data changes, force pushes, production mutation, and requirement ambiguity as escalation boundaries.
- Delete only a proven task-owned temporary artifact under its protocol; never default to recursive removal.
- When a user names a priority after interruption, resume with an executable evidence checkpoint, not an empty branch or status message.

## Common Pitfalls

1. Retrying without a causal diagnosis.
2. Writing the reproduction after the fix, so RED was never observed.
3. Treating a worker summary, command exit, or retry request as authoritative success.
4. Letting a coordinator modify assets owned by a specialist or service owner.
5. Deleting a lock because its PID looks dead without token/nonce/command/ancestry checks and a final race-safe reread.
6. Applying several fixes in one attempt.
7. Using a recovery limit to truncate required canonical review rounds.
8. Claiming a deterministic eval performed real CI, process, scheduler, merge, or deployment side effects.
9. Creating duplicate jobs, tasks, or worktrees instead of preserving lineage.
10. Cleaning evidence before the final readback.

## Verification Checklist

- [ ] Canonical current state proves the work is blocked.
- [ ] One falsifiable cause and owner are named.
- [ ] A focused reproduction showed RED before the action, or NON_REPRODUCIBLE is justified.
- [ ] Exactly one bounded causal action was applied by or routed to the task/domain owner.
- [ ] The same reproduction changed from RED to GREEN and broader checks passed.
- [ ] The canonical retry mechanism preserved lineage.
- [ ] Authoritative retry readback proves new identity, intended revision/parameters, and outcome.
- [ ] Lock handling, if any, used the owning helper/token/nonce/command/ancestry and race-safe revalidation.
- [ ] No shared/controller lock, approval gate, test, or acceptance criterion was bypassed.
- [ ] Recovery limits did not cap canonical review rounds.
- [ ] Simulated eval evidence is labeled non-mutating and is not reported as a real side effect.
