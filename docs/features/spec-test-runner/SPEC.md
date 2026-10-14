# Feature: Spec test runner

Status: implemented — commit-gate integration for task-management completion
Related work: [#111](https://github.com/DataNavAI/no-ego-dev/issues/111); [project rules](../../../AGENTS.md).

## User outcome and scope

Contributors run all or selected feature test cases colocated with their SPEC.md. The runner discovers declarations, checks mappings and executes Node test files. It does not claim missing/manual cases passed, install dependencies, run live providers, or infer full coverage from an unrelated test. Explicit `- Level / automation: manual; ...` declarations are reported as NOT RUN and require separate evidence; manual-only selections return nonzero. Automated cases still require executable files.

## Requirements

- **FR-001:** Discover all `docs/features/<feature>/SPEC.md` declarations and corresponding `tests/TC-NNN.test.js` files. Reject duplicate/missing/undeclared automated mappings, missing specs, empty declarations, files without a named TC test, and automated files attached to manual cases. Explicit manual declarations do not require code files. Specs with an exact `Status: retired` line are excluded from active discovery and reported as retired NOT RUN; explicit retired feature selections reject rather than return success. Historical IDs may remain without runnable files.
- **FR-002:** Select all, feature, case, journey, or intersections of selectors. Case/journey selectors resolve from each case's Journey / requirements line. Reject unknown selectors, malformed arguments, contradictory --all plus filters, and empty selections. Paths are discovered, never built from untrusted command arguments.
- **FR-003:** Run each Node test file independently with argument-array spawning and require successful runtime execution of its named TC ID. An unrelated helper or another file cannot mask a missing, commented-out or conditionally unregistered case. Success requires every selected case and variant to execute and pass; any test failure, missing execution, skip, TODO, cancellation, signal or runner error fails the gate. Errors are nonzero and never silently downgrade coverage.
- **FR-004:** `npm test` runs regressions and the all-spec gate; `npm run test:spec -- --all` is the per-commit gate. Selection changes developer scope only, not the all-case commit requirement. Manual cases are listed as NOT RUN and never included in automated pass counts. Runtime test results are not committed.

## Critical user journeys

- **CUJ-001:** Contributor discovers and selects a feature/case/journey, sees exactly the requested cases, and gets actionable invalid-selection errors. Critical to rapid focused verification without losing traceability. TC-001.
- **CUJ-002:** Contributor runs the full commit gate and can commit only after complete execution, with missing or skipped cases rejected. Critical to prevent false passes. TC-002.

## Detailed test cases

### TC-001: Discovery and selector validation

- Journey / requirements: CUJ-001 / FR-001, FR-002.
- Level / automation: unit/integration in [TC-001.test.js](tests/TC-001.test.js).
- Given / preconditions / fixtures: disposable feature root containing two specs with matching synthetic named test files and journey mappings.
- When / steps: discover all; select by feature/case/journey and intersection; inject unknown/contradictory/missing selectors, duplicate IDs, missing SPEC.md/file, undeclared file and nameless test.
- Then / assertions: exact selected paths/IDs match; malformed inventory/arguments always reject before execution; no outside path is used.
- Variants: comma-separated/repeated selectors, empty match, path traversal input, zero-case specs, missing/undeclared mapping, nameless case, mixed/manual-only selection, and manual declarations with conflicting code files.
- Cleanup: remove only temporary fixture directories; no user DB/provider credentials involved.
- Pass evidence: all assertions pass with no skipped/cancelled variants. Live/manual cases are inapplicable.

### TC-002: Fail-closed execution and npm gate

- Journey / requirements: CUJ-002 / FR-003, FR-004.
- Level / automation: process integration in [TC-002.test.js](tests/TC-002.test.js).
- Given / preconditions / fixtures: temporary spec root whose single testcase is alternately passing, failing, skipped, TODO, or cancelled; installed Node runtime; package manifest accessible.
- When / steps: execute each gate in a separate process; inspect status, output and package scripts.
- Then / assertions: only fully passing execution returns 0; failure/skip/TODO/cancellation return nonzero; all npm tests include the spec gate; malformed selection returns nonzero. No partial execution is reported as pass.
- Variants: valid focused case versus all cases, child termination/error semantics; missing execution report, commented/conditionally unregistered case and wrong-case/helper masking reject; signals are nonzero.
- Cleanup: stop workers and delete temporary fixtures. No live provider resources are used.
- Pass evidence: process results plus all assertions pass; no skipped/cancelled outer tests. These fixtures intentionally test rejected inner skips; those rejections are assertions, not skipped feature cases.

## Coverage and acceptance

| Requirement | Journeys | Cases |
| --- | --- | --- |
| FR-001 | CUJ-001 | TC-001 |
| FR-002 | CUJ-001 | TC-001 |
| FR-003 | CUJ-002 | TC-002 |
| FR-004 | CUJ-002 | TC-002 |

Run `npm run test:spec -- --feature spec-test-runner` or `npm run test:spec -- --all`. Both cases are required, automated, and local. Success is exact selection and rejection of every false-pass fixture. No manual acceptance gate exists for this feature.

## Open questions and coverage gaps

Manual declarations are recognized and reported but are not executed; separate human/agent evaluation evidence remains required. The runner cannot prove a testcase's assertions fully express its prose contract; review must maintain that mapping. General Python spec cases are not automatically discovered: existing Python regression checks run separately as required by AGENTS.md. No such cases are declared in the current feature specs.
