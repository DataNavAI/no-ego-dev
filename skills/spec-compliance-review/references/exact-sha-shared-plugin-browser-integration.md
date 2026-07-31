# Exact-SHA product + shared-plugin browser integration probe

Use when the product candidate and reusable plugin are frozen in separate immutable checkouts and the hub snapshot has not yet pinned the new product SHA. This verifies the real cross-repository handoff without editing either checkout or weakening production-mode behavior.

## Technique

1. Record and later recheck each checkout's commit, tree, and clean status.
2. Run each repository's own focused/canonical tests independently.
3. Create a disposable Playwright harness outside both repositories.
4. Navigate to an HTTPS synthetic origin such as `https://review.local/<project>/<mock>/`. Intercept requests and fulfill them from:
   - exact product blobs for the mock route;
   - exact shared plugin JS/CSS from the frozen hub checkout;
   - a generated in-memory `/_review/config.json` binding the exact product SHA and deployment-owned legacy storage keys;
   - a deterministic in-memory API that implements the plugin's real list/create response schemas.
5. Do not add local test attributes to product markup. HTTPS keeps the plugin on its production configuration path, so the probe exercises the authoritative generated-config contract.
6. Seed legacy and unrelated storage with `browserContext.addInitScript` before first navigation. After initialization, assert:
   - original legacy bytes remain byte-identical;
   - unrelated storage remains;
   - migration receipt appears only after confirmed creates;
   - pending receipt disappears only after completion;
   - uploaded records preserve stable component ID, canonical same-mock route, source SHA, and historical disposition claim.
7. For every route, compare the ordered `data-review-id` inventory with the authoritative expected set, require uniqueness, and require exactly one plugin pin per eligible target. Exercise dynamic replacement states and confirm re-decoration.
8. Verify the host-owned Comments control remains the same native accessible element after plugin initialization. Check tag/type, visible name, target size, focus behavior, and that plugin CSS does not impose floating-trigger styling on a host-provided control.
9. Run axe after the real plugin initializes on every route, and collect console/page errors.
10. Reproduce deleted-layout regressions with an in-page CSS A/B only:
    - measure the candidate's wrapper/child computed rectangles;
    - inject overrides that neutralize only the restored host-owned declarations;
    - measure the regressed geometry;
    - treat a material primary-journey shrink as reproduced evidence, while requiring the candidate geometry to retain the intended size.
11. Delete disposable harnesses or keep them only outside repositories, then recheck both immutable checkouts.

## Important distinctions

- A historical pre-plugin browser report may remain useful only when clearly labeled as a baseline. It is not current shared-plugin evidence.
- Product tests plus plugin tests do not prove integration; run the composed browser probe.
- A synthetic fixture that adds test-only script attributes does not prove production manifest/config loading.
- Never call `localStorage.clear()` in a migration test. Seed sentinels and prove preservation instead.
- When emulating a deleted CSS rule, override only those declarations; do not compare against an unrelated redesign.

## Minimal evidence to retain in the review transcript

- exact product and plugin SHAs/trees;
- canonical suite counts and exits;
- route/ID/pin/axe totals;
- current versus neutralized geometry;
- storage keys/receipt state without sensitive values;
- final clean immutable identities.
