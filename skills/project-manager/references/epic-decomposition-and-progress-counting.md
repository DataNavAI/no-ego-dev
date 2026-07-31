# Epic decomposition and truthful progress counting

Use this when architecture creates milestone-sized GitHub issues or when a user asks how many development tasks remain.

## Classify work before counting

- **Epic/milestone:** spans multiple independently shippable outcomes, specialist roles, deployment stages, or PRs.
- **Child implementation task:** one branch/PR-sized outcome with objective acceptance tests and a named owner.
- **QA child task:** verifies one implementation candidate against named interfaces and durable evidence requirements.
- **Release gate:** authorization or operational approval; report separately rather than counting it as implementation work.

Never answer “N tasks remain” by counting open epics. Say “N open epics” and, if children are absent, state that a truthful task count does not exist yet.

## Decomposition gate

A broad user request becomes a coordination hierarchy, never one implementation assignment:

```text
Milestone/epic: <one verifiable user/project outcome>
├── Child 1: <one small independently reviewable outcome>
├── Child 2: <next small outcome; depends on Child 1>
├── Child 3: <integration or interface-specific outcome>
├── QA child: <exact candidate + interfaces + evidence>
└── Release gate: <authorization/operational checks, counted separately>
```

Before implementation starts on an epic:

1. Read the full parent acceptance criteria and mandatory end task.
2. Split it into dependency-ordered child issues small enough for one focused worker and one focused PR, normally 0.5–2 working days. If one child still contains multiple independently shippable acceptance outcomes, split it again before dispatch.
3. Give each child: a specific action-oriented title; parent link; user-visible or system outcome; affected files/components/interfaces when known; scope exclusions; dependencies; owner/specialist; acceptance tests; QA needs; expected evidence; and merge/closure gate.
4. Create the complete known child hierarchy **before** creating implementation branches or PRs. A PR title, branch, parent comment, or subagent prompt is execution evidence, not a substitute for a durable task.
5. Add a separate QA child after each user-facing implementation child, linked to the exact candidate and supported-device registry.
6. Keep the parent open until every acceptance criterion maps to a merged child plus required QA/release evidence.
7. Present milestone count, child implementation count, QA count, release-gate count, dependencies, and currently unblocked children before execution begins.

Minimum child shape:

```text
Child task — <small action-oriented outcome>
- Parent milestone: <ID/link>
- Outcome: <one independently verifiable result>
- Scope: <included behavior/components/interfaces>
- Exclusions: <explicitly not part of this child>
- Dependencies: <IDs or none>
- Owner/specialist: <role>
- Acceptance: <objective checks>
- Tests/QA: <targeted tests and linked QA child>
- Evidence: <PR/SHA, output, screenshot/log/report>
```

### Pre-dispatch separability test

A task is still oversized even when it is called a child if it crosses independently testable authorities or side-effect domains. Before assigning it, inventory the outputs and split when two or more can land and be verified independently:

- pure deterministic model, compiler, serializer, or binary artifact;
- controller/browser orchestration and lifecycle cancellation;
- analytics/outbox delivery;
- deployment, publication, or external-service writes;
- supported-interface or release-candidate QA.

A common dependency order is `pure core/artifact → integration/orchestration → independent QA`. Each child gets its own immutable base/head, RED→GREEN evidence, and merge gate. This keeps review scope narrow and makes interrupted work recoverable.

Do not use an agent timeout as the first sizing signal. Apply this test before dispatch. If a seemingly small pure-core child may spend substantial time on exhaustive vectors or external verification, require a pushed minimal RED→GREEN checkpoint before the expensive matrix.

## Progress reporting

Report separately:

- epics open/complete;
- child tasks open/in progress/complete;
- QA tasks open/in progress/complete;
- release/publication gates blocked/ready.

Use concrete language such as:

> 3 epics remain. They have 14 child tasks: 5 complete, 1 in progress, 8 open. Publication approval is a separate blocked gate.

If children were never created, say so and decompose before claiming task-level percentages or counts.

## Parent closure audit

After the last planned PR merges:

1. Verify the immutable merged-main revision.
2. Re-read every parent acceptance criterion against landed code and tests.
3. Search for named outputs—not just related concepts (for example, “PNG/copy sharing” requires actual PNG/copy behavior and byte-level tests, not merely a result screen).
4. Create missing child issues for uncovered gaps and keep the parent open.
5. Close the parent only after all gaps and QA children pass.

## Interrupted-worker recovery and scope correction

Treat a delegation timeout as **interrupted**, not completed or failed by assumption.

1. Inspect the intended remote branch SHA, open/draft PRs, pushed commits, and registered worktree before re-dispatching.
2. Compare the branch SHA to its immutable base. A branch that still equals base, with no PR or implementation commit, has **no recoverable checkpoint** even if the worker made many API calls.
3. Record the interrupted attempt and recovery evidence on the child issue so progress accounting remains truthful.
4. If a checkpoint exists, continue from that exact artifact; do not restart and duplicate work.
5. If no checkpoint exists, reconsider task size before retrying. Split combined outcomes into dependency-ordered children whenever each can be tested and reviewed independently.
6. Require the replacement worker to push an early focused RED→GREEN checkpoint before controller/UI work, full-suite verification, screenshots, or network-heavy review setup. If time runs short later, the durable checkpoint survives.

Example correction:

```text
Parent acceptance gap: evidence-linked result + PNG/native/copy sharing
├── child A: pure recognized/missed evidence projection + safe rendering
├── child B: PNG/native/copy sharing + share analytics (depends on A)
└── child C: supported-interface QA against the merged candidate
```

Do not retry the original combined assignment merely because it was already named a “child.” A child that repeatedly times out or spans separable acceptance outputs is still oversized.

## Common failure modes

- Calling four milestone issues “four dev tasks.”
- Tracking slices only as PRs and issue comments.
- Closing the parent because the latest PR passed while another acceptance criterion was never implemented.
- Combining implementation, QA, deployment, and publication into one status count.
- Treating a green exact-head review as proof of parent-scope completeness when the reviewer only assessed that PR’s stated scope.
