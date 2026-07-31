---
name: subagent-driven-development
description: "Execute plans via delegate_task subagents (2-stage review)."
version: 1.6.0
author: Hermes Agent (adapted from obra/superpowers)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [delegation, subagent, implementation, workflow, parallel]
    related_skills: [writing-plans, requesting-code-review, test-driven-development]
---

# Subagent-Driven Development

## Overview

Execute implementation plans by dispatching fresh subagents per task with systematic two-stage review.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

**Bounded review principle:** Fresh context does not mean repeated execution of the same unchanged candidate. Every review stage has a fixed budget, a durable attempt-scoped result, and an exact `(candidate SHA, review kind)` identity. Reserve the final 20% for report closure. Reuse verified exact-SHA CI for broad coverage, run only missing focused/adversarial checks, and return `INCOMPLETE` rather than timing out without evidence. A valid negative verdict routes one fixer; it is not retried against the same SHA.

For scheduled controllers, never rely on async completion reinjection. Dispatch at most one reviewer per run, require a durable external report or marked tracker comment, end as `REVIEW_PENDING`, and reconcile the durable sink before the next retry. Attach only the controller skill to the cron job by default; each child loads its role-specific review skills so the parent does not begin with an oversized repeated context.

## Risk-weighted review convergence

Apply **Risk-weighted review** across specification, quality, domain, and integration gates. Reviewers spend their deepest effort on hard-to-reverse or high-consequence changes—public contracts, migrations, destructive data paths, authorization/privacy/security, payments, infrastructure commitments, critical journeys, and decisions without credible rollback. Reversible nits such as naming taste, cosmetic formatting, optional refactors, and minor polish do not block and do not justify another round.

Enforce **first-round completeness**. **Round 1** must inspect the full authorized scope, follow every bounded sibling instance of a discovered issue class, and return all independently discoverable Critical/Important or otherwise material findings in one deduplicated correction matrix with evidence and enough direction for the author to fix the class rather than one symptom. **Round 2** verifies those dispositions and correction-introduced regressions. **Round 3** is the final review. Later-round feedback is limited to unresolved prior findings, correction-introduced regressions, genuinely unavailable evidence, or a material defect that could not reasonably have been found earlier; every new blocker states `Why it was not discoverable in round 1: <cause>`.

**No round 4** is dispatched for the same stable scope or lineage. If Round 3 is not approved, keep the candidate blocked and escalate the unresolved hard-to-reverse decision, residual risk, or scope choice. A changed SHA still requires exact-SHA review, but the round cap means no post-round-3 patch-and-review loop; tests and scanners cannot waive the unresolved gate.

### Canonical round accounting

**One review round is one immutable candidate generation.** All required review kinds against that candidate **share the same round number**, whether sequential or parallel; timeout replacements remain in that round. Persist one receipt keyed by **lineage, round, candidate identity, and required review-kind set**, with per-kind outcomes. **A corrected candidate increments the round** and invalidates all prior commit-bound verdicts.

## When to Use

Use this skill when:
- You have an implementation plan (from writing-plans skill or user requirements)
- Tasks are mostly independent
- Quality and spec compliance are important
- You want automated review between tasks

**vs. manual execution:**
- Fresh context per task (no confusion from accumulated state)
- Automated review process catches issues early
- Consistent quality checks across all tasks
- Subagents can ask questions before starting work

## The Process

### 1. Read and Parse Plan

Read the plan file. Extract ALL tasks with their full text and context upfront. Create a todo list:

```python
# Read the plan
read_file("docs/plans/feature-plan.md")

# Create todo list with all tasks
todo([
    {"id": "task-1", "content": "Create User model with email field", "status": "pending"},
    {"id": "task-2", "content": "Add password hashing utility", "status": "pending"},
    {"id": "task-3", "content": "Create login endpoint", "status": "pending"},
])
```

**Key:** Read the plan ONCE. Extract everything. Don't make subagents read the plan file — provide the full task text directly in context.

### 1.4 Delegation Timeout Pre-flight

Before the first `delegate_task` call in a workflow, verify the **active profile's** execution budget. Do not assume a copied profile, gateway process, or prior session inherited the intended timeout.

1. Resolve the active profile and its config path with `hermes config path`, then read that exact `config.yaml`.
2. Require `delegation.child_timeout_seconds` to be a positive value of **at least `1800` seconds (30 minutes)**. A missing value, `0` (disabled), invalid value, or value below `1800` does not satisfy this workflow contract. For the standard NED baseline, persist it with:

   ```bash
   hermes config set delegation.child_timeout_seconds 1800
   ```

