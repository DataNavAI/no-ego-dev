# Mock-to-product alignment

Use this reference when an existing runnable mock is the visual source of truth for implementation.

## Evidence packet

Read, in order:

1. Product/mock README and publishing boundary.
2. Latest `DESIGN_REVIEW.md` and accepted feedback/disposition.
3. Stable route, screen, component, and hotspot IDs.
4. Current implementation branch, UI guideline, PRD/CUJ, and media/rights contract.
5. Existing UI tests and the mock's verification receipt.

## Parity matrix

Record expected vs actual for:

- shell and navigation;
- primary screen hierarchy and dominant CTA;
- media role, aspect ratio, crop, alt text, and fallback;
- discovery/funnel surfaces;
- follow/saved vs recommendation state;
- loading, empty, error, auth/permission, and recovery states;
- responsive geometry and fixed-navigation obstruction;
- copy minimum-text behavior.

Mark each difference as `intentional product boundary`, `implementation drift`, or `needs decision`. Do not use a mock-only review fixture as production authorization.

## Safe implementation loop

1. Start from a clean isolated branch based on the active implementation candidate; do not edit a dirty shared checkout or overwrite `main`.
2. Close the smallest high-value parity slice first.
3. Make token/component reuse structural where the mock and product share a rule.
4. Update targeted assertions to encode accepted stable IDs, CTA text, media count/roles, and responsive geometry. Never weaken an existing test merely to make a visual diff pass.
5. Run lint, focused UI tests, the relevant full suite, build, public-boundary checks, and `git diff --check`.
6. Open a review PR against the intended implementation branch and read back the exact local/remote SHA, clean status, and PR base/head.
7. Re-capture product screenshots at the mock's reference mobile/desktop viewports before calling parity complete.

## Private mock delivery

For an access-controlled hosted mock, retrieve the environment credential from the protected credential store without printing it during setup. Construct the private destination with the sole `access` query parameter, then verify:

- unauthenticated request is denied;
- access redemption sets the auth cookie;
- the final URL is the same pathname with no query or fragment bearer;
- the authenticated clean URL returns `200`;
- the bearer link is delivered only in the intended private channel and is absent from repositories, PRs, screenshots, and logs.

The user-facing handoff should include the complete destination-bearing link and a token-free label; do not make the clean cookie-gated URL the only CTA because it cannot authenticate a new session.

## Common false positives

- Matching colors/radii while using a different semantic token/component.
- Matching a source image but dropping required subject count in a crop.
- Calling a route complete because it exists directly when zero-context navigation cannot discover it.
- Treating review-only photographs, generated personas, or mock content as production-approved.
- Reporting a mock URL without verifying cookie redemption and query removal.
