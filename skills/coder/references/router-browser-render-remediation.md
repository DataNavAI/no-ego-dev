# Router, Browser-Boot, and Render Remediation

Use this reference for focused review findings in a small static/SPA browser runtime: route canonicalization, startup failure containment, partial rendering, document metadata, and truthful placeholder surfaces.

## Strict vertical TDD sequence

Handle one observable contract at a time and preserve the exact RED output before production edits:

1. **Router boundary:** malformed percent encoding must return a fail-closed not-found result instead of throwing. Wrap only `decodeURIComponent`; retain the original requested path in recovery results.
2. **Canonical paths:** normalize supported trailing-slash paths before lookup and return `replace: true` so startup/navigation uses `replaceState`, not an extra history entry. Keep unsupported paths fail-closed.
3. **Renderer coverage:** test each supported route kind against its own canonical heading and truthful unavailable/not-connected state. Assert it does not fall through to the generic not-found surface. For table-driven cases, assert a nonzero/exact case count so an empty matrix cannot pass.
4. **Browser startup:** import the browser module in a DOM-free or root-free harness, then inject a `window.localStorage` getter that throws. The exported `boot(environment)` must catch initialization failures and render recovery without fetching.
5. **Document metadata:** manage robots metadata in `document.head`; never emit `<meta>` inside app/body HTML. Test both insertion for noindex and removal when returning to an indexable route.
6. **Incremental search:** update only result-count and results containers. Assert the exact input object and its selection range survive the update. This proves the runtime did not replace the form subtree.
7. **Strict CSP recovery:** render a data attribute or stable selector and bind retry with `addEventListener`; assert recovery HTML has no inline `onclick`.

Run each new test alone to RED, make the minimal production change, and rerun it to GREEN before adding the next test.

## Browser module testability

Avoid top-level reads of fallible browser APIs. Resolve `window`, `document`, `fetch`, storage, and the app root inside an exported `boot(environment = {})` boundary. Return early when there is no app root so importing the module under Node does not create asynchronous errors. Keep automatic browser startup guarded by `typeof window !== 'undefined' && typeof document !== 'undefined'`.

A useful Node harness pattern is:

- temporarily install a root-free `globalThis.window/document` before dynamic import when testing automatic startup safety;
- restore globals in test cleanup;
- inject lightweight document/head/meta/root objects for behavior tests instead of requiring a full DOM library;
- ensure a failed import or automatic startup does not leave an unhandled rejection after the test ends.

## Rendering and navigation details

- Export a pure row/list renderer when the browser needs to replace only a scoped results container; keep escaping centralized there.
- Add a stable `.catalog-results` container around initial rows so initial and incremental rendering share the same shape.
- Preserve route/history tests for direct loads, canonical replacement, push navigation, and popstate behavior.
- If result links are replaced with `innerHTML`, use delegated same-origin navigation handling or deliberately accept full direct-load navigation. Do not assume listeners attached to removed nodes survive.
- Dynamic artist names and route-derived headings must pass through the existing HTML escaper.
- Placeholder surfaces must state only contract-approved truth such as unavailable or not connected; do not invent future content.

## Recoverable one-commit delivery

For a requested recoverable remediation branch:

1. Create and push the dedicated branch before implementation so the remote recovery target exists.
2. Stage only the authorized source/test paths.
3. Run `git diff --check`, the focused suite, bare canonical tests, bare build, and repository-specific public/mock/architecture gates.
4. Create exactly one coherent commit and push it.
5. Verify local SHA equals `git ls-remote origin refs/heads/<branch>` and that the worktree is clean.
6. Report compact evidence: RED reasons, focused GREEN counts, canonical totals, build/gate results, exact paths, branch, and full SHA.
