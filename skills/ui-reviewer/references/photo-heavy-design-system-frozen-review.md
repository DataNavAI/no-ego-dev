# Photo-heavy design-system frozen review

Use this when reviewing a media-led design-system specimen with local or licensed fixtures.

## Candidate assembly

1. Finish every async builder before freezing. Do not freeze while a worker can still mutate source, assets, manifests, or evidence.
2. Reconcile human and machine contracts before capture: token values, breakpoints, media roles, component names, navigation policy, and state names must match.
3. Treat media as data, not decoration. Every fixture needs a stable ID, local derivative, source/provenance, crop/focal metadata, alt decision, fallback, lifecycle state, and explicit production restriction when rights are unresolved.
4. Keep fixture classes unambiguous in both UI and manifest: review-only stock, research-only, and production-approved must never collapse into one “available” state.
5. Make photo density route-specific. Count meaningful identity/release/event/challenge media, not decorative gradients or abstract art.

## Evidence matrix

Capture every representative route at the primary mobile, narrow mobile, and desktop viewport. Add:

- clean first-viewport and full-page images;
- annotated key screens with stable route, visual, action, state, and media IDs;
- large-text/dynamic-type stress;
- reduced-motion evidence;
- missing, restricted, expired, loading, stale, empty, offline, and recovery states;
- keyboard activation, SPA focus transfer/restoration, and safe-area/fixed-navigation reachability;
- interaction truth for outcome-dependent scores, dates, exports, share branches, and failures.

Do not accept `overflow-x:hidden` plus `scrollWidth == clientWidth` as proof of reflow. It can hide clipped descendants. Also inspect element bounds and pixels at narrow widths and large text. For horizontally scrolling rails, whitelist only the rail’s intentional offscreen descendants—not the containing layout.

For fixed/sticky navigation in full-page screenshots, distinguish stitching artifacts from runtime obstruction. At maximum scroll, compare the final meaningful control/content rect with the live navigation rect. Repeat this at large text because navigation height can grow.

## Zoom labels

Keep these separate in reports and filenames:

- root-font/dynamic-text stress;
- narrower-viewport reflow;
- CDP `Emulation.setPageScaleFactor`;
- OS/device scale;
- genuine browser menu zoom.

Never rename CDP page scale, CSS `zoom`, or device scale as genuine browser zoom. If genuine zoom is required but automation is unavailable, keep it as an explicit manual gate rather than manufacturing a pass.

## Freeze and independent review

1. Generate a SHA-256 manifest over contracts, source, assets, rights manifest, and evidence.
2. Verify every listed hash immediately before dispatch.
3. Once reviewers are dispatched, do not mutate the candidate.
4. If a new defect is found, mark that review generation superseded, remediate, regenerate affected evidence, create a new manifest, and rerun independent review. Never combine an old verdict with a newer candidate.
5. Require separate verdicts for design-system/composition quality, implementation readiness, local review-fixture use, and production-media readiness.

## Rights checks for review fixtures

A review fixture may demonstrate layout without being production-safe. The asset manifest should use explicit values such as `review_only`, `restricted`, `none`, or `unknown` instead of ambiguous blanks. Derived mosaics must preserve complete parent lineage and canonical source URLs. “Publicly reachable” or “from an official-looking pool” is not permission. Keep release/model/property uncertainty and production replacement as open escalation flags.
