# Static-Generated Correction Workflows and Detail-Page Accessibility

Use this reference when a static generator emits entity detail pages plus a shared browser bundle that carries entity context into a submission/correction form.

## Contract

1. Keep one immutable section descriptor table (`key`, human label) in the renderer. Derive allowed detail keys, routes, navigation labels, headings, and page inventory from it rather than maintaining parallel arrays/maps.
2. Main entity pages render the full detail navigation with no `aria-current` value. Each detail page marks exactly its own link with `aria-current="page"`.
3. Give every thin detail page a section- and entity-specific meta description. If the pages are navigational support rather than standalone search results, emit `meta name="robots" content="noindex,follow"` while retaining their canonical self-URL.
4. Correction CTAs should pass the entity's encoded absolute canonical URL as `targetUrl`; do not invent a second identity parameter when the submission API already persists `targetUrl`.
5. Browser prefill must fail closed. Require exactly one `type=profile_correction` and exactly one `targetUrl`; parse the URL; require exact lexical round-trip, same origin, no username/password/port/query/hash, and a path exactly matching `/artists/<safe-slug>` or `/idols/<safe-slug>`. Only then update a visible submission form's type and target URL controls.
6. Call the prefill initializer from the shared page initializer so it runs on both initial load and SPA swaps. Pages without the submission form or without valid parameters must remain unchanged.
7. Preserve truthful current-item partitioning: schedules receive only schedule records; media receives selected non-schedule records. Deduplicate biography and official sources by normalized safe URL.

## Vertical TDD slices

- **Renderer RED:** correction CTA uses canonical `targetUrl`; active detail nav has exactly one `aria-current`; main nav has none; every detail has unique description and `noindex,follow`.
- **Data/render RED:** inject one schedule, one social update, and one media item, then assert exact section partitioning and source deduplication.
- **Generated-browser RED:** generate into an isolated temporary output directory, extract the emitted prefill helper, execute it with a tiny fake form/root, and cover valid idol/group URLs plus missing params, wrong type, cross-origin URLs, malformed paths, ports, absent forms, and hidden target controls. Also assert the helper is called by the shared initializer.
- Run the focused Task tests to observe intended failures before production edits, then make the smallest renderer/generator changes and rerun to GREEN.

## Verification and generated-output hygiene

1. Run the focused task slice.
2. Run the complete feature file.
3. Run the repository's canonical generation/full-test command bare.
4. Run server/site tests that consume checked-in generated output only after canonical generation has refreshed that output.
5. Run the canonical build bare.
6. Restore tracked generated output and remove generator-created untracked output only under the explicitly owned generated directory.
7. Confirm the final scope contains only the authorized source/test files (for an exact-file-count task, assert the count explicitly), then rerun the isolated focused tests because they do not depend on restored checked-in output.

## Pitfalls

- Do not treat a pre-generation server-test failure against stale checked-in output as a product regression; establish the required generation order and rerun, while still reporting the initial failure honestly.
- Do not leave generated public artifacts in a source-only/exact-file-count correction.
- `URL.origin` alone does not prove the raw target omitted an explicit default port or normalization tricks. Require exact input-to-`href` round-trip in addition to component checks.
- Avoid separate section-key and section-label structures; they drift and weaken route/accessibility assertions.
