# Fail-Closed Generated Gate Reports

Use this pattern when a generator emits a readiness, release, coverage, or quality-gate report from validated source records plus planned/generated artifacts.

## Contract

1. **Gate only the complete authoritative cohort.** Load the frozen/local cohort identity, require the exact expected count, and compare every stable identity field (for example QID, rank, type, and canonical path). A validation-shaped wrapper is not provenance by itself.
2. **Do not publish partial readiness.** Test-only or subset-fixture generation may continue for its intended purpose, but it must omit the production gate report. Partial inputs must fail with a stable validation/cohort code rather than returning partial readiness.
3. **Make the gate input provenance-bearing by construction.** Prefer one exact authoritative registry object over raw entity arrays or `{ ok, errors, entities }` validation envelopes. The gate should descriptor-check the exact registry shape, structurally clone it, call the canonical validator on that clone against the frozen cohort, require `ok` plus the exact count, and only then enforce exact entity own-data keys. Generator and tests must call the gate with the registry itself; an unmodified validation-shaped envelope must still be rejected because its booleans are forgeable. If backward compatibility truly requires recognizing a raw array, safely inspect count only to return the documented stable failure—never treat the array as validated provenance.
4. **Validate descriptor-safe exact shapes before reads.** Use `Reflect.ownKeys`, exact own enumerable data descriptors, standard/null prototypes as explicitly supported, and bounded dense arrays. Reject symbols, accessors, custom prototypes, sparse arrays, and extras without invoking getters. Structurally clone/isolate accepted records before computing. Normalize clone/validation failures at the public gate boundary to the documented stable validation code, and prove caller inputs remain unmodified.
5. **Separate claimed readiness from identity correctness.** Manifest identity and schema values must match authoritative entity facts or throw as malformed. Boolean fields such as `entityReady` and `schemaReady` may then truthfully produce blocked statuses; they must not make identity mismatches reportable as ordinary blockers.
6. **Bind generated artifact claims to entity-owned expectations.** For an OG asset, `exists/nonempty` is insufficient. Require the manifest path to equal the entity's exact declared OG path. Keep likeness/rights readiness independent so a wrong output path does not falsely invalidate an otherwise approved portrait or non-likeness receipt.
7. **Name aggregate dimensions explicitly.** Use names such as `readyRows`, `blockedRows`, `blockerCount`, `warningCount`, and `currentEmptyRows`; avoid ambiguous pairs like `blocked`/`blockers`. One row with two defects is `blockedRows: 1, blockerCount: 2`, while warning-only rows remain separate from blocker totals.
8. **Fix blocker order by subsystem and test the complete direct matrix.** Append distinct codes once in a documented order such as canonical route → alias → detail completeness → entity → source → schema → OG existence → OG identity/path → current warning → rights. Never derive order from object or set iteration. Build one test row that activates every direct branch together, then assert exact order, row statuses, blocked-row count, blocker-code count, and warning aggregates.
9. **Classify manifest QID failures deterministically.** Parse descriptor-safe rows and reject duplicates first. Then reject manifest QIDs absent from the authoritative entity map as unknown, and finally reject authoritative QIDs absent from the manifest as missing. This makes duplicate, unknown, and missing independently testable without relying on a generic count mismatch.
10. **Preflight before destructive output mutation.** Build and validate the complete manifest and report before `rmSync`/cleanup. Write the report only after successful generation, and only for the production-complete cohort.
11. **Preserve deterministic evidence.** Sort rows by frozen rank plus a stable tie-breaker, deep-freeze returned own-data graphs, avoid mutating inputs, emit `JSON.stringify(report, null, 2) + '\n'`, and compare bytes across two isolated runs.

## Consolidated Release Evidence

When one release decision aggregates cohort readiness, benchmark, interface/browser, and analytics evidence:

1. Keep the build-time entity gate separate; add one pure consolidated boundary with explicit `releaseId` and canonical injected `generatedAt`.
2. Treat declarative component IDs as claims, not artifact binding. Every underlying structured artifact must carry or prove candidate identity and freshness. At minimum, compare the gate artifact's fixed generation timestamp to the consolidated release timestamp; stale-but-otherwise-valid evidence must yield a stable blocker and never `READY`.
3. Centralize closed constants for supported interfaces, browser targets, and canonical analytics event names. Reject unknown, duplicate, sparse, accessor-backed, or partial rows before decision logic.
4. Require exact analytics persistence/forwarding parity for every canonical event. Release snapshots expose only candidate-bound event counts/statuses—never provider API keys, raw forwarding payloads, pseudonymous visitor IDs, persisted envelopes, or identity fields. Keep detailed payload inspection behind a separate low-level test sink that cannot be mistaken for durable release evidence.
5. Make browser evidence structured first: build and validate one candidate-bound object, atomically publish JSON, then render human-readable Markdown from that same object. Require every target to finish before either artifact is published.
6. Probe failures vertically with stale artifact time, stale component IDs, missing interface/target/event, failed gate/benchmark threshold, parity gaps, duplicates, and malformed rows. After any review correction, rerun focused and canonical verification and obtain a fresh review of the final staged tree.

