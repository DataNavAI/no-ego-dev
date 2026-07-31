# Structured release reports and browser evidence

Use this pattern when readiness combines cohort/build, benchmark, interface, browser, and analytics evidence.

## One pure decision boundary

Keep entity/build-time gate construction separate from release aggregation. Use an internal pure evaluator, but do not expose its clock as a production caller parameter:

```js
// Production composition root pins the manifest digest before module initialization.
const verified = loadVerifiedReleaseCandidate(evidence);
const report = buildReleaseReport(verified); // exactly one argument; internal trusted clock

// Explicitly test-only module/seam.
const buildForTest = createReleaseReportBuilderForTest({ now: fixedClock });
const deterministicReport = buildForTest(verifiedTestCandidate);
```

The returned object should have an exact closed schema, be deeply frozen, and derive `READY`/`BLOCKED` plus stably ordered blocker codes. The production wrapper must derive evaluation time internally and reject extra arguments. Its evaluator may remain pure, but only trusted wrappers may provide the evaluation instant.

Capture trust decisions once at module/process initialization: production-vs-test mode, the externally supplied manifest digest, and every clock intrinsic used (`now`, parse, ISO serialization, numeric value). Checking mutable `process.env.NODE_ENV` at call time can activate a test verifier after production import. Capturing `Date` or `Date.now` alone is also insufficient because later `toISOString()` or `valueOf()` calls still resolve through mutable prototypes. Add regressions that import in production mode, then flip `NODE_ENV` and patch global/prototype clock methods; test seams must remain unavailable and production freshness must remain current.

Treat generated time as evidence data, not provenance. A check such as `gateReport.generatedAt === candidate.generatedAt` is bypassable when a caller supplies the same stale timestamp on both sides. Require every candidate/benchmark/interface/browser/analytics component timestamp to equal candidate `generatedAt`, then compare that generation against the trusted `evaluatedAt` with a bounded maximum age and future-skew policy. Probe the **paired-stale case** explicitly: set every component and report generation timestamp to an old instant while keeping the trusted evaluation clock current, and require a deterministic non-`READY` result.

Repeated release labels or caller-recomputed hashes do not prove provenance. Canonical-hash each closed-schema component artifact; store those digests in an exact candidate manifest; canonical-hash the manifest itself; and pin that manifest digest outside supplied evidence before module/process initialization. Verify all component digests and the external manifest trust anchor before creating an opaque/unforgeable in-process candidate handle. Include the trusted manifest digest in the final report. Mutating an artifact with the old manifest must fail component verification; mutating it and recomputing the manifest must still fail the external trust anchor.

### Canonical artifact serializer probes

Treat the canonical serializer as part of the security boundary, not as formatting code. Before hashing, copy only JSON-like own enumerable data properties into isolated standard containers without invoking accessors. Require exact standard arrays (no holes, extra keys, symbols, or custom prototypes), accept only supported plain/null-prototype records, reject cycles and depth/node overflows, and reject `undefined`, functions, symbols, bigint, non-finite numbers, Dates, and other non-JSON objects. Define dangerous keys such as `__proto__` as own data properties rather than assigning through legacy setters.

Run a bounded adversarial probe that proves:

- semantically equal records with different insertion order hash identically;
- `-0` and JSON-equivalent numeric forms canonicalize consistently;
- accessors are rejected with zero getter invocations;
- sparse arrays, cycles, custom prototypes, unsupported objects, and non-JSON primitives fail closed;
- null-prototype records and own `__proto__` data are handled safely;
- verification hashes an isolated clone, then stores only the deeply frozen clone behind an opaque branded handle, so post-verification caller mutation cannot change evaluation.

Do not rely only on happy-path manifest tests: a serializer can be deterministic for ordinary fixture objects while still invoking hostile descriptors or accepting ambiguous structures.

## Evidence dimensions

Typical sections:

- exact cohort/build gate totals and zero blockers;
- benchmark total/product row counts, thresholds, and committed input hashes;
- exact supported-interface membership;
- exact browser target membership and PASS status;
- exact canonical analytics-event membership with persisted/forwarded parity and count one.

### Exact-cohort semantic closure

