# Feature: Test writing guidance

Status: implemented — automated test-writing guidance and behavioral acceptance verified
Related issues: none; requested in the project conversation.

## User outcome and scope

NED contributors and agents write runnable automated test code and remove redundant checks while preserving distinct material risks. The capability is an instruction-only skill at [SKILL.md](../../../skills/test-writing/SKILL.md), discoverable by Codex through `.agents/skills/test-writing`. Scope includes test implementation, assertions, fixtures, async/concurrency handling, cleanup, regression sensitivity, pruning and skill-evaluation guidance. Non-goals: generating tests for every function, executing live providers, or proving agent behavior with code assertions. Explicit user scope takes precedence over skill guidance.

## Requirements

- FR-001: Recommend tests by distinct observable failures and the smallest reliable layer; retain material regression coverage when pruning.
- FR-004: Produce runnable automated tests with independent expected results, precise public/state assertions, isolated fixtures, awaited operations and cleanup; demonstrate intended failure and restored passing execution when a bounded defect probe is appropriate.
- FR-002: Evaluate skills through realistic agent tasks and outcomes, without code-based skill tests or unexecuted pass claims.
- FR-003: Agents working on NED load relevant repository skills by default and read test-writing before test changes, using canonical skill files without copied instructions.

## Critical user journeys

### CUJ-001: Write and simplify tests

Actor: contributor agent. Critical because removing duplication must preserve data and security boundaries. Starting state: existing overlapping checks and incomplete persistence coverage; prerequisites: relevant contract and skill loaded. Actions: inspect coverage, select risks/layers, write runnable assertions and fixtures, run the cases, prove an intended regression failure, restore and rerun, and report checks and gaps. Success: maintained runnable coverage with distinct material behavior preserved. Recovery: retain a test if its unique risk cannot be transferred; report unavailable verification rather than silently skipping it.

### CUJ-002: Evaluate skills and discover guidance

Actor: contributor agent in a NED Codex session. Critical because code assertions cannot establish that skill instructions guide decisions. Starting state: skill change or test-writing request. Prerequisites: checkout, root AGENTS.md and skill folders available. Actions: select relevant skill, read it, evaluate synthetic recovery outcomes, report evidence separately. Success: skill guidance applied without all skills being loaded or prose checks presented as behavioral proof. Recovery: read canonical `skills/<name>/SKILL.md` directly if catalog discovery is unavailable; report missing skills or evaluation dependencies.

## Detailed test cases

### TC-001: Write automated tests and consolidate coverage

- Journey / requirements: CUJ-001 / FR-001, FR-004.
- Level / automation: manual; agent behavioral evaluation via [EVAL.yaml](../../../skills/test-writing/EVAL.yaml).
- Preconditions / fixtures: isolated agent session with SKILL.md and [scenarios A/B](../../../skills/test-writing/evaldata/scenarios.md); no credentials or provider resources exist; test-owned databases may be created outside the checkout.
- Given: duplicate package checks, an existing process version check, and a mocked concurrent-claim test.
- When: ask the agent to write and run A/B tests in a disposable workspace without changing the checkout.
- Then: write named manifest variants with every exclusion, exact errors and unchanged input; execute a bounded missing-rejection probe that fails by assertion, restore GREEN; execute independent real SQLite actors with exactly one winner, a documented conflict and durable owner/event readback.
- Steps and assertions: supply fixture; inspect generated code and execution logs against the evidence rubric. Require awaited operations, loser result, reopened DB owner/events, project isolation, test-owned cleanup, intended assertion failure and restored passing run.
- Variants / negative cases: adding a happy-path permutation without a distinct risk or replacing DB contention with mocks fails. Auth/provider failures are inapplicable to this instruction-only task. Actual crash/retry coverage is proposed only when promised by the target contract.
- Cleanup: remove only the evaluation workspace. No source/runtime changes or external effects permitted.
- Pass evidence: reviewed runnable artifacts and actual command results satisfying A/B rubric; YAML parsing alone is insufficient.

### TC-002: Skill evaluation and repository discovery

- Journey / requirements: CUJ-002 / FR-002, FR-003.
- Level / automation: manual; agent behavioral evaluation and fresh Codex session check.
- Preconditions / fixtures: checkout containing AGENTS.md and regular `.agents/skills` discovery files; synthetic scenario C; clean session without external credentials.
- Given: a wording-only skill edit and an interrupted job requiring ownership preservation.
- When: start a Codex task in the repo asking for a test strategy; confirm it reads the canonical test-writing skill; present scenario C. Repeat with catalog discovery unavailable and direct file access available.
- Then: the agent uses relevant NED guidance, proposes agent-outcome recovery evaluation, and rejects prose/version assertions and unexecuted pass claims. Direct file fallback works; no wholesale skill loading or external action occurs.
- Steps and assertions: record selected path/read evidence and response; apply scenario C rubric; inspect that discovery files link to canonical files. A missing path must be reported, not invented.
- Variants / negative cases: explicit user constraints retain authority; copied/stale instructions, unrelated skill invocation and code-based skill testing fail. Concurrent DB mutation, authentication and live provider cleanup are inapplicable because this case is read-only.
- Cleanup: discard temporary session artifacts; preserve checkout and all user data.
- Pass evidence: fresh-session read evidence and reviewed response; file existence alone does not prove default invocation.

## Coverage and acceptance

| Requirement | Journey | Cases | Verification |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001 | EVAL scenarios A/B and reviewed outputs |
| FR-004 | CUJ-001 | TC-001 | Generated tests, RED/GREEN logs and cleanup readback |
| FR-002 | CUJ-002 | TC-002 | EVAL scenario C and human rubric |
| FR-003 | CUJ-002 | TC-002 | Fresh Codex session plus direct-file fallback |

## Open questions and coverage gaps

TC-001 and TC-002 passed fresh-agent evaluation; see [reviewed acceptance evidence](ACCEPTANCE.md) for evaluated input hashes, actual checks and limitations. Automated runtime gates do not count as skill acceptance. No code-based skill tests are declared. The generated contention test does not force every possible lock interleaving; no universal scheduling or process-crash claim is made.
