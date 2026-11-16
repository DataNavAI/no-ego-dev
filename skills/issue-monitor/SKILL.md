---
name: issue-monitor
description: Drive authorized repository issues through implementation, self-review, CI and verified merge using durable scheduling state.
version: 1.17.1
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [github, issues, monitoring, cron, delegation, tdd, review, merge]
    related_skills: [github-issues, github-pr-workflow, test-driven-development, subagent-driven-development, requesting-code-review]
---

# GitHub Issue Monitor

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

Use when the user requests ongoing issue execution. Respect the selected tracker, repository, priority, concurrency and publication authority; do not create another work graph when the user chose an existing one.

## Scheduled execution

1. Inspect the actual repository, canonical issues, dependencies, current workers and remote branches/PRs. Reconcile completed or uncertain work before claiming another issue.
2. Claim one eligible outcome atomically where the tracker supports it. Record its owner, acceptance criteria and delivery location. Preserve the user's one-task/one-PR rule when present.
3. Reproduce a reported defect with a meaningful check when appropriate. Implement the smallest complete change and self-review its contract, consumers, security and failure behavior.
4. Run the required repository checks and relevant real-boundary verification. Fix failures; never turn unavailable evidence, skipped checks or stale CI into a pass.
5. Open/update the implementation PR and merge under existing user authorization and branch protections once required checks pass. The implementer/coordinator may perform this; a separate reviewer or merge-only executor is not required by this skill.
6. Read back the merge and required deployment. Record actual evidence and remaining limitations, close only satisfied acceptance criteria, then reconcile the next eligible issue.

## Recovery and notifications

Use explicit working directories and finite tool deadlines. Before retrying a timed-out dispatch or mutation, inspect persisted issue/PR/provider state and worker liveness. Never duplicate an active writer, issue or publication after an uncertain response.

Continue already authorized work without repeated phase confirmations. Ask only for missing information or authority that actually blocks progress. For recurring monitors, stay quiet when state is unchanged; notify on completion, meaningful failure, required user input or another actionable change.

Keep credentials and private runtime content out of reports and issue fields. A source merge does not prove deployment, provider health or real product acceptance. No separate-review wait state is created unless the user explicitly requested that review.

Dedicated review references are optional for an explicit review request, not the default issue-execution path.
