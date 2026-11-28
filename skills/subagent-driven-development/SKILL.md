---
name: subagent-driven-development
description: Execute implementation plans through authorized subagents with self-review and appropriate verification.
version: 1.12.11
author: Hermes Agent (adapted from obra/superpowers)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [delegation, subagent, implementation, workflow, parallel]
    related_skills: [writing-plans, requesting-code-review, test-driven-development, delegation-reliability]
---

# Subagent-Driven Development

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

In the main NED session, record actionable development as durable tasks on the NED task board before dispatch, or use the tracker the user explicitly chose. Delegate execution of each ready task to a focused subagent, including small fixes. Sequential work uses one worker at a time. If delegation is unavailable, record the blocker and keep the task open for retry. The main session handles communication, coordination, and acceptance. A worker executes its assigned slice directly and reports evidence to the main session. Sharing this skill with the worker does not require another layer of delegation.

## Coordinate the work

- Read the plan, repository instructions, tracker and existing ownership. Respect the user's tracker and concurrency limit; one blocked task does not authorize extra workstreams.
- Give each implementer a clear outcome, scope, starting revision, acceptance checks, writable paths and expected delivery. Keep overlapping writers out of the same checkout.
- Use existing CLIs/APIs and supported interfaces. Check prerequisites and reversible defaults before asking the user for missing information. Preserve existing action authority.
- Choose a finite execution interval for potentially hanging tools. Maintain durable task ownership, worker handle and actual progress where the scheduler needs them; do not infer completion from a stale lease.

## Implement and verify a slice

1. Dispatch one implementer for a focused dependency-safe slice. Pass the task ID, governing contract, and relevant artifacts.
2. Inspect the delivered source and actual check results. Self-review correctness, security, integration and test honesty against the governing contract. Worker completion alone does not establish a verified result.
3. Send material defects back to the responsible worker or reassign the existing task after confirming the previous worker has stopped. Run appropriate focused and canonical checks. Preserve source and artifact identity through integration.
4. Merge when checks, existing branch protection and user authorization permit. No reviewer verdict, approval receipt or frozen review generation is needed by default.
5. Read back the merged/deployed result, update the canonical tracker and reconcile dependencies before starting the next task.

## Timeouts and recovery

A tool timeout is not proof that a worker failed or stopped. Inspect its branch, commits, durable output and liveness before replacing it. Preserve coherent delivered work; continue only missing work after preventing overlapping writers. Do not blindly replay uncertain external operations.

Remove only verified task-owned residue after work is durable and no active writer or unpushed change remains. Preserve shared/user files, secrets and sole evidence. Keep actual tests, provider failures and material defects open; absence of a separate review never makes them pass.

## When the user requests independent review

Dispatch one qualified reviewer for the requested scope and provide source plus available evidence. Wait for that requested result and address material findings. Do not automatically add reviewers, integration review stages, specialist bundles, lineage packets or unbounded review loops.