3. Require `agent.gateway_timeout` to be **strictly greater than** the child timeout so the parent has time to receive, validate, and persist the child's result. For the 1800-second child baseline, use:

   ```bash
   hermes config set agent.gateway_timeout 3600
   ```

   If the configured child timeout already exceeds 3000 seconds, set the gateway timeout to at least `child_timeout_seconds + 600` instead of lowering it to 3600.
4. Re-read the active profile's `config.yaml` and verify both numeric invariants from the persisted file. Do not dispatch any implementer or reviewer while either value is missing, invalid, too small, or written to a different profile.
5. For a gateway-originated workflow, prove that the active profile gateway started from the persisted timeout configuration **even when the persisted value was already correct when this pre-flight began**. Capture the profile gateway PID and process start time without printing its environment or secrets, and compare that generation with the config file's modification time and the recorded values. If the runtime predates the config, the service identity is ambiguous, or you otherwise cannot prove the running process adopted the current `agent.gateway_timeout`, checkpoint the plan and resume point, restart that profile's gateway, and stop the current request without dispatching.
6. After any restart, continue only in a fresh request. Re-read the persisted config, identify the new gateway PID/process start time, and record evidence that the new runtime generation postdates the saved config before dispatching. A config write, a successful restart command, or values read only from disk do not by themselves prove runtime adoption.

Record the active profile, config path, child timeout, gateway timeout, and whether a restart was required in the workflow's pre-flight evidence. **Do not dispatch** the first subagent until the persisted values and active runtime satisfy this gate.

### 1.5 Contract-Alignment Pre-flight

Before the first production task, compare the plan and task fixtures against the governing PRD, technical specification, schema examples, and reviewed UI brief. Freeze exact field names, collection names, enums, timestamp formats, stable error codes, and accepted/forbidden UI terminology in a compact canonical-contract table.

A task excerpt is not authoritative when it conflicts with the higher-level contract. Resolve drift before RED rather than adding aliases or accepting a passing test for a schema the next task must replace. Give implementers the canonical table with the task excerpt.

Use [references/contract-alignment-gates.md](references/contract-alignment-gates.md) for the pre-flight checklist, revision review, partial-verdict handling, shared-worktree discipline, and candidate-versus-approved-data workflow.

### 1.6 Harness-Driven Continuation

When the user prefers no duplicate execution queue, use **hook-only continuation**: keep GitHub/Linear as the canonical queue, launch continuation-sensitive work as separate single-task `delegate_task` calls, and rely on each async completion delivery to re-enter the parent session. In that parent turn, verify the exact branch/SHA/PR/report, required commands, and gate verdict; reconcile the live tracker; then immediately dispatch the next dependency-safe implementer or reviewer.

`subagent_stop` is an observer/wakeup signal, not acceptance and not an imperative callback: its return value cannot launch the next child. Failed, interrupted, timed-out, missing, or partial artifacts route to recovery/blocking rather than downstream work. Do not maintain copied issue bodies or a second persistent task queue merely to support continuation.

A `delegate_task(tasks=[...])` batch is a consolidated fan-out, not a reliable first-finisher event stream. If the next task must be considered immediately after each child stops, dispatch separate single-task children in parallel. Hook-only mode is process-local: gateway/parent shutdown can interrupt children and lose the future callback, so recover remote artifacts before resuming and never call it restart-durable.

Use Hermes Kanban only when unattended restart survival or durable dependency execution materially outweighs the user's queue-duplication concern. In that mode, the hook requests an idempotent dispatch pass and Kanban remains authoritative. For either mode, load `delegation-reliability` and follow `references/harness-completion-hooks.md`.

Keep observer callbacks bounded: no LLM calls, merges, deployments, issue-spec mutation, recursive cron creation, or unverified dependency promotion. Verify the real completion-delivery path before relying on autonomous handoffs.

**Work-conserving queue rule:** while the plan/todo queue contains unfinished runnable work, keep at least one real worker active. On every parent turn and every async callback, compare the todo queue with actual delegation/process/Kanban runtime state. `in_progress` without a live worker is stale bookkeeping: inspect durable residue and re-dispatch an exact-input replacement immediately. If capacity is empty, dispatch the highest-priority dependency-safe, authenticated, non-overlapping task before replying; use extra capacity only for independent work. Never leave runnable work idle merely because a previous handle exists or a future hook is expected. Zero active workers is acceptable only when every unfinished item is concretely blocked by dependencies, auth, safety, an external operation, or a user decision; record that reason explicitly. This liveness rule does not weaken immutable review gates, artifact verification, writer isolation, or dependency ordering.

