# Static Supported-Interface Gate Results

Use this pattern when one deterministic generated artifact must back separately named QA cases for multiple supported interfaces, while browser evidence belongs to a later task.

## Contract

1. **Generate once per test process.** Cache one isolated generator fixture and make every parameterized interface case consume the same parsed cohort report. Clean the fixture with a test teardown hook.
2. **Reserve exact executable names.** Keep only the required interface cases under the registry name pattern (for example, `CASE-ID [web-desktop]` and `CASE-ID [mobile-web]`). Rename older partial tests outside that pattern so the registry command cannot silently run extra cases.
3. **Separate shared truth from interface results.** The generated report owns the authoritative cohort rows. Each interface writes a distinct result envelope that preserves the report's exact row order and identity while naming its interface target.
4. **Never promote static checks into browser proof.** Mark the target explicitly as static/generated output and emit `browserEvidence: false`. Static HTML can prove hooks, links, metadata, and file existence; it cannot prove viewport placement, screenshots, interaction behavior, or performance.
5. **Use a closed machine-readable schema.** Require exact top-level and row keys with `additionalProperties: false`, exact cohort cardinality, bounded ranks, canonical path/QID patterns, stable enums, and explicit PASS/static status fields. Validate the emitted result during the test without adding a package when a small bounded validator suffices.
6. **Keep routine artifacts temporary.** Write result JSON beneath the isolated temp fixture by default. Write durable release evidence only when both an explicit QA/release mode and an explicit evidence directory are present.
7. **Gate every cohort row behaviorally.** For each row, reconcile registry and generated-report identity; assert canonical static file, heading/body/metadata continuity, schema type and sameAs, breadcrumb/canonical/OG identity, source checked disclosure, exact detail/back navigation, source/correction/Follow target shapes, exact current-or-named-empty behavior, and forbidden placeholder/simulated/unsourced strings.
8. **Escape expected HTML, parse structured payloads.** Compare visible HTML against the renderer's escaping rules (apostrophes and ampersands are common edge cases), while parsing JSON-LD and comparing semantic objects rather than escaped source text.
9. **Treat static file existence honestly.** A generated canonical `index.html` may be recorded as the static route/file gate's `200` result, but label it static; actual server and browser HTTP checks remain separate evidence.

## Prevent False-Positive Rendered Evidence

Do not let broad regexes combine required fields from sibling, nested, or malformed cards. A pattern such as `<article>[\s\S]*?ACTION[\s\S]*?</article>` can begin in a timestamp-only article, cross a boundary, and finish in an action-only article while falsely passing.

1. Segment semantic containers before checking their contents. For a flat generated contract, use a bounded token scanner that rejects unexpected closes, nested opens, and unclosed containers; make every row—including honest-empty rows—fail on malformed structure.
2. Filter only complete containers containing the exact target action.
3. Validate each card independently; timestamp, source, type, and action must belong to that one card.
4. Add regressions for sibling-split evidence, nested containers, missing closes, and unexpected closes.
5. Prefer an existing HTML parser when nested markup is legitimate. Do not attempt to make increasingly broad regular expressions emulate a DOM.

Syntactic validity is still insufficient. Bind rendered evidence to authoritative selected/report truth:

- current cards must exactly preserve ordered title, canonical `startAt`/`publishedAt`, selected primary/source URL, content type, and count;
- profile source actions must equal the complete ordered `(type, URL)` tuple set, not merely contain one HTTPS link;
- substituted URLs, invalid timestamps, omitted sources, unexpected extra sources, or reordered selected items must fail.

Before accepting branch assertions, inspect the fixed fixture's state distribution. A `current-or-empty` gate whose real 50-row fixture is entirely empty has not exercised its populated branch, even when that branch contains good-looking assertions. Add a separate bounded populated control through the same matcher or a supported test-only generation seam, prove the valid card passes, and mutation-test title, timestamp, source URL, content type, ownership, and order. Keep this control outside the reserved interface-name pattern so the registry command still discovers exactly the required interface cases.

Do not blindly rebuild expected page models from serialized generated JSON. Builders may rely on module-private `WeakMap` brands, object identity, descriptor provenance, or pre-serialization normalization; deserialization can produce a different selection result while appearing structurally identical. Prefer, in order:

1. expected selected-item tuples emitted by the authoritative generated report;
2. a real test-only generator seam that preserves builder provenance;
3. exact reconciliation of each rendered tuple to one entity-owned item in the generated inventory, plus the populated mutation control above.

For every real row, assert parsed card count equals report count before branching, so honest-empty rows also reconcile independent report and HTML evidence. Never use an unproven reconstructed model merely to satisfy this equality.

## Strict TDD and Verification

- RED: add the two exact names first and fail for the absent schema/shared gate, not for syntax or test-construction errors.
- GREEN: add the smallest shared fixture, assertions, result writer, and schema needed to pass.
- Run each exact interface pattern separately, then the combined registry pattern.
- Run the full feature file, bare canonical test command, and bare build command.
- If canonical commands regenerate a known-clean output tree, restore and remove only that tree, then rerun the focused combined gate against the final worktree.
- Stage only the authorized test/schema paths; verify cached names, cached whitespace, commit contents, and clean index/worktree.
