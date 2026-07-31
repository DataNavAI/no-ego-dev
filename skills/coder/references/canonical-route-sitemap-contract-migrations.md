# Canonical Route and Sitemap Contract Migration

Use this when changing canonical/alias identity in a static generator.

## Pre-edit dependency audit

Before writing the RED feature test, search every test and static verifier for the affected route, sitemap token, canonical marker, and legacy page marker. Classify each expectation as:

- **new contract** — should remain or be strengthened;
- **stale contract** — must change with the implementation;
- **unrelated baseline** — must remain untouched.

If the task limits edits to exact files but also requires a full suite that contains stale expectations elsewhere, surface the scope contradiction before committing. Do not call a knowingly failing canonical suite an acceptable completion merely because the focused feature suite passes.

## Implementation pattern

1. Build and validate canonical and alias maps before the first destructive output mutation.
2. Reject canonical/canonical, alias/alias, and canonical/alias collisions before any `Map` collapse or write.
3. Generate aliases from reviewed registry `aliasPaths`; do not infer extra aliases from route conventions.
4. When the complete production cohort contract requires one alias per entity, scope that stricter cardinality rule by **validated complete cohort identity and count**, not by environment mode. A partial test fixture may validly expose zero aliases while a test-mode clone of the complete production cohort must still receive production-strength preflight.
5. Give alias-cardinality failures a stable error code and raise them while constructing the route map, before recursive deletion, directory creation, or writes.
6. Emit alias pages as minimal semantic HTML: escaped absolute canonical, `noindex`, same-origin relative refresh, and visible fallback link. Do not duplicate primary content or require JavaScript.
7. Construct sitemap candidates, remove aliases, then deterministically deduplicate while preserving order.
8. Keep non-cohort legacy routes and sitemap entries unless the contract explicitly migrates them.

### Complete-cohort missing-alias regression

Clone the real complete registry into a uniquely named canonical test-fixture path, remove one entity's alias, seed an isolated output directory with a sentinel, and invoke the generator through the test-only registry seam. Assert a nonzero exit, the exact stable alias-count code, and unchanged sentinel bytes; remove the temporary fixture in `finally`. Pair this with an existing partial-fixture GREEN assertion so the fix cannot accidentally require aliases merely because `NODE_ENV=test` or an override is present.

## Verification order

1. Focused RED, then focused GREEN.
2. Full feature suite.
3. Regenerate the static tree before standalone site tests when those tests read checked-in generated output; otherwise stale artifacts can produce unrelated count/sitemap failures.
4. Run the standalone site suite, static verifier/build, and full canonical test command.
5. Restore only the known generated tree, remove only baseline-clean untracked files beneath that tree, and verify worktree scope.
6. Confirm the final diff contains exactly the authorized files and passes whitespace checks.
7. Commit only after all required commands pass, or after the user explicitly resolves/accepts a documented out-of-scope blocker.

A stale verifier is still a release blocker. Update it when authorized; otherwise stop before commit and request a scope decision.