## TDD Probe Matrix

Capture RED before implementation, then GREEN:

- valid-but-wrong OG path for an entity with an approved portrait;
- same OG mismatch for an entity relying on non-likeness OG rights;
- `ogReady: false` plus wrong path yields two ordered, nonduplicate blockers;
- `entityReady: false` and `schemaReady: false` yield their exact statuses/codes;
- manifest identity/schema mismatches still throw stable malformed-input codes;
- raw arrays, partial registries, and both partial and full-count validation-shaped envelopes are rejected—the latter proves that `{ ok: true }` is not provenance;
- removing a required entity field such as `aliasPaths` from an otherwise valid full registry fails with the stable public validation code even when the manifest still claims readiness;
- forged full-count rank/QID identity is rejected;
- duplicate, unknown, and missing manifest QIDs each produce their own stable error;
- registry, entity, manifest-row, manifest-array, and options shapes reject extra symbols, accessors, and custom prototypes without getter invocation;
- one direct blocker-matrix row proves every branch, exact subsystem order, statuses, blocked-row count, blocker count, and independent warning totals;
- accepted and rejected inputs remain unmodified;
- subset fixture generation succeeds but emits no production gate report;
- production generation emits exactly the authoritative cohort and is byte-identical across runs.

## Runtime Readiness Enforcement

When a generated gate report becomes a deployment readiness dependency rather than only a build artifact:

1. **Keep liveness independent.** Leave the lightweight process liveness route successful when the report is missing, malformed, blocked, or stale. Enforce the report on the product/deployment readiness endpoint instead.
2. **Fail before expensive downstream work.** Read and validate the generated data plus gate report before database scans, CMS reads, scrapers, or other costly health inventory. Return a small stable `503` body and do not leak parse errors, paths, row details, or blocker inventory.
3. **Use distinct stable outcomes.** Separate missing/unreadable or rejected-path input, malformed/schema-invalid input, structurally valid blocked input, and valid-but-stale input. Preserve unrelated health response fields, especially immutable deployment revision identity, on the ready path.
4. **Bind report and data to one build.** Require both `generatedAt` values to be canonical UTC instants and exactly equal. Do not compare filesystem mtimes or tolerate clock drift: generation is expected to emit both artifacts from the same injected build clock.
5. **Trust only a bounded known-version contract.** Before exposing readiness, require exact top-level, aggregate, and row keys; exact cohort size/type split; canonical identity/path/schema relationships; unique QIDs, ranks, and canonical paths; internally consistent blocked-row and blocker-code counts; and zero blockers for readiness. JSON parsing naturally prevents runtime accessors/custom prototypes, but still reject accessor-shaped substitutes, extras, duplicate identities, and oversized input.
6. **Keep test overrides narrower than production.** Production reads one fixed artifact path. A request-time test override is enabled only in test mode and accepts only an absolute canonical regular non-symlink file under the real OS temp directory with a strict byte limit. If extracting shared containment logic from another test override, retain every caller-specific restriction (for example, a required basename) so the refactor does not weaken the older boundary.
7. **Test the operational matrix.** Cover ready current output, missing file, malformed JSON, wrong schema/version, extras, duplicate identity, oversized input, blocked row plus matching aggregate counts, timestamp mismatch, symlink, outside-temp path, and JSON representations that attempt to substitute object shapes for arrays. For every unready case, also assert liveness remains healthy.
8. **Account for generated-artifact test setup.** If the report is intentionally generated and untracked, direct endpoint tests must run after the generator (or use a contained test fixture); the canonical package test/build command should remain the authoritative clean-checkout path. After verification, restore only the known generated tree and remove untracked generated output before checking exact task scope.
9. **Validate semantic cross-field invariants before aggregate reconciliation.** Exact keys, allowed enums, and individually valid numbers are insufficient when two fields encode the same fact. For count/status pairs, enforce the biconditional directly—for example, `(currentCount === 0) === (currentStatus === 'empty')`—and bound counts to the producer contract. Derive warning aggregates from the complete semantic predicate (`currentCount === 0 && currentStatus === 'empty'`), not from status alone. Normalize mismatches to the malformed-report readiness code rather than treating them as blockers or warnings.
10. **Make regression fixtures isolate the cross-field gap.** Test both directions independently: nonzero count with `empty`, and zero count with `ready`. Keep unrelated aggregate values internally consistent with the forged status where needed, so the pre-fix validator reaches `200` and the RED proves the missing row invariant rather than merely tripping aggregate reconciliation. Add a separate over-limit probe when the report contract caps the count. For every rejected readiness report, assert the stable small `503` body and independently healthy liveness route.

## Verification and Scope

Run the focused RED/GREEN probes, the full endpoint/site file, the full feature file, the bare canonical test command, and the bare build command. If canonical generation dirties a tracked generated tree, restore only that known-owned tree in a separate command. Finish by checking the exact allowed file count and a clean post-commit worktree.