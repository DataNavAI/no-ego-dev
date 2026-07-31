# Rights-Bound UI Implementation from Private Mocks

Use this pattern when an accepted private/review-only mock is the visual authority, while production media, copy, or content requires a separate approved manifest or release contract.

## Separate the authorities

Treat the inputs as different contracts:

- **Design authority:** screenshots, mock routes, CSS tokens, component IDs, responsive geometry, hierarchy, interaction states, and accessibility intent.
- **Publication authority:** production manifest, rights receipts, approved copy/content release, canonical routes, and public-byte allowlist.

Acceptance of the first never implies acceptance of the second. A mock can be `MERGEABLE` as a design artifact while every mock image, fixture fact, review annotation, receipt, private path, and review-host byte remains non-publishable.

## Before editing

1. Open every named screenshot or frame and inspect the pixels, not only its Markdown description.
2. Read the mock styles/tokens and list the implementation-critical geometry: media aspect ratios/crops, focal points, overlay positions, CTA hierarchy, card density, nav clearance, and mobile/desktop breakpoints.
3. Read the production media/content manifests and identify the exact approved IDs, public paths, alt text, intended placements, and availability state.
4. Build a placement matrix: each visible slot maps either to one eligible production asset or to the existing deterministic local fallback.
5. If the project lacks a durable UI guideline, add a concise canonical guideline derived from accepted visual decisions; do not copy private review language or assets into the public product.

## Implementation rules

- Recreate geometry and tokens in production components; do not port the private mock wholesale.
- Render only canonical public paths from the approved manifest. Do not use remote source URLs at runtime.
- Keep asset placement within the manifest’s intended identity/context. A group photo does not silently become a member portrait.
- Preserve truthful availability. Approved identity photography may enrich an unavailable/recovery surface, but it does not authorize fabricated lessons, quiz questions, facts, endorsements, or publication claims.
- For catalog entities without eligible photography, keep the deterministic existing fallback; never borrow another entity’s image.
- Source credits from the canonical emitted credits projection and expose them accessibly without trusting arbitrary runtime shapes.
- Keep mock/review/governance files outside generator inputs and public allowlists.

## Tests and visual proof

Write RED→GREEN checks for:

- exact eligible asset IDs/paths and source-to-public byte parity;
- expected image hierarchy and accessible alt/credit controls;
- intended-placement compliance and deterministic fallback behavior;
- truthful unavailable states despite visible identity media;
- absence of mock paths, review markers, private bytes, receipts, and fixture-only facts in the full public tree;
- fixed-nav clearance, overflow, focus, keyboard/dialog behavior, reduced motion, and representative breakpoints.

Build the product, then capture clean browser screenshots at the named reference viewports. Compare implementation against the accepted frames for hierarchy, crop, spacing, and viewport relationships. Keep transient screenshots and measurement reports outside the repository unless the project explicitly versions release evidence.

## Review evidence

The PR/task notes should name:

- every design artifact inspected before editing;
- the approved production manifest/credits sources;
- the placement/fallback boundary;
- exact tests/build/public-boundary results;
- screenshot locations or review surface;
- explicit exclusions: no mock bytes, no review-only facts, no invented availability.
