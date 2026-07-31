# Reviewed test-only data fixtures

Use this pattern when one reviewed entity/record is ready to exercise a model or renderer but the production registry requires a complete cohort. The goal is to preserve real source and rights evidence without accidentally publishing a partial registry.

## Boundary

- Put the artifact only under `tests/fixtures/<domain>/`; do not create the production registry path.
- Copy the approved nested schema object, not review-envelope metadata such as `status`, reviewer notes, or candidate-only fields.
- Keep the fixture canonical: use current schema keys, remove legacy field aliases, and avoid speculative values or placeholders.
- If the production validator requires an exact cohort, validate the fixture against the matching one-row frozen cohort slice. Add a separate negative assertion that the production registry path is absent.
- Do not modify generators, runtime data, or tracked generated output for a fixture-only task.

## RED → GREEN workflow

1. Add the fixture consumer test first and run it while the fixture is absent.
2. Confirm RED is the expected missing-fixture failure, not an import or syntax error.
3. Add the smallest reviewed fixture needed for the assertions.
4. Run the fixture test, then the related feature tests, then the canonical full suite.
5. If the full suite regenerates tracked output, restore only the explicitly known generated directory and verify status before staging.
6. Stage and commit only the fixture and its dedicated test.

## Assertions worth preserving

### Canonical identity

Assert exact stable identity fields against frozen inputs: external ID/QID, rank, entity type, slug, canonical path, names, and disambiguation. Assert legacy keys and candidate-only coverage metadata are absent.

### Claims and provenance

- Assert the exact approved claim-key/value projection rather than merely checking that one claim exists or duplicating a key-only assertion already implied by that projection.
- Run each claim through the production publication predicate.
- Assert exact source URLs/types for important claims and biographies; remove weaker HTTPS/count checks when an exact receipt assertion already proves them.
- Reject unsupported, private, invasive, or speculative claim keys explicitly.
- Require full UTC instants where the schema expects review timestamps. For reviewed fixtures, validate and pin registry `generatedAt`, registry `checkedAt`, and entity `checkedAt` to the approved review instant where the review record establishes one; do not rely on tautological equality alone.

### Partial-fixture production boundary and handoff

- Validate the fixture positively against its matching frozen one-row cohort slice.
- Also call the validator with its default/full production cohort and directly assert the stable `cohort_count_mismatch` receipt, including expected and actual counts. Checking only that `ok === false` is too weak.
- Keep the production-registry absence assertion immediately beside a temporary-gate comment naming the later task that must replace/remove it.
- Update that later task's implementation plan in the same change: include the fixture test in its file list and explicitly require replacing the absence gate with exact-cohort production coverage assertions. This prevents a temporary safety gate from silently becoming a blocker when the production registry is intentionally created.

### Relationships and official links

Assert relationship target identity, status, nullable dates, checked timestamp, and exact source receipt. For official links, assert direct canonical HTTPS URLs, source properties, and checked timestamps rather than allowing search/result URLs.

### Image rights and local assets

Run the image through the production rights predicate and assert the complete receipt: local path, dimensions, Commons/source description URL, creator credit, license name/URL, explicit approval status/time, and takedown path. Also map the public fixture path to the repository source asset convention and assert the local source file exists.

## Later test-only generator integration

When a later task intentionally exercises the reviewed fixture through a static generator while production still must not activate a partial registry, add a narrow opt-in seam rather than changing ordinary generation:

1. Require both an explicit fixture-path variable and a test-process gate (for example, `NODE_ENV=test`). With either absent, ignore the seam completely and preserve ordinary output keys, routes, and page rendering.
2. Resolve, realpath, read, parse, and validate the fixture **before** any recursive output deletion. Require an absolute canonical regular-file path contained by realpath under the repository's intended test-fixture root; reject symlinks and path escapes. Add destructive-order regressions with a sentinel already present in the output directory: malformed JSON, unknown cohort identity, validation failure, symlink, and path escape must all fail while leaving the sentinel untouched.
3. Extract only the fixture entity IDs, select exactly those rows from the frozen cohort, and run the unchanged production registry validator against that subset. Abort before output on any error; never partially activate a malformed registry.
4. Keep catalog projection pure and deterministic. Return new arrays, preserve broad-catalog order and legacy fields, merge compatible records by canonical slug, append standalone reviewed entities, and expose one projected record per fixture entity without mutating either input.
5. Route only the injected entity's canonical page through the new renderer. Preserve legacy aliases and all unrelated routes on the legacy renderer unless the task explicitly migrates them.
6. Add the new registry-derived collection to generated JSON only while the seam is active. Assert existing broad keys remain own array properties with meaningful baseline counts so a one-record fixture cannot collapse the catalog unnoticed.
7. In the integration test, use an isolated temporary output directory plus a fixed generation timestamp. Assert semantic identity, canonical URL, follow key, truthful empty/current state, no placeholder or group-leakage copy in the relevant section, unrelated-route legacy rendering, and legacy-alias existence.
8. Run the focused integration, related generator/site tests, and the canonical full suite. If ordinary verification rewrites tracked generated output, restore only the known generated tree and confirm the final diff contains source/tests only.

Keep the pure projection test when the generator integration cannot independently prove standalone-record support, input immutability, and preservation of legacy fields.

## Promoting a complete reviewed cohort into a broad legacy catalog