Counts, uniqueness, identifier regexes, and valid route shapes are only structural checks. A report with 50 unique, plausible but wrong entities can still pass them. Bind the gate to the authoritative cohort by hashing a canonical ordered tuple stream such as `rank\0stableId\0entityType\0canonicalPath`, with rows ordered by the closed rank set and joined with an unambiguous delimiter. Keep the reviewed digest beside the validator with a comment defining the canonicalization. Add a regression that replaces one stable ID with a syntactically valid non-cohort ID while preserving all totals and statuses; it must never produce readiness. Apply the same test to rank, type, and canonical path when those fields are release-critical.

Define target and event taxonomies once in a shared module and import them in server, browser writer, and tests. Do not maintain copied arrays in each surface.

## Analytics capture seam

A safe test seam should:

- be unavailable outside test mode;
- have a single owner so concurrent captures cannot silently overwrite each other;
- consume the existing canonical validation/persistence/forwarding path rather than defining another event schema;
- return an immutable snapshot;
- expose an idempotent `dispose()` that releases ownership;
- summarize exact event counts for release evidence without inventing client events that were not observed;
- reduce to allowlisted event counters inside the observation callback, using own data properties and ignoring unknown names;
- never clone or retain complete persisted records, provider payloads, API keys, distinct IDs, pseudonymous visitor IDs, free-form properties, or request envelopes just to count events later;
- clear even the reduced counter state during `dispose()`.

A sanitized `snapshot()` is not enough to prove confidentiality: private objects can still remain in closure-owned arrays after snapshot and disposal. Add a regression that instruments the seam's clone/copy boundary while exercising a real canonical event and asserts sensitive field names/values were never copied into seam-owned state. Keep a separate, explicitly low-level test sink when detailed persistence/provider assertions are genuinely needed.

## Evidence privacy and post-sanitation binding

Browser traces and result files commonly embed the executor's absolute checkout/home path even when screenshots and Markdown appear clean. Treat path privacy as a binary-artifact property:

1. Scan report text, JSON, logs, and every archive member for machine-local path prefixes before staging.
2. If traces must be retained, rewrite or regenerate them through a deterministic sanitizer; do not assume ZIP filenames reveal internal strings.
3. Recompute trace hashes in structured evidence, regenerate checksum manifests, and restage the rewritten bytes.
4. Scan both the working tree and staged Git blobs. Extract each staged trace/archive and scan its members, because the index may still contain pre-sanitation bytes.
5. Freeze a new staged tree and repeat evidence-integrity review. Earlier verdicts bind the old tree and cannot approve rewritten evidence.

Never accept a sanitizer's item count as verification. Require zero forbidden-path matches plus checksum/manifest agreement over the exact staged bytes.

Prefer prevention over post-processing for candidate-bound browser evidence. Add a detached worktree at the exact source SHA under a non-user-specific temporary root, install the locked test dependencies there, and generate screenshots/traces from that checkout. This keeps test-source paths in trace stacks candidate-bound without embedding a personal home directory and leaves the shared source checkout stable while reviewers work. Record the exact SHA before generation, scan every trace member anyway, and copy only the complete verified bundle plus durable reports into the project workspace. Do not copy the temporary worktree, package cache, or runner script. If browser tooling is intentionally absent from the product lockfile, install the exact evidence-runner version only inside that disposable worktree without modifying candidate source, and record that distinction in the report.

Avoid putting the literal forbidden path prefix in the durable report merely to say it was absent; a naive integrity scanner will correctly flag the bytes even though they are explanatory prose. Report the rule as “no machine-local home paths” and keep the exact forbidden-prefix list in the private verification command or reviewer instructions.

## Execution receipts and candidate-bound CUJ files

Capture the browser command's stdout, stderr, and exit code from the **same first successful publication run**. An immutable evidence writer should reject a second run for the same candidate because its destination already exists; that expected collision makes the second command a failed receipt even when the first run's bundle is valid. Never rerun into an occupied canonical destination merely to create a log and then summarize the test-body counters as a clean command pass. If the successful run was not recorded, use a fresh detached exact-SHA worktree/output root with no candidate destination, capture that single invocation directly, and verify both the test summary and all file-level hooks/teardown lines before publication.

Keep binary evidence and its command receipt in one closure:

1. Generate the bundle once in a clean root while redirecting the same invocation to the durable log.
2. Require process exit zero plus explicit test totals (`pass N`, `fail 0`) and absence of later hook/teardown failures.
3. Normalize forbidden executor paths in both trace members and the command log without changing semantic status lines.
4. Recompute every affected trace digest and representative/checksum manifest.
5. Recursively scan the revised archive members and normal files, then freeze a new tree for review.

