# Stateful Browser-Harness Sequencing for Generated Runtime Remediation

Use this when a generated browser module is tested through a lightweight DOM/runtime harness and the test swaps the active app subtree.

## Core rule

Treat page replacement as a state transition, not setup. Resolve and exercise elements on the page that actually owns them **before** replacing the app. After replacement, re-query only elements owned by the new page.

A common false failure is:

1. Render a main profile containing a current-item action.
2. Replace the app with a Sources detail page.
3. Search the replacement page for both the old current-item action and new source actions.

The old element is correctly absent; the harness sequence is wrong, not the renderer.

## Runtime-fidelity gate

Do not let a pure helper test or injected fixture inventory stand in for production initialization. A generated-runtime acceptance test must execute the **actual generated browser module** against the **actual generated HTML/data payload**. Before accepting the slice:

- Assert every runtime dependency used by analytics/state logic is present in the generated payload. If production embeds only `search`, `idols`, and `groups`, a test that directly injects `contentItems` proves only the helper—not production.
- Prefer machine-safe action attributes emitted by the renderer (`data-*-action`, type, module, boolean flags) over visible text, headings, URL equality, or ancestor presentation structure. Include a test that changes visible copy while event classification remains unchanged.
- When two links can share a visible label such as `official`, emit distinct semantic attributes at render time; do not reconstruct provenance after HTML flattening.
- Exercise the mounted path variant (for example `/product/...`) and assert analytics sends the canonical server path rather than the deployment prefix.
- Settle authoritative async session hydration before asserting the initial signed-in profile event. Also navigate before hydration resolves and prove only the final current navigation receives one view.
- Test exact viewport boundaries from the supported-interface registry, not a guessed `< breakpoint` convention.
- Validate complete generated document structure: one app root, one data payload, one browser module, and one stylesheet.

A string check for helper presence is supplemental evidence only. It cannot replace lifecycle execution through document listeners, app replacement, history/popstate, route prefixes, and session settlement.

## Verification pattern

1. Hydrate required asynchronous state and settle the harness.
2. Query the main-page action and assert it exists.
3. Mutate visible text to misleading content when proving classification is attribute-driven.
4. Dispatch a click and assert external navigation was not prevented.
5. Re-dispatch the **same event object** and assert no additional analytics event was emitted when production dedupes by event identity (for example, via `WeakSet`).
6. Dispatch a new event object against the same link and assert it is treated as a distinct later click.
7. Replace the app subtree with the detail page.
8. Re-query source actions from the replacement DOM and click them, proving the delegated document listener survives replacement.
9. Assert exact event order, schema, canonical path, and count.

If the harness always constructs a fresh event, add a narrow `redispatchClick(event)` helper rather than weakening production dedupe or simulating identity with counters.

## Full-gate follow-through

A focused correction can expose stale nearby assertions. If renderer markup intentionally gained machine-safe attributes, update old assertions to require the exact new attributes rather than loosening them to broad regexes.

Run, in order:

1. Focused task slice.
2. Full feature file.
3. Bare canonical full suite.
4. Canonical build/static verifier.
5. Restore only known generated-output churn after each generator-owning gate.
6. Confirm `git diff --check` and exact allowed paths.
7. Stage explicit files, inspect the cached path list, commit, and verify a clean worktree.

A passing focused slice is not completion if the feature file still contains stale exact-markup contracts.