When the production registry is complete and must be projected into legacy `groups`/`idols`, add one acceptance test against the real frozen registry and the exact pre-projection catalog transformation used by the generator. Synthetic size-only tests are insufficient: they miss canonical-name drift, destination-type mistakes, and real standalone entities.

1. Reconstruct the generator's pre-projection catalog faithfully, including slug normalization, duplicate-member slug qualification, flat idol metadata, and any source-backed photo overlays that affect record preservation assertions. Pin the observed baseline counts and require unique pre-projection idol slugs.
2. Assert the registry's exact group/individual split, then project through the production model. Index projected groups and idols separately by slug.
3. For every registry entity, assert the destination collection implied by canonical entity type, exact `qid`, `canonicalPath`, legacy `type` (`group` or `idol`), and canonical display `name`. Existing legacy records may keep broad metadata, but canonical identity metadata must win consistently on both merge and append paths.
4. Assert exact final `groups`, `idols`, and `passports` counts—not only `>=` checks—and require global slug uniqueness across both legacy collections. Include a named standalone-individual regression to prove it cannot leak into groups.
5. Assert every non-cohort legacy record survives byte-for-structure. For cohort records, preserve existing broad metadata such as group links, photos, roles, and facts; do not derive or copy reviewed biography/claims into legacy facts. Newly appended records should contain only the minimal legacy identity projection unless another contract explicitly requires more.
6. Assert the returned passport collection deeply equals the complete registry entity list and that neither input graph was mutated.
7. Drive the change with a true RED on the real data. A useful RED is canonical metadata disagreement on an existing record (for example, legacy casing versus reviewed display name), not a synthetic import or fixture failure.
8. Run the focused acceptance test, the whole feature file, the registry/reference tests, and the canonical package suite. If generation dirties tracked output, restore only the known generated tree, verify the diff is limited to the authorized source/test paths, then commit.

### Fail-closed slug ownership and canonical routes

Treat legacy slug ownership as a preflight contract, not something to discover opportunistically while merging registry entities:

1. Structurally clone the legacy group/idol arrays first, then inspect slug fields through own data descriptors. Every record must own a valid canonical slug; accessors, inherited values, malformed slugs, sparse arrays, and hostile nested data fail closed without invoking getters.
2. Build one global slug-ownership index across both legacy collections before processing the registry. Reject duplicates within groups, within idols, and across groups/idols with a stable legacy-duplicate code. Do not rely on `findIndex`, map construction, or last-write-wins behavior, which can silently update one duplicate and leave another stale.
3. Validate registry canonical paths exactly from type plus slug before projection: groups use `/artists/${slug}` and individuals use `/idols/${slug}`. A merely nonempty or route-shaped path is insufficient; return a distinct canonical-path error so route drift is diagnosable.
4. Before merging or appending each registry entity, compare its target collection with the legacy slug owner. If that slug already belongs to the opposite collection, reject with a stable entity-slug-conflict error rather than creating a cross-type duplicate.
5. Keep projection pure: every failure must leave both input graphs unchanged and expose no partial result. Preserve nested legacy metadata on valid merges and retain exact final group/idol/passport counts.
6. Drive each boundary RED first with valid hostile records: opposite-type collision, duplicate target records, and wrong group/individual canonical paths. Assert exact error codes, input immutability, and zero getter calls where descriptors are hostile. Then run the focused projection slice, full feature file, registry/reference tests, and canonical suite.

This test converts real catalog counts, canonical metadata consistency, standalone routing, slug ownership, and broad-record preservation into one objective release receipt.

## Runtime static-data override seams

When the generated fixture is consumed by a runtime through an explicit test-only static-data path:

1. Define `overrideRequested` from both the test-process gate and own-property presence of the path variable. Use that same boolean to select the path, invoke the contained-path validator, apply fixture-specific schema checks, and normalize failures.
2. Scope any stricter schema contract added for the fixture seam to `overrideRequested`. Do not accidentally impose the new fixture schema on the ordinary production static file when production still supports a broader or legacy shape.
3. Keep JSON parsing errors real on the ordinary production path. Only the explicit test override should translate read, parse, containment, or schema failures into the stable test-override error.
4. Prove malformed override data still fails closed and never falls back to production data. Exercise a real endpoint whose success would reveal fallback, and assert the stable unavailable response.
5. Add a narrow source-structure regression when behavior alone cannot distinguish where validation is applied. Extract the reader function and assert the schema condition is visibly guarded by `overrideRequested`; pair this with the behavioral malformed-override test so the source assertion is not the only evidence.

This separation is important when a test fixture intentionally uses a stricter schema than the production artifact it temporarily stands in for.

## Verification report

Report separate counts for:

- RED (expected failure),
- focused fixture GREEN,
- combined feature tests,
- canonical full suite.

Also report the committed paths, commit SHA, clean-worktree state, and explicit confirmation that the production registry remains absent.

## Pitfalls

- Do not copy the whole review proposal wrapper into the fixture.
- Do not make a one-entity fixture pass against the full production cohort; use a one-row cohort slice only in tests.
- Do not weaken exact-cohort production validation to accommodate test data.
- Do not treat a source image URL as a rights receipt; credit, license, approval, dimensions, and takedown metadata are independent requirements.
- Do not broadly clean or restore a shared worktree after generation; restore only known generated paths.