### 2. Per-Task Workflow

For EACH task in the plan:

#### Step 1: Dispatch Implementer Subagent

Use `delegate_task` with complete context:

```python
delegate_task(
    goal="Implement Task 1: Create User model with email and password_hash fields",
    context="""
    TASK FROM PLAN:
    - Create: src/models/user.py
    - Add User class with email (str) and password_hash (str) fields
    - Use bcrypt for password hashing
    - Include __repr__ for debugging

    FOLLOW TDD:
    1. Write failing test in tests/models/test_user.py
    2. Run: pytest tests/models/test_user.py -v (verify FAIL)
    3. Write minimal implementation
    4. Run: pytest tests/models/test_user.py -v (verify PASS)
    5. Run: pytest tests/ -q (verify no regressions)
    6. Commit: git add -A && git commit -m "feat: add User model with password hashing"

    PROJECT CONTEXT:
    - Python 3.11, Flask app in src/app.py
    - Existing models in src/models/
    - Tests use pytest, run from project root
    - bcrypt already in requirements.txt
    """,
    toolsets=['terminal', 'file']
)
```

#### Step 2: Dispatch Spec Compliance Reviewer

After the implementer completes, verify against the original spec.

**Shared-worktree handoff check:** Async delivery timing is not repository state. Before reviewing or starting corrective work, inspect `git status` and recent `git log`; an implementer may already have committed while its completion summary is still pending. Re-read every file named in the subagent handoff before editing, and never launch another writer against overlapping paths. Treat the repository and fresh test output—not notification order—as authoritative.

**Do not create even non-overlapping untracked files while a writer subagent is active in the same worktree.** Exact-scope implementers often restore or clean everything outside their allowed paths before committing, so a concurrently-created documentation or evidence file can disappear even though its path does not overlap production code. Wait for the writer's commit, confirm a clean/status baseline, then create and commit controller-owned artifacts. If unavoidable, keep interim work in profile-local scratch outside the repository and promote it only after the writer finishes. After every writer completion, verify both the expected commit and preservation of the pre-dispatch dirty/untracked baseline before accepting the handoff.

**Treat read-only reviewers as snapshot consumers, not as permission to mutate their checkout concurrently.** While a reviewer is inspecting generated pages, screenshots, git state, or an immutable candidate, do not run generators, builds, canonical test commands with generation prerequisites, cleanup commands, or any other operation that changes the shared worktree—even if those changes are disposable and later restored. Concurrent generation can make an accurate reviewer report describe a transient dirty tree or mismatched artifact set. Before dispatch, establish and record the exact SHA/status/artifact paths; during review, keep that snapshot stable. If useful work must continue, restrict it to truly read-only commands or a separate temporary checkout/worktree. After review, re-check SHA/status before acting on the verdict.

```python
delegate_task(
    goal="Review if implementation matches the spec from the plan",
    context="""
    ORIGINAL TASK SPEC:
    - Create src/models/user.py with User class
    - Fields: email (str), password_hash (str)
    - Use bcrypt for password hashing
    - Include __repr__

    CHECK:
    - [ ] All requirements from spec implemented?
    - [ ] File paths match spec?
    - [ ] Function signatures match spec?
    - [ ] Behavior matches expected?
    - [ ] Nothing extra added (no scope creep)?

    OUTPUT: PASS or list of specific spec gaps to fix.
    """,
    toolsets=['file']
)
```

**If spec issues found:** Fix gaps, then re-run spec review. Continue only when spec-compliant.

The reviewer must check both the local task excerpt and its governing artifacts (PRD, technical specification, schema examples, reviewed UI brief, and neighboring consumer tasks). A task-level PASS is still a FAIL if it introduces names, shapes, states, or copy that the next planned task must immediately replace. Require file/line evidence for drift. Use [references/contract-drift-review.md](references/contract-drift-review.md) for strict-shape tests, encoded-path cases, immutable-SHA review, and test-only handling of partial vertical slices.

When a review has mixed outcomes, preserve separate gate verdicts—for example, `direction selection: PASS`, `prototype copy: FAIL`, `production accessibility: NOT RUN`, `implementation acceptance: BLOCKED`. Never promote a winning option into an implementation-ready claim by collapsing those verdicts.

**Bounded parallel-review exception:** sequential spec-then-quality remains the default because it avoids wasting quality-review work on a spec-invalid candidate. When latency or the user's worker-liveness requirement justifies it, two independent **read-only** reviewers may inspect the same frozen SHA concurrently as separate single-task delegations. Give them unique report/checksum paths, keep the candidate frozen, and wait for both in-flight results before dispatching any remediation writer. A first failure blocks merge immediately but does not erase the other review; verify late/timeout-recovered reports and consolidate all findings into one correction matrix. Follow the parallel fan-in procedure in `project-manager/references/implementation-review-convergence.md`.

#### Step 3: Dispatch Code Quality Reviewer

For a task explicitly classified as a normal low-risk MVP/prototype slice, keep this as an ordinary code-quality review and **do not** add a standalone or combined deep product-security audit. The reviewer may flag obvious vulnerabilities introduced by the diff, while configured scanners and targeted trust-boundary tests remain part of verification. Add a dedicated security specialist only when the task introduces authentication/authorization, payments, private/regulated data, cryptography/credential issuance, untrusted uploads/deserialization/execution, public write/admin APIs, cloud IAM/secrets, artifact publication, or destructive account/data operations.

After spec compliance passes, do a **review-convergence preflight** before dispatching: identify the complete realistic failure class touched by the change (for example all asynchronous writers, all persistence boundaries, or all schema consumers) and give the reviewer that inventory. Ask for one exhaustive pass over the class, not only the last reported reproducer. For generated browser runtimes with overlapping session/auth/sign-out/follow/home/navigation work, require a single race matrix covering stale success, stale failure, and stale cleanup for every operation class. This reduces serial “one more race” review loops while keeping findings bounded to the current task’s acceptance criteria; reviewers must not expand into speculative unrelated architecture.

When a quality review reports a cross-cutting issue, remediation should add the whole bounded matrix for that issue class before re-review, while still using one RED→GREEN vertical slice at a time. The next immutable review context should list both the original findings and the completed matrix so the reviewer can verify convergence rather than rediscovering adjacent variants piecemeal.

```python
delegate_task(
    goal="Review code quality for Task 1 implementation",
    context="""
    FILES TO REVIEW:
    - src/models/user.py
    - tests/models/test_user.py

    CHECK:
    - [ ] Follows project conventions and style?
    - [ ] Proper error handling?
    - [ ] Clear variable/function names?
    - [ ] Adequate test coverage?
    - [ ] No obvious bugs or missed edge cases?
    - [ ] No security issues?

    OUTPUT FORMAT:
    - Critical Issues: [must fix before proceeding]
    - Important Issues: [should fix]
    - Verdict: APPROVED or REQUEST_CHANGES
    """,
    toolsets=['file']
)
```

**If quality issues found:** Fix the complete round-1 correction matrix and re-review, for no more than three total rounds. Continue only when approved.

#### Step 4: Mark Complete

```python
todo([{"id": "task-1", "content": "Create User model with email field", "status": "completed"}], merge=True)
```

### 3. Final Review

After ALL tasks are complete, dispatch a final integration reviewer:

```python
delegate_task(
    goal="Review the entire implementation for consistency and integration issues",
    context="""
    All tasks from the plan are complete. Review the full implementation:
    - Do all components work together?
    - Any inconsistencies between tasks?
    - All tests passing?
    - Ready for merge?
    """,
    toolsets=['terminal', 'file']
)
```

### 4. Verify and Commit

```bash
# Run full test suite
pytest tests/ -q

# Review all changes
git diff --stat

# Final commit if needed
git add -A && git commit -m "feat: complete [feature name] implementation"
```

## Task Granularity

**Each task = 2-5 minutes of focused work.**

**Too big:**
- "Implement user authentication system"

**Right size:**
- "Create User model with email and password fields"
- "Add password hashing function"
- "Create login endpoint"
- "Add JWT token generation"
- "Create registration endpoint"

## Red Flags — Never Do These

- Start implementation without a plan
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed critical/important issues
- Dispatch multiple implementation subagents for tasks that touch the same files
- Make subagent read the plan file (provide full text in context instead)
- Skip scene-setting context (subagent needs to understand where the task fits)
- Ignore subagent questions (answer before letting them proceed)
- Accept "close enough" on spec compliance
- Review only the task excerpt while ignoring governing schema/PRD/UI contracts
- Let passing tests freeze vocabulary that conflicts with the canonical contract
- Commit a partial production registry/artifact when the production contract requires an exact complete set; use an injected test fixture or candidate path instead
- Collapse partial review verdicts into a blanket PASS (selection is not implementation acceptance)
- Skip review loops (reviewer found issues → implementer fixes → review again)
- Let implementer self-review replace actual review (both are needed)
- **Start code quality review before spec compliance is PASS without using the explicit frozen-SHA parallel-review exception and fan-in barrier**
- Move to next task while either review has open issues
- Treat a lifecycle `completed` status as spec approval, quality approval, or evidence that required artifacts exist
- Assume a multi-child delegation batch provides immediate first-finisher scheduling; use separate single-task delegations or Kanban cards when per-child reaction matters
- Put long-running work, LLM calls, merge/deploy actions, or dependency promotion inside an observer hook
- Use cron polling as the primary continuation mechanism when a harness lifecycle event plus durable Kanban graph is available

## Handling Issues

### If Subagent Asks Questions

- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation

### If Reviewer Finds Issues

- Implementer subagent (or a new one) fixes them.
- Reviewer reviews again.
- Re-review only through Round 3; do not skip required exact-SHA review and do not dispatch Round 4.
- `REQUEST_CHANGES` remains blocking even when production behavior is already correct and the only gap is durable regression coverage. Add the missing tests, report honestly when they pass immediately against an existing fix, and rerun the reviewer that raised the gap.
- A test-only correction changes the commit SHA and can alter or weaken the asserted contract. Therefore rerun every required exact-SHA review kind against the final commit; no earlier commit-bound specification, quality, domain, or integration verdict transfers.

### If a Reviewer Times Out or Returns No Verdict

- A timeout, empty summary, or partial tool transcript is **not** PASS, FAIL, or approval. Keep the gate closed.
- Re-dispatch a narrower reviewer with the same immutable commit SHA and unresolved review dimensions.
- Remove likely blocking work such as network calls or full regeneration when canonical test evidence already exists; ask for an offline static review plus only the smallest focused command needed.
- Never infer approval from tests passing, elapsed time, or a reviewer having completed some tool calls.

### If an Implementer Times Out or Fails

Load `references/timeout-recovery-and-semantic-review.md` for the complete remote-first recovery, fresh-worktree identity, base-drift integration, and durable evidence procedure.

A timeout is a transport/orchestration outcome, not proof that the work failed. Before re-dispatching or deleting anything:

1. Determine where durable residue can exist. If the worker used an isolated context whose local worktree may be gone, inspect external side effects first in this order: remote feature ref, open/all-state PRs by head branch, recent commits on that ref, issue/PR comments, then any surviving local worktree. A timeout with a pushed RED/GREEN branch or draft PR is `interrupted_with_recoverable_artifact`, not implementation failure.
2. Recover the exact remote head into a fresh isolated worktree/branch. Verify local HEAD = remote ref = PR head, record the immutable base/merge-base, and require a clean status before reading or running anything. Do not restart from base or create a duplicate PR when a coherent checkpoint exists.
3. Freeze the shared/recovered worktree and inspect `git status`, recent `git log`, staged/unstaged diffs, PR body, and exact changed paths. Re-read every file previously inspected if any concurrent/late subagent reports that it modified those paths; async notification order is not file-state authority.
4. Re-read every changed file. Decide whether the residue is (a) a coherent bounded implementation, (b) generated/disposable churn, or (c) unsafe/incomplete work.
5. If coherent, recover rather than restart: run syntax checks, the smallest focused tests, then canonical verification; restore only known generated output; preserve the exact allowed source diff.
6. If the original RED evidence is unavailable, say so—never invent it. Existing implementation can still be accepted only with fresh executable verification and normal independent reviews. For any reviewer-raised correction, add a regression test first, capture real RED, make the smallest fix, and capture GREEN.
7. If incomplete or unsafe, dispatch a fresh fix subagent with the inspected diff and exact failure. Do not overlap writers on the same paths.
8. Stage exact allowed paths only, run staged/unstaged diff checks, and restart specification review from the full recovered slice. Quality review still waits for specification PASS.

