# Source-reviewed entity registry promotion

Use this workflow when a product needs a fixed cohort of public entities with claims, relationships, official links, and licensed images sourced from public knowledge APIs.

## Separate evidence from product data

Keep raw API payloads, request logs, retries, and large coverage reports outside the repository in profile-local scratch space. Version only polished decisions, compact coverage summaries, schemas, promotion rules, and reviewed production records.

Raw evidence is not production content. Label it explicitly as unapproved and prevent generators/runtime code from reading it.

## Build a deterministic candidate

1. Start from the frozen cohort and route audit, not search results.
2. Fetch by immutable IDs in bounded batches with a descriptive User-Agent, retries, timeout, and fail-closed response checks.
3. Preserve raw statement rank, qualifiers, qualifier order, references, and reference counts. Do not synthesize biographies, translations, relationship states, or missing facts during collection.
4. Fetch image metadata/rights receipts separately from identity claims.
5. Treat raw API object boundaries as hostile: require own data descriptors for required entity type/ID and optional qualifier containers; distinguish a truly absent qualifier from a present-but-malformed/accessor-backed container, and omit malformed relationship statements without invoking getters.
6. Apply strict component-aware lexical HTTPS validation before URL parsing. Reject credentials, literal controls/C1/whitespace/backslashes, malformed percent escapes, and encoded or recursively encoded controls/DEL in every component. Reject encoded slash, backslash, or percent in authority/path where normalization can change routing, but do not discard valid encoded redirect/percentage values solely because they appear in query or fragment. Validate Commons description, original, license, official, and statement-reference URLs consistently; reject percent-bearing source filenames when they are used to construct canonical description URLs.
7. Preserve uncertainty instead of converting absence to a negative assertion: missing Commons attribution metadata stays `null`, not `false`; missing supplemental statement references still permits entity-level Wikidata evidence, while present malformed/accessor-backed references fail closed.
8. A valid P582 qualifier establishes `former` even when Wikidata precision is only year/month; keep `endAt: null` when no exact instant exists. Only day precision becomes a full UTC instant, and only after an exact source-components-to-ISO round trip rejects JavaScript date normalization drift (for example, February 31 silently becoming March 3).
9. Verify exact row count, unique immutable IDs, order/rank/type, canonical-path match, missing entities/files, and request errors.
10. Emit deterministic checksums for the candidate, report, collector, and verifier.

## Report qualifiers separately

Direct-property coverage and qualifier coverage are different. Relationship end dates commonly appear as qualifiers rather than standalone claims. A report that says an end-date property has zero direct claims can still hide many ended relationships.

For relationship qualifiers, report at least:

- rows containing the qualifier;
- statements containing the qualifier;
- total qualifier values.

Never infer that a relationship is current merely because an end qualifier is absent. Promote `current` or `former` only after statement-level review, conflict resolution, and preferably an official source.

## Image promotion gate

An image property or resolved Commons file is not approval. Require a complete receipt:

- source description URL;
- dimensions;
- creator/credit;
- license name and HTTPS license URL;
- usage/attribution requirements;
- explicit approval status and UTC timestamp;
- local canonical asset path;
- visible rights/takedown path.

If any required rights field is absent or ambiguous, select the branded non-likeness fallback. Track completeness counts separately from file-resolution counts.

## Candidate-only refresh writers

A source refresh must never share a generic output path with the approved production registry. Treat collection and promotion as separate trust boundaries:

- write only a fixed `*.candidate.json` basename; keep the approved filename absent from the writer API;
- make fixture mode explicit, bounded, deterministic under a supplied UTC clock, and import-safe: importing must not parse CLI arguments, write, fetch, or exit;
- validate unique immutable IDs, fixture shape, and the complete expected batch before opening output;
- normalize all injected entity/rights loader exceptions to one stable collector error containing only the immutable ID; distinguish missing returns from loader failures and materializer rejection;
- on missing, duplicate, malformed, partial, or failed input, preserve both the approved registry and previous candidate byte-for-byte;
- write atomically in the destination directory: exclusive unique temporary file, deterministic JSON plus trailing newline, file sync/close, rename, directory sync, and cleanup on every failure path;
- require bounded regular non-symlink fixtures, reject symlink/directory candidate targets, and activate CLI behavior only after canonical direct-execution comparison (including symlink invocation);
- test approved and prior-candidate sentinels, success, partial batch, malformed input, loader exceptions, import purity, direct symlink invocation, and rerun determinism.

The output is review evidence, not product data. Mark it explicitly candidate-only and never fabricate approval timestamps, local media paths, biographies, or missing claims.

## Live-source identity and relationship pitfalls

