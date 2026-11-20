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
- FR-007: `npm run eval -- [skill-folder-or-EVAL] --env-file <private-file>` or `--credential-home <private-Hermes-home>` uses Docker by default; without a package it selects the task-management workflow. Credential-home runs copy only the explicitly selected provider's API-key/OAuth entries and model selectors, never mount the host profile or import unrelated credentials, sessions or configuration. Reject nonprivate or symlink credential files and invalid provider selectors. Existing `test:eval` native behavior remains compatible. Generic skill evals may use the semantic judge alone; the goals/tasks workflow additionally requires its deterministic CLI verifier.
- FR-006: Explicit `test:eval -- <EVAL-path> --container --env-file <private-file>` (or `--credential-home <private-Hermes-home>`) runs a real model-backed Hermes agent and existing evaluator inside a disposable NED Docker container. The goals/tasks workflow then uses an independently captured verifier to query NED CLI state. Require a reachable Docker context, an immutable resolved image identity, private provider-only credentials and bounded execution. Publish no host ports, mount no host profiles/socket, and use only newly owned containers/volumes. Copy redacted reports outside the checkout; remove owned resources on success, error or interruption, report cleanup failures nonzero, and never prune unrelated Docker resources. Scrub selected original and refreshed runtime credential values before report export. Missing Docker/auth is infrastructure failure, never skill success. Model stubs prove harness wiring only.

### CUJ-003: Evaluate a real workflow in an isolated NED container
Actor: contributor explicitly opting into provider-backed evaluation. Critical because successful prose or mocked tool scripts do not establish persisted goals/tasks. Starting with a private provider credential file and Docker, select the task-management Docker EVAL, build or select the NED image, boot fresh owned volumes, ask Hermes to execute the fixture, then independently query CLI status/tree/item/history/delivery after the reply. Success requires both deterministic persisted-state verification and the existing semantic evaluator. Failed agent/verifier/provider or interrupted runs fail, preserve safe evidence and clean only owned resources. No real checkout work or deployment is part of the synthetic scenario.

### TC-004: Container eval execution, prerequisites and cleanup
- Journey / requirements: CUJ-003 / FR-004, FR-006, FR-007.
- Level / automation: integration; [tests/TC-004.test.js](tests/TC-004.test.js), generic evaluation-engine synthetic fixtures only.
- Preconditions / fixtures: temporary generic EVAL packages, private synthetic env files and injected Docker command boundary; no real provider/model.
- Given: an explicit eval package, output directory and Docker/context selection.
- When: invoke the container harness through success, failed agent/verifier, missing daemon, invalid credential permissions/fields, deadline and interruption boundaries.
- Then: real invocation uses normal NED image startup, no host ports/profile/socket mounts, exact selected package, agent before trusted verifier through the existing engine; return actual nonzero failure; collect redacted result evidence and remove only run-owned containers/volumes, including partial creation. Cleanup failure is observable.
- Steps and assertions: run `node --test docs/features/test-suites/tests/TC-004.test.js`; assert arguments, state transitions, exit/results and cleanup from the injected command boundary. Routing is owned by TC-001. These are engine tests, not skill behavioral acceptance.
- Variants / negative cases: hostile env keys, symlink/public credential files, selected-provider-only OAuth home copying with unchanged source, bare original/refreshed token redaction, provider override cannot inherit old endpoint, generic skill semantic evaluation without a deterministic verifier, output inside checkout, failed image/health/exec/copy/cleanup and signal; no global Docker context change or broad prune. Concurrent runs have unique resource names.
- Cleanup: all synthetic fixtures removed; no actual Docker/provider resources used.
- Pass evidence: named executable assertions, zero skips/cancellations; real skill acceptance requires TC-005 separately.

### TC-005: Hermes completes synthetic goals/tasks, independently read back via CLI
- Journey / requirements: CUJ-003 / FR-006; [task-management FR-019 / TC-014](../task-management/SPEC.md).
- Level / automation: manual; [workflow EVAL.yaml](../../../workflows/task-management/EVAL.yaml).
- Preconditions / fixtures: Linux Docker with adequate space, freshly built NED image or explicit resolved image ID, private authorized provider credential, [workflow fixture](../../../skills/task-management/evaldata/docker-workflow/scenario.md). No preseeded task records.
- Given: a new isolated Hermes profile/project/DB in a normal NED container.
- When: Hermes receives the natural-language scenario and uses the skill/CLI; after it returns the trusted verifier queries actual NED CLI status/tree/typed lists/get/history/delivery.
- Then: exactly one explicitly closed goal, two completed owned dependent tasks with acceptance evidence, one standalone approval-blocked task, correct counts and visible output. Mere assistant text, missing/duplicate work, premature completion or missing CLI evidence fails. Agent/judge/provider errors are not a pass.
- Steps and assertions: `npm run test:eval -- workflows/task-management/EVAL.yaml --container --context <context> --env-file /private/provider.env --output-root /outside/repo/results`; inspect real agent transcript, verifier CLI JSON, semantic result, resolved image and cleanup report.
- Variants / negative cases: invalid/missing credentials fail infrastructure; interrupted run cleans owned resources; a scripted model is explicitly not behavioral evidence. No host-profile state or live project work may change.
- Cleanup: harness removes its own container and all three volumes; retain only private redacted reports outside git.
- Pass evidence: actual model-backed Hermes run plus CLI-backed verifier, semantic result and resource cleanup, recorded separately from default code tests. Not established by YAML loading or engine tests.

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
| FR-006 | CUJ-003 | TC-004 harness boundaries; TC-005 real agent and CLI verification |
| FR-007 | CUJ-003 | TC-001 Docker-default routing; TC-004 credential selection, source preservation and report scrubbing; TC-005 real-provider run |

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