Controller repair is an exception for a small, fully understood recovery after a worker is no longer active—not a shortcut around fresh implementers. Keep it bounded, test-first for new corrections, and independently reviewed.

Also avoid broad search-and-replace when frozen contracts contain similar phrases with different semantics (for example root, schedule, release, and media empty states). Patch each contract-bearing context explicitly and rerun focused copy tests.

## Efficiency Notes

**Why fresh subagent per task:**
- Prevents context pollution from accumulated state
- Each subagent gets clean, focused context
- No confusion from prior tasks' code or reasoning

**Why two-stage review:**
- Spec review catches under/over-building early
- Quality review ensures the implementation is well-built
- Catches issues before they compound across tasks

**Cost trade-off:**
- More subagent invocations (implementer + 2 reviewers per task)
- But catches issues early (cheaper than debugging compounded problems later)

## Integration with Other Skills

### With writing-plans

This skill EXECUTES plans created by the writing-plans skill:
1. User requirements → writing-plans → implementation plan
2. Implementation plan → subagent-driven-development → working code

### With test-driven-development

Implementer subagents should follow TDD:
1. Write failing test first
2. Implement minimal code
3. Verify test passes
4. Commit

Include TDD instructions in every implementer context.

### With requesting-code-review

The two-stage review process IS the code review. For final integration review, use the requesting-code-review skill's review dimensions.

### With systematic-debugging

If a subagent encounters bugs during implementation:
1. Follow systematic-debugging process
2. Find root cause before fixing
3. Write regression test
4. Resume implementation

## Example Workflow

```
[Read plan: docs/plans/auth-feature.md]
[Create todo list with 5 tasks]

--- Task 1: Create User model ---
[Dispatch implementer subagent]
  Implementer: "Should email be unique?"
  You: "Yes, email must be unique"
  Implementer: Implemented, 3/3 tests passing, committed.

[Dispatch spec reviewer]
  Spec reviewer: ✅ PASS — all requirements met

[Dispatch quality reviewer]
  Quality reviewer: ✅ APPROVED — clean code, good tests

[Mark Task 1 complete]

--- Task 2: Password hashing ---
[Dispatch implementer subagent]
  Implementer: No questions, implemented, 5/5 tests passing.

[Dispatch spec reviewer]
  Spec reviewer: ❌ Missing: password strength validation (spec says "min 8 chars")

[Implementer fixes]
  Implementer: Added validation, 7/7 tests passing.

[Dispatch spec reviewer again]
  Spec reviewer: ✅ PASS

[Dispatch quality reviewer]
  Quality reviewer: Important: Magic number 8, extract to constant
  Implementer: Extracted MIN_PASSWORD_LENGTH constant
  Quality reviewer: ✅ APPROVED

[Mark Task 2 complete]

... (continue for all tasks)

[After all tasks: dispatch final integration reviewer]
[Run full test suite: all passing]
[Done!]
```

## Remember

```
Fresh subagent per task
Two-stage review every time
Spec compliance FIRST
Code quality SECOND
Never skip reviews
Catch issues early
```

**Quality is not an accident. It's the result of systematic process.**

## Further reading (load when relevant)

When the orchestration involves significant context usage, long review loops, or complex validation checkpoints, load these references for the specific discipline:

- **`references/context-budget-discipline.md`** — Four-tier context degradation model (PEAK / GOOD / DEGRADING / POOR), read-depth rules that scale with context window size, and early warning signs of silent degradation. Load when a run will clearly consume significant context (multi-phase plans, many subagents, large artifacts).
- **`references/gates-taxonomy.md`** — The four canonical gate types (Pre-flight, Revision, Escalation, Abort) with behavior, recovery, and examples. Load when designing or reviewing any workflow that has validation checkpoints — use the vocabulary explicitly so each gate has defined entry, failure behavior, and resumption rules.
- **`references/generated-browser-runtime-verification.md`** — End-to-end checks for generated pages and browser modules. Load when a task spans rendered semantic markup, generated assets/data, SPA lifecycle, delegated actions, analytics, deployment path prefixes, or async session state; helper-only tests are supplemental, not acceptance evidence.
- **`references/timeout-recovery-and-semantic-review.md`** — Recover remote/local residue after a timed-out implementer, verify identity from the recovery worktree, integrate an advanced base before review, preserve honest TDD evidence, and re-enter immutable spec→quality gates safely.

The context-budget and gates references are adapted from gsd-build/get-shit-done (MIT © 2025 Lex Christopherson).
