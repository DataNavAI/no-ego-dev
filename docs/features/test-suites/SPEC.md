# Feature: Contributor test suites

Status: implemented
Related issues: [#170](https://github.com/DataNavAI/no-ego-dev/issues/170).

## User outcome and scope

Contributors need one reliable default command and four meaningful verification
buckets. Small means in-process logic/controller checks with synthetic boundaries;
reading immutable fixtures is permitted, but real sockets, databases, child
processes and mutable filesystem fixtures belong in medium. Medium means isolated
local integration, including Chromium, Python evaluation-engine regression tests,
and the real pinned Hermes API adapter/AIAgent with aimock model responses.
Mixed files conservatively remain medium rather than splitting assertions merely
to improve the pyramid. New CLI/spec files default to medium; reviewed small files
are listed in `scripts/test-suites.mjs`.

Large means explicit deployment/system acceptance: a staging browser smoke or the
existing disposable native Docker acceptance. Eval means actual skill/workflow
behavior through EVAL.yaml and a model-backed agent/judge. Evaluation-engine unit
and lifecycle tests are code tests, not behavioral evals. No tests are moved or
deleted; existing feature IDs, focused commands and manual procedures remain.
Non-goals: certifying model intelligence with mocks, running paid evals on a
normal commit, deploying staging, or claiming a read-only smoke proves a full
live-model conversation. Windows contributors use WSL/Linux for the full default
suite; existing targeted Windows checks remain supported.

## Requirements

- FR-001: `npm test` executes small then medium, failing on the first failed command. `test:all` is a compatibility alias for the same safe local gate, not a claim that staging/evals ran. Every existing automated CLI/spec file belongs to exactly one local bucket; unlisted files default to medium. Each selected spec file must retain the existing named-case/no-skip execution gate.
- FR-002: Medium includes `python -m pytest` and automatically provisions/exercises/tears down real Hermes with aimock exactly once. Missing Python/pytest/PyYAML/uv fails, not skips. Default Hermes cache is temporary-directory based outside the checkout; an absolute external cache override is supported. `test:core` selects only Core spec cases and real Hermes, without duplicating other CLI/Python cases. Existing direct commands remain available.
- FR-003: Large/eval are never implicit in npm test or the pre-commit gate. Large requires `--url` with an explicit HTTPS NED staging host, or `--container`. Production, credentials in URLs and cross-origin auth redirects are rejected. The staging browser smoke requires a served composer and live NED backend health, blocks non-GET/HEAD and cross-origin requests, never sends a message, and closes its browser. Optional authorization is read only from a private file, not logged. Container acceptance retains its existing ownership/cleanup behavior.
- FR-004: Eval requires an explicit skill/EVAL path, forwards existing eval-runner arguments, produces reports outside the checkout by default and preserves the runner's failure statuses as a nonzero suite result. It may use real providers only through explicit opt-in execution; a code test of the evaluation engine is never represented as skill acceptance.
- FR-005: The standard Linux/macOS CI npm-test jobs run the same default gate, with Python, uv and Chromium dependencies installed. Do not retain a duplicate Hermes workflow or a duplicate Python invocation. Documentation identifies setup, aliases, classification, exclusions and actual staging/eval coverage gaps.

## Critical user journeys

### CUJ-001: Verify a checkout or Core change locally

Actor: contributor, first and repeat use. Critical because an omitted integration
suite leaves genuine Hermes incompatibilities undetected. Given npm/Python/uv and
Chromium setup, run npm test (or test:core), observe ordered checks and status.
Success means small/medium checks passed including actual Hermes; failed/missing
dependencies return nonzero. Fix setup or the failure, rerun; no host profile is
reused. Interrupted subprocesses use the existing bounded process cleanup.

### CUJ-002: Choose external acceptance without accidental provider effects

Actor: contributor/operator. Critical because staging and model-backed evaluation
need explicit environment/access and may incur cost. Choose large plus a staging
URL/container, or eval plus a package. Success is scoped acceptance/report, not
inferred from npm test. Missing target/access is a failure, not a skip; repair
credentials privately or use existing manual acceptance procedures. No implicit
production target, deployment, messages or all-skills paid evaluation.

## Detailed test cases

### TC-001: Bucket routing and safe opt-in contracts

- Journey / requirements: CUJ-001, CUJ-002 / FR-001, FR-002, FR-003, FR-004.
- Level / automation: unit; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: pure suite plan, synthetic environment/cache paths; no persisted state.
- Given: each bucket and optional Core/staging/container/eval selection.
- When: build plans and inject unknown buckets, invalid arguments, relative cache paths and unsafe staging URLs.
- Then: exact ordered commands are selected, Core excludes unrelated files/Python, Hermes occurs once in medium, no external acceptance is selected by a local bucket, invalid plans throw before execution.
- Steps and assertions: inspect plan commands/arguments/environment, safe URL prefix normalization, explicit eval argument forwarding and immutable caller input. Assert missing eval/large target, production/non-HTTPS/credential/query targets fail; no external calls occur.
- Variants / negative cases: warm/custom cache path and cold default path; new unlisted test conservatively medium; all invalid selectors. Concurrency/persistence/auth access are inapplicable to pure planning.
- Cleanup: no resources allocated.
- Pass evidence: named unit assertions with zero skips/cancellations/TODOs.

### TC-002: Complete local partition and fail-closed entrypoints

- Journey / requirements: CUJ-001, CUJ-002 / FR-001, FR-002, FR-004, FR-005.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: actual feature inventory and package commands, Node subprocesses; no persisted user state.
- Given: all active automated specs and existing CLI files.
- When: discover unfiltered and small/medium selections; invoke opt-in commands without required targets.
- Then: union is exactly the previous inventory, intersection empty; explicit small entries exist; default npm aliases reach both buckets; invalid large/eval commands fail nonzero without starting a provider. Existing spec runner TC-002 owns failed/skipped/cancelled child rejection and commit-checks cases own hook failure propagation.
- Steps and assertions: compare file sets and count, spawn runner without a target and assert actionable failure/no PASS; inspect public package command graph and actual suite plan, not workflow prose.
- Variants / negative cases: large missing target, eval missing package, unknown bucket; preserve existing cases rather than selectively skipping. Full default, lint, Python, real Hermes and CI are executed separately as acceptance.
- External-volume acceptance: run the full default suite with TMPDIR on a different mounted volume. The existing installer fixture relocates both hardlink lock paths together, preserving its production-lock semantics without cross-device fixture failures; its clean-install and concurrent-lock cases own the assertions.
- Browser acceptance: the owned Playwright launchers use full Chromium's headless mode (`channel: 'chromium'`), consistently locally and in CI. Existing chat/secret cases retain clicks, geometry, screenshots and all variants; no force-click or timeout relaxation masks compositor failures. A bounded host diagnostic showed no animation frame from the legacy shell but a frame from full Chromium; rerun full TC-037 and secret TC-003 to verify the same assertions after the launcher correction.
- Cleanup: wait for spawned validation processes; no live targets involved.
- Pass evidence: assertions plus full default suite/CI log and unchanged coverage partition.

### TC-003: Staging smoke detects deployed-surface failures

- Journey / requirements: CUJ-002 / FR-003.
- Level / automation: integration; [TC-003.test.js](tests/TC-003.test.js).
- Preconditions / fixtures: actual headless Chromium, synthetic HTTPS responses fulfilled at Playwright's network boundary; no staging credentials or history.
- Given: served shell with composer and health response.
- When: exercise the smoke's real page-navigation/DOM/fetch checks.
- Then: healthy surface passes; HTTP auth failure or invalid backend health rejects. These fixtures verify the smoke harness only, never claim staging is healthy.
- Steps and assertions: create real browser/page, fulfill explicit test URLs with HTML/JSON, run checker, compare status and named failure; close browser after every variant.
- Variants / negative cases: HTTP401 and healthy HTTP200 with wrong backend identity; no model calls or mutation requests are issued. Full conversation/authentication workflow acceptance remains in the owning feature's manual cases.
- Cleanup: close browser/context, no screenshots/history/credentials retained.
- Pass evidence: real Chromium assertions without skipped cases; live staging/eval results, when requested, reported separately and never inferred from these fixtures.

## Coverage and acceptance

| Requirement | Journey | Cases / evidence |
| --- | --- | --- |
| FR-001 | CUJ-001 | TC-001, TC-002; existing spec-runner and commit-check cases; default npm test |
| FR-002 | CUJ-001 | TC-001, TC-002; Core TC-007 actual six-case Hermes acceptance inside medium |
| FR-003 | CUJ-002 | TC-001, TC-002, TC-003; container feature owns native Docker acceptance |
| FR-004 | CUJ-002 | TC-001, TC-002; Python evaluation-engine suite owns actual runner/report lifecycle |
| FR-005 | CUJ-001 | TC-002, full default Linux/macOS CI and documented command matrix |

## Open questions and coverage gaps

Large staging currently provides only a read-only shell/composer/backend smoke;
it is not full live-model chat, OAuth or cross-service end-to-end certification.
Existing manual deployment/browser/provider cases stay separate and NOT RUN unless
executed with their required authorization. Behavioral evals need a selected
package/provider and are not run merely to change suite routing. A small minority
of existing files are purely in-process; mixed files remain medium. Local browser
tests with synthetic remote dependencies are medium even if historically named
e2e. Existing optional Python platform-dependent skips remain visible, never
count as behavioral acceptance. The pinned Hermes suite is POSIX-only.