Candidate-bound CUJ receipts must be intrinsically fresh, not merely stored under a candidate-named directory. Each machine-readable interface result should carry the exact release digest, source SHA, candidate generation/deployment timestamp, fresh verification timestamp, deployed base URL, interface class, and one result row per authoritative cohort entity. A pre-candidate static fixture may remain as a named `sourceContract` with its original timestamp, but do not relabel it as fresh runtime evidence. Run deployed HTTP checks separately, record their actual URL/status/identity/canonical/structured-data/action assertions, and keep `browserEvidence: false` unless a browser truly produced that file; link the separate browser matrix for responsive and interaction proof.

## Browser evidence publication

- Build machine-readable JSON from completed target results first.
- Treat screenshots and trace archives as authoritative binary artifacts, not merely paths. Compute each source file's SHA-256, include both digests in that target's closed-schema JSON row, and let the candidate manifest hash the structured browser artifact containing those rows.
- After copying into the private bundle, rehash destination bytes and require equality before publication. This proves the JSON/manifest binds the actual published binaries rather than only the pre-copy source paths.
- Validate exact registry membership, interface mapping, release ID, generated time, PASS rows, and closed lowercase digest syntax before publication.
- Build the complete publication in a private/versioned staging directory while holding the candidate lock: JSON, Markdown, screenshots, traces, and a manifest that links them.
- Do not expose final screenshot/trace directories before the reports that reference them are ready.
- A sequence of independent renames is **not** an atomic multi-artifact commit. A failure after the first rename can publish new JSON beside stale Markdown and orphaned media. Build one complete same-filesystem hidden bundle containing JSON, Markdown, screenshots, and traces, then expose it through one atomic visibility boundary.
- Do not assume a normal directory rename is no-replace: on some platforms it can replace an empty destination that appears after the initial existence check. When the candidate name must be immutable, use a no-replace primitive at the visibility boundary—for example, create an exclusive relative symlink/pointer from the stable candidate path to the complete hidden bundle, or use a platform-supported no-replace rename. Use `lstat`-style checks so dangling links count as occupied destinations.
- The final candidate name is immutable: if it already exists, fail closed rather than overwriting or merging it. Hidden completed bundles are not authoritative until the stable pointer exists; remove them if pointer publication fails.
- Add deterministic interruption probes for preparation and visibility commit: throw during staging after at least one file was written, throw while creating the final pointer, and create an empty final destination *during* preparation. Each probe must clean private staging/bundle state, expose no partial candidate, and preserve any independently created destination untouched.
- Clean stale locks safely according to a documented ownership/lease policy; never silently steal a live lock.
- Render Markdown from the same structured target rows; presentation-only details may be joined by target ID.
- Publish nothing when the run is incomplete.
- Preserve truthful browser labels (installed branded browser vs engine equivalent).
- For a disposable verification run, inspect the emitted JSON and then remove its stable pointer, hidden bundle, JSON, Markdown, screenshots, and traces.

## Packaged runtime dependency closure

When release-report or server code imports a new local module, update every production packaging boundary that copies files explicitly. Add a regression for the declared dependency, but do not stop at matching Dockerfile text: build the real image or bundle, start it with safe local configuration, and call its liveness endpoint. A successful source test/build does not prove the runtime artifact contains transitive local imports. For a production image that should fail closed on absent secrets, preserve the first startup refusal as positive configuration-boundary evidence; then run a second isolated probe with clearly synthetic, local-only values that satisfy shape/length validation and exercise liveness plus semantic routes. Never reuse production secrets merely to make a local artifact boot. Remove temporary containers and images after the probe, and distinguish package-manager audit warnings from startup failures.

## Canonical verification order

1. focused release/analytics/entity tests;
2. focused browser-writer test;
3. complete feature and integration suites;
4. canonical project test command (including its required generation/setup phase);
5. full browser matrix;
6. canonical build;
7. restore generated tracked output and delete disposable evidence;
8. `git diff --check`, exact-scope staging, independent pre-commit review.

Avoid running an integration test file standalone when the canonical command intentionally generates fixtures or public output first; either run the documented setup phase or use the canonical command so failures are attributable to the candidate rather than missing prerequisites. Likewise, when test-only eligibility is intentionally captured at module initialization, launch focused tests with the repository's declared test environment already set (for example, through its package script or `NODE_ENV=test command`). Setting or flipping the mode after import must remain ineffective by design; a direct focused command that omitted the declared launch environment is not evidence of a candidate regression.