- Treat the frozen immutable-ID cohort as the display-identity authority. Live labels can be vandalized or transient; inspect them and never auto-promote mismatched labels as aliases. Add a regression for any observed poisoned label.
- A localized label can be a legal name rather than a stage-name translation. Omit it unless the product's legal-name approval/source policy is satisfied.
- A direct official source may establish a stronger relationship status than an entity-level statement; apply that status symmetrically only when both directions cite the same reviewed evidence.
- Source-derived related-person slugs are not automatically stable product routes. Track route-continuity mismatches separately, and never treat `unknown`/`former` relationship slugs as current-route assertions.

## Remediating identity findings from product review

When an audience-seeded review finds that a technically valid profile still fails fast identity confirmation:

1. Preserve the rejected immutable candidate and its product verdict before changing source data. Technical matrix PASS and product FAIL can coexist; never relabel the old candidate after remediation.
2. Translate the finding into one visible, source-backed identity assertion at a time and drive each through RED→GREEN. Examples include a reviewed acronym expansion in the hero or a reviewed group relationship already supported by the renderer.
3. For aliases, inspect the immutable-ID source payload and promote only an explicit reviewed allowlist. Assert both the registry value and the rendered first-view ordering; do not auto-import every collaborative-source alias.
4. Never promote `unknown` membership to `current` from a missing end qualifier. Require a live official page that visibly lists the person as part of the group, record a fresh checked UTC instant, retain the target-QID display-name receipt, and use the official HTTPS page as the relationship source.
5. Do not broaden the fix into unsupported activity, agency, debut, or roster assertions merely because a reviewer suggested richer context. If those facts lack reviewed evidence or specified copy, leave them omitted and document the narrower truthful remediation.
6. Update exact cohort invariants rather than weakening them: expected reviewed-name/current/unknown counts, exact current relationship tuples, source type/URL, and rendered semantic hook. Pair the changed counts with entity-specific assertions so a compensating unrelated drift cannot pass.
7. Verify local generated mobile and desktop first views in a disposable output root outside the repository, then run the canonical suite and build. Restore only the known generated tree; scoped `git clean` is acceptable only after proving that tree was clean and generator-owned before execution.
8. The source change creates a new release candidate. Repeat immutable construction/deployment and all candidate-bound browser/product gates; old screenshots and traces remain evidence only for the rejected candidate.

## Sequential task ownership during review

When a registry declares contracts for assets or routes that a later planned task will materialize:

- review the current task against its explicit acceptance contract and file scope, not the eventual release state;
- verify the contract is not publicly consumed yet (for example, production generation remains disabled);
- record the later materialization/existence task as a mandatory deployment gate;
- do not remove required contract fields merely because future artifacts do not exist yet;
- do not generate future-task artifacts early when that would exceed scope or invalidate the later task's RED/GREEN proof;
- escalate only if the current change already publishes a broken reference, or if no later gated task owns materialization and existence tests.

## Human review and promotion

Treat live collaborative-source labels and descriptions as untrusted evidence, not display authority. A valid immutable ID can temporarily carry a vandalized label while its structured IDs and sitelinks remain coherent.

- Keep the frozen cohort name/path as the reviewed product identity authority.
- Reconfirm each fetched entity by matching a second immutable identifier from the frozen cohort (for example, all current P1902 values against frozen Spotify IDs).
- Never auto-promote a live label difference into `alternateNames`; use an explicit reviewed alias allowlist. Add a regression for any observed poisoned label so later refreshes cannot reintroduce it.
- Preserve raw payloads and checksums in non-repo scratch, materialize through the production-safe transformer, and commit only reviewed records.
- Split large cohorts into independent review batches. Each batch verifies identity/path, exact biography-source correspondence, explicit-property links, relationship status, and image/fallback honesty before promotion.
- Reconcile batch findings against a final machine check that compares promoted biographies/links/relationship counts to the reviewed source materialization.

For each entity, review:

- immutable identity, disambiguation, type, rank, and canonical path;
- names and summary against source language without invented translation;
- allowed claims only, each with verified status, checked UTC instant, and accepted HTTPS sources;
- official links for canonicality and deprecation;
- relationship target/status/dates with explicit source evidence;
- image rights and local crop suitability.

Omit unknown, conflicting, deprecated, invasive, or weakly sourced values rather than filling gaps.

## Vertical-slice safety

If only one reviewed entity is ready but production validation requires the complete cohort, use a test-only fixture under `tests/fixtures`. Validate it against the matching cohort slice and prove it fails full-cohort validation. Do not create a partial production registry or weaken exact-cohort checks. Use `references/reviewed-test-only-data-fixtures.md` for the fixture handoff and later transition marker.

## Durable project evidence

Commit a concise coverage review that records:

- verified cohort/path invariants;
- per-property row/claim/reference counts;
- qualifier counts;
- image-rights completeness;
- product implications and omission rules;
- exact promotion gate;
- raw-candidate checksum and scratch location without copying raw payloads into git.
