# Photo-First MVP Design Systems

Use this reference when an entertainment, fandom, fashion, travel, food, sports, or collecting product depends on visual recognition and the user asks for a design system—not merely a mock.

## Core rule

Treat photography and artwork as system primitives. A colorful abstract SVG, gradient, silhouette, or generic illustration is a fallback; it does **not** satisfy a request for photo-rich design.

## Minimum media contract

Define each required media role from the approved CUJs, such as:

- identity/group hero;
- member/person portrait;
- lineup mosaic or portrait rail;
- release/product artwork;
- event/schedule thumbnail;
- search/answer result thumbnail;
- recommendation/discovery card;
- challenge prompt;
- share-result background.

For every role specify:

1. required and alternate aspect ratios;
2. minimum source dimensions;
3. focal-point and face-safe crop rules;
4. `object-fit` / `object-position` behavior;
5. mobile and desktop art direction;
6. overlay/contrast and caption/credit treatment;
7. contextual alt text versus decorative handling;
8. loading, skeleton, missing, restricted, expired, stale, offline, and error behavior;
9. fallback asset preserving geometry;
10. rights/provenance metadata and takedown owner.

## Photo-density and meaning evidence

Do not rely on a prose claim like “photo-rich.” Render representative routes and inspect pixels. The first useful mobile viewport should normally contain one dominant meaningful photo/art object plus visible photo/art continuation (portrait rail, thumbnail row, or related artwork), while preserving the route’s key fact and one primary action. Define route-specific targets instead of one vanity percentage for the whole product.

Count **meaningful media**, not just occupied image area:

- a challenge image must contain a clue that truthfully supports the prompt and answers, with an equivalent text/fallback clue;
- event/release art must remain visibly bound to entity plus event/release type through a persistent mark, title, or approved artwork identity;
- discovery imagery, entity mark, and recommendation reason must agree for every selectable taste/state;
- a group mosaic assembled from unrelated headshots may prove density and geometry, but cannot approve final category art direction or crop quality;
- generic travel, fireworks, sky, or lifestyle stock cannot be relabeled as group identity without a coherent fictional identity system.

A component specimen alone is insufficient. Apply the system to the primary journey and supporting routes so reviewers can judge identity, rhythm, crop quality, text balance, fallbacks, and responsive behavior. Keep `visual-direction approval`, `implementation readiness`, and `production-media readiness` as separately named verdicts so a missing browser/AT receipt or production license does not erase useful composition findings—and composition approval does not waive those blockers.

### Photo-rich is not profile-rich

Do not translate “photo-rich” into a wall of portraits, empty entity shells, or unavailable recommendation cards. Every public profile/card must map to substantive released content and an approved CUJ; otherwise hide it from launch discovery instead of using initials, generic fallbacks, disabled cards, or “coming soon” breadth. Prefer one strong group/story/release image that supports the value proposition over seven portraits that visually promise an unbuilt profile product.

For data-driven launches, bind the visible entity IDs to the validated release boundary and regression-test that relationship. Review screenshots plus a mechanical count of: meaningful image roles, visible released entities, unreleased entities shown, fallback/initial tiles, broken images, and credit-to-rendered-asset parity. A route passes only when it is both meaningfully photo-led and honest about shipped content breadth.

## Rights-safe fixture ladder

Use the earliest viable source:

1. approved/licensed production media with stored evidence;
2. permissioned official assets where terms explicitly allow the intended use;
3. official embeds where embedding is permitted and operationally acceptable;
4. purpose-generated fictional media that does not resemble real people;
5. clearly labeled stock-photo **review fixtures** with source/author metadata, durable mockup/review-use evidence, and an explicit production prohibition;
6. designed non-photo fallback.

Public availability is never permission. Research screenshots stay research-only. Do not present stock models as real artists or generate photorealistic celebrity lookalikes.

If image generation is unavailable, do not quietly replace photography with gradients. Use labeled review-only stock fixtures only when their narrow access-controlled review/mockup basis can be captured, or stop with an explicit media blocker. Record source, author, fixture scope, transform, alt/crop, fallback, and takedown fields.

### Review-fixture evidence package

A URL and a `review_only` flag are not enough for a reusable review bundle. Before independent media review:

- capture the governing terms/license/mockup-use page and the exact source/API receipt used at acquisition; store capture time and SHA-256;
- retain and hash the acquired source bytes separately from displayed derivatives;
- bind every derivative to source asset/version, transform recipe, dimensions, format, and derivative hash;
- for recognizable people, retain source-bound adult/minor evidence when the source represents it; otherwise mark age uncertain and remove the portrait from review pending approval—never infer age from appearance;
- record exact route/component placements rather than blanket `all routes` scope, with per-placement alt/empty-alt, crop/focal, and credit decisions when they differ;
- register designed fallbacks as governed assets with stable IDs, author/source path, hash, dimensions/viewBox, status, and allowed review transforms;
- add a keyboard-accessible source/credits sheet on every photo-bearing review route when attribution or provenance must be inspectable;
- run a machine verifier for manifest width, complete rows, source/evidence/original/derivative hashes, dimensions, exact placements, fallback resolution, review-only state, and production prohibitions.

