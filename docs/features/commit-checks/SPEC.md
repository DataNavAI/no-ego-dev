# Feature: Local commit checks

Status: implemented
Related issues: none; requested in the project conversation.

## User outcome and scope

Contributors install a shared Git pre-commit hook that rejects commits when lint or tests fail. It verifies the full staged candidate using existing JavaScript/spec and Python suites. Supported local hosts are macOS/Linux with Git, Node 20.19+ or 22.13+ (ESLint development requirements), npm, and a Python environment containing pytest/PyYAML. Runtime-only installations do not install hooks automatically. Non-goals: preventing deliberate Git hook bypass, replacing CI or independent review, running live-provider QA, or automatically verifying manual skill acceptance. Manual cases still require separate evidence under AGENTS.md.

## Requirements

- FR-001: `npm run hooks:install` sets checkout-local core.hooksPath to .githooks, is repeatable, and rejects a different configured hook path without overwriting it. It must run from this repository's root, not configure a containing repository for an installed package.
- FR-002: A normal commit runs `npm run lint` followed by `npm run test:all`; test:all includes all automated spec cases and `python -m pytest`. Missing dependencies or any command failure block the commit without modifying the candidate. The hook clears repository-local Git environment variables for child checks so nested test repositories remain isolated.
- FR-003: Reject unstaged tracked changes and untracked non-ignored files before checks. After checks, reject modified worktree state or staged-tree drift. Never stash, reset, stage or discard user changes automatically.
- FR-004: Lint uses pinned ESLint recommended correctness rules plus the existing syntax checks; explicit credential-sanitization exceptions are narrow and explained. CI runs the same lint command; executable hook and installer are version controlled.

## Critical user journeys

### CUJ-001: Install and commit a passing candidate

Actor: contributor. Critical because a versioned hook is ineffective until locally installed. Starting state: Git checkout, complete staged candidate and dependencies. Actions: install hook, repeat installation, commit. Success: lint then full tests run and Git creates the commit. Recovery: an existing custom hook path is retained with actionable failure; install the NED checks deliberately rather than overwriting custom configuration.

### CUJ-002: Reject an unsafe or failing candidate

Actor: contributor. Critical to prevent false-green commits or damage to partial work. Starting state: staged changes, with failing checks, missing dependencies or mismatched worktree. Actions: attempt commit, observe specific failure, fix/stage intended contents and retry. Success: HEAD stays unchanged on rejection and user files/index are preserved. Tests modifying the candidate must be corrected before retry.

## Detailed test cases

### TC-001: Installation and successful Git commit

- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-004.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: tests/helpers.js creates a disposable Git checkout with a path containing spaces, copied production hook/scripts, synthetic author, staged README edit and deterministic fake npm/python executables. Real Git executes the commit; fakes isolate check orchestration from the separately exercised real suites.
- Given: no configured hook path and no partial changes.
- When: install twice and attempt a normal Git commit; separately configure an existing custom hooks path and retry installation.
- Then: installation is repeatable; success calls lint then test:all, child check Git variables are cleared, and HEAD advances. Custom hook installation fails without overwriting its path.
- Steps and assertions: inspect config, commit result, recorded command sequence and HEAD; assert the hook setup rejects a containing-repository package location.
- Variants / negative cases: spaced paths, repeated setup, existing custom configuration, package outside the repository root. Credentials/network/auth are inapplicable because the fixture is local and synthetic.
- Cleanup: remove only the test-created checkout; no user Git configuration is changed.
- Pass evidence: real Git exit codes and named assertions pass; actual repository lint/tests run separately before commits.

### TC-002: Failure, dependency and candidate-integrity guards

- Journey / requirements: CUJ-002 / FR-002, FR-003.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: same isolated Git fixture, baseline HEAD and staged README edit; fake command failure or mutation modes supplied only to synthetic executables.
- Given: lint/test/Python dependency failure, unstaged edit, untracked file, or a check changing a tracked file/index.
- When: attempt a real Git commit for each named variant.
- Then: commit is nonzero, HEAD unchanged and checks stop at the failing stage; partial user contents are not discarded. Post-check drift rejects even when commands return zero.
- Steps and assertions: compare initial/final HEAD and staged diff, verify call log for pre-check rejection and lint/test sequencing, and inspect preserved mutations.
- Variants / negative cases: missing pytest/PyYAML simulation, missing npm executable, tracked/ignored/untracked files, staged drift during checks. Concurrent user edits are represented by the deterministic check mutation. Signals/interrupted checks produce nonzero and cannot reach successful commit; no external idempotency or authentication applies.
- Cleanup: delete only the disposable fixture. No stashing, resetting or live resources.
- Pass evidence: all real-commit rejections and preservation assertions pass without skipped outer cases.

## Coverage and acceptance

| Requirement | Journey | Cases | Verification |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001 | Real hook setup and custom-path preservation |
| FR-002 | CUJ-001, CUJ-002 | TC-001, TC-002 | Real Git commits and deterministic child checks |
| FR-003 | CUJ-002 | TC-002 | Rejection and state readback |
| FR-004 | CUJ-001 | TC-001 | Versioned setup; canonical lint and CI review |

## Open questions and coverage gaps

Windows local hook execution is not verified. Git --no-verify or replacing local hook configuration can deliberately bypass hooks; CI remains necessary. Manual/live evaluations are separate and are never inferred from a green hook.
