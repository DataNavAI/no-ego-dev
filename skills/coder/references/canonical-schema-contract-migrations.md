# Canonical schema contract migrations with strict TDD

Use this pattern when an approved registry/model contract replaces an earlier ad hoc schema and backward compatibility is explicitly forbidden.

## Workflow

1. **Freeze the scope and baseline.** Record `git status --short --branch`. Identify the exact production and test files allowed to change. Do not modify registry data, renderers, generated output, or documentation unless included in scope.
2. **Extract the canonical vocabulary.** Build a small field map from the approved contract before editing. Separate:
   - canonical collection names;
   - canonical identity fields;
   - allowed enum/key values;
   - required timestamp and URL formats;
   - explicitly forbidden legacy aliases;
   - stable validation error codes and result shape.
3. **Write canonical tests first.** Cover the valid canonical object, then fail-closed cases for:
   - missing/wrong collection shape;
   - exact count mismatch;
   - duplicate and unknown identities;
   - rank/type/path drift;
   - malformed/null entries;
   - legacy aliases, including aliases added alongside otherwise-valid canonical fields;
   - invalid sources, status values, timestamps, dimensions, and local-path traversal.
4. **Capture RED.** Run the focused test file and confirm failures are caused by the old contract. If malformed data throws instead of returning validation errors, preserve that as an additional focused RED case.
5. **Implement the smallest canonical-only change.** Do not add fallback reads, normalization shims, or dual-write/dual-read compatibility when the task forbids it. Return the exact specified result shape even on invalid input.
6. **Capture GREEN.** Run the focused feature tests, then the full suite with fail-fast semantics.
7. **Clean generated artifacts deliberately.** If the full test command regenerates tracked output, inspect status first, restore only the known generated directory, and verify that only intended source/test paths remain. Do not use broad `git restore .` or `git clean` in a shared worktree.
8. **Commit exact paths.** Stage explicit files, run `git diff --cached --check`, print `git diff --cached --name-only`, then commit with the required message. Verify final status and SHA.

## Split bootstrap/public/analytics contract closure

When one milestone contains a truthful unavailable bootstrap, a future publishable release, and an approved analytics envelope, keep them as three distinct contracts rather than widening one schema:

1. Give bootstrap and publication separate schema files and assert that each valid fixture is rejected by the other schema. This prevents a build-time fallback payload from masquerading as publishable content.
2. Freeze ordered cohorts with exact-position constraints plus exact cardinality and uniqueness. A syntactically valid substituted ID, duplicate row, or reordered pair must reject.
3. For an externally approved analytics schema, copy the bytes without reformatting and test both byte equality and a pinned SHA-256 against the approved source.
4. If the repository uses a dependency-free validator, inventory every schema keyword actually used and audit the schema recursively before validating data. Unknown keywords must fail closed; silently ignoring `format`, conditionals, tuple arrays, uniqueness, or unsupported structure makes tests falsely green.
5. Exercise a test-only valid publication fixture through a systematic mutation table. Cover every nested object class and record nonzero category counts for missing, type, enum, bounds, additional-key, fake-identity, duplicate, and order mutations. Add semantic probes for canonical route derivation, evidence URL binding, valid calendar dates, claim/question relations, symbol keys, arrays with named properties, and accessor-backed values.
6. Run focused contract tests first. Then run the canonical suite to detect consumers still generating the old bootstrap shape against the new publication schema. If build/router changes are explicitly out of scope, preserve the focused GREEN and report the exact canonical-suite incompatibility; do not weaken the publication schema or edit forbidden build paths just to make the suite green. The follow-up integration task must choose the bootstrap schema for fallback generation and the publication schema only for reviewed release bytes.

## Design notes

- A validator should fail closed with stable machine-readable codes rather than throwing on malformed list entries.
- Exact identity validation usually needs both an immutable expected-ID map and a separate matched-ID set; deleting from one map during iteration can obscure duplicate and missing-ID diagnostics.
- Closed objects and arrays require `Reflect.ownKeys`; `Object.keys` misses symbols and non-enumerable additions. Read candidate values through own data descriptors so validation never invokes accessors.
- JSON Schema `if`/`then` branches, `$ref` siblings, `prefixItems` plus `items: false`, `uniqueItems`, and nullable `type` arrays need executable validator tests; partial support is more dangerous than an explicit unsupported-keyword failure.
- UTC instants must be parsed and round-tripped, not accepted by regex alone; calendar dates need real year/month/day validation so values such as February 30 reject.
- Provenance URLs should use exact HTTPS host/path patterns and semantic equality checks between the source receipt and every projected evidence link; parser-normalized host checks alone are too permissive.
- Local asset paths should reject raw and percent-decoded traversal, backslashes, queries, and fragments.
- Alias-rejection tests should prove that legacy fields cannot silently coexist with canonical fields; otherwise accidental dual-schema compatibility can return later.

## Evidence to report

Report the focused RED summary, focused GREEN summary, full-suite count, generated-output cleanup result, exact changed paths, commit SHA, and a concise compatibility warning naming the rejected legacy vocabulary.