Keep two verdicts explicit: **access-controlled local design-review use** and **production-media readiness**. A local-review PASS must not promote any asset; a production REJECTED verdict is expected while fixtures remain restricted.

## Fixture labels and manifests

Keep a compact persistent label in runnable mocks, for example:

> Stock-photo prototype fixtures · not real artists · not production media

The per-asset manifest should contain:

- asset ID and placements;
- owner/author and source URL;
- source service;
- permission/license evidence or `NOT APPROVED`;
- fixture versus production scope;
- crop/transform permission;
- territory/expiry/recheck date;
- attribution;
- focal point and alt decision;
- moderation/takedown owner and replacement SLA;
- fallback asset ID.

## Real-person and artist review photos

When a user explicitly asks for actual artists, athletes, creators, or other recognizable people, do not substitute fictional stock faces or generated lookalikes. Prefer auditable licensed sources with canonical asset pages and machine-readable creator/license metadata, and keep the result access-controlled until the full gate is complete.

A copyright license such as a Commons license is necessary evidence, not complete production approval. Keep every asset `NOT_APPROVED` until publicity/personality rights, trademark and endorsement risk, permitted crop/transform, attribution placement, territory/term, and exact product placement have been reviewed. State that no endorsement is implied.

A user's direction to “add pictures,” “match the mock,” or use a named artist-photo source approves the **visual requirement**, not the media-rights disposition. Do not change `NOT_APPROVED` to `production_eligible` merely from that request. Require a named disposition owner and durable row-level decision covering the obligations above; if the owner accepts a bounded residual risk, record the exact asset/placement, rationale, territory/term, takedown path, and decision date. Until then, implementation may build the fail-closed media contract and designed fallback, but publication remains blocked.

- Visually verify every selected identity; search results and filenames can return crowd-only, merchandise, distant-stage, or misidentified images.
- Reject images that do not support recognition at the intended crop. A wide group image may work in a 16:9 answer card but fail a 4:5 mobile hero.
- Prefer role/crop suitability over superficial license simplicity. A public-domain image can still carry publicity/endorsement risk and may be too small or poorly composed for the intended card/hero; a higher-resolution attributed CC image can be the better private-review fixture when its obligations are recorded.
- For CC BY-SA sources, record the share-alike obligation, license the derivative compatibly, retain attribution, and identify crops/composites as modifications. Do not label a multi-source composite generically “CC-compatible” without resolving every source license.
- A derived member mosaic can solve an identity-safe portrait crop only when every source license permits the derivative. Preserve each source row, transform recipe, derivative hash, and composite attribution.
- Keep source/original hashes separate from displayed derivative hashes.
- Generate a contact sheet labeled with identity and license, then inspect it before wiring assets into routes.
- Keep photo credits/provenance inspectable without letting source labels overlap review pins or obscure faces.

## Mock-to-production reconciliation

Before engineering starts from an accepted photo-rich mock, inventory each key viewport by **meaningful image role**, not merely asset count: route/component, visible count above and below the fold, subject identity, aspect ratio, crop/focal point, loading priority, alt/credit behavior, production disposition, and designed fallback. Observable targets such as “one dominant 4:5 identity hero, one portrait-led lesson image, one dominant challenge image, and photo-led next-item cards” are stronger than “add artist images.”

Inspect the real build/public boundary before handoff. If it blanket-rejects the mock's formats or all candidate media remains review-only, treat the mismatch as a release gap. Prefer three small native-dependent children:

1. `media eligibility/build boundary` — exact rights/provenance rows, hashes, deterministic emission, credits, and fail-closed arbitrary-media tests;
2. `visual integration` — production routes consume only eligible assets and preserve the accepted mock's geometry/density;
3. `visual/media QA` — same-viewport screenshots, role counts, zero broken requests/elements, crop/layout checks, rendered-asset-to-credit parity, and at least one ineligible/missing fallback.

The dependency order is `media → integration → QA`. Independent media-contract work may proceed beside unrelated feature review when file ownership is isolated. Do not approve visual parity from a safe fallback alone when the accepted experience depended on identity photography.

## Review and handoff gates

Before engineering handoff:

- capture mobile, narrow mobile, desktop, genuine browser zoom/reflow, and large-text evidence;
- include loading/missing/restricted/expired/offline states;
- independently review copy, UI category fit, and media-rights operations;
- separate visual-direction approval from implementation readiness and production-media approval;
- block launch when any published journey still depends on unapproved review fixtures.
