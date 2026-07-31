# Frozen Multi-Direction UI Review Receipt

Use this when independently judging several responsive design directions from an immutable screenshot/prototype bundle.

## 1. Freeze and verify before interpretation

- Hash the manifest itself and compare it with the review issue's required digest.
- Resolve manifest entries relative to the documented bundle root, not automatically relative to the manifest directory.
- Verify every listed file and record `listed`, `matched`, and `mismatches` counts.
- Repeat the same verification immediately before publishing the verdict. Review reports/issues may be outside the manifest; candidate HTML, pixels, JSON, and source must remain unchanged.
- If a checksum CLI produces ambiguous status, independently recompute every listed SHA-256 in a small script. Trust the exact mismatch count, not a summary label.

## 2. Inspect every pixel class efficiently

Inventory and inspect all of these, not only the headline contact sheet:

- clean and annotated mobile screens;
- every alternate route/state screen;
- desktop screens;
- narrow-width and page-scale captures;
- state strips;
- paired images and the overall contact sheet.

When many images exist, build temporary labeled contact sheets outside the repository, grouped by direction. Use them to establish complete coverage, then inspect the primary pairs, state strips, and scale captures at full size. Do not commit temporary review composites.

## 3. Fresh runtime matrix

For each stable screen, measure exact required viewports (typically 390×844, 320×844, and 1440×900):

- `innerWidth`, `clientWidth`, `scrollWidth`, and `scrollHeight`;
- enabled target dimensions;
- out-of-bounds descendants and the overflow container that owns them;
- fixed/sticky element rectangles;
- visible heading sequence and `h1` count;
- keyboard focus order and `aria-current`;
- safe-area CSS presence;
- maximum-scroll content clearance from fixed navigation.

Classify out-of-bounds elements carefully. Descendants extending outside the viewport inside an intentional `overflow-x:auto` rail are not document overflow, but the rail still needs an affordance and keyboard path.

## 4. Distinguish fixed-nav capture artifacts from real obstruction

Full-page screenshot stitching can paint a viewport-fixed navigation bar across intermediate document content. Do not infer obstruction from that composite alone.

At runtime:

1. Scroll to the document maximum.
2. Compare the last visible task/content boundary with the fixed navigation's top edge.
3. Confirm all controls and state content can be reached.
4. Separately verify `env(safe-area-inset-bottom)` and content padding. Zero-inset reachability does not prove notched-device safety.

Report the screenshot artifact and the runtime result separately.

## 5. Separate magnification, zoom, and large text

Treat these as three distinct claims:

- CDP/page-scale factor: visual magnification; CSS viewport and breakpoints may remain unchanged.
- Genuine browser zoom: effective CSS viewport and media-query behavior can change.
- Dynamic type/text scaling: text grows without necessarily scaling every box.

A 2× page-scale capture can prove visual magnification and reveal top-stage clipping, but it cannot prove genuine 200% browser zoom or dynamic type. If genuine zoom is unavailable, run a clearly labeled text-growth stress probe to identify likely weak modules, but never call it standards-conformant zoom evidence. Any stress failure is a risk finding; passing it is not release approval.

## 6. Transition-focused accessibility probes

Static tab order is insufficient. Exercise every core transition and record `document.activeElement` after each:

- CTA → route/detail;
- answer → feedback;
- feedback → result;
- detail → back/return;
- date rail Arrow navigation plus keyboard activation;
- result → share outcomes.

Fail implementation readiness when focus stays on a newly hidden control, falls to `body`, or cannot reach a pointer-only card. Require one visible `h1` per route/state, a stable focus destination, route context announcement, and restoration to the exact origin on return.

## 7. Decision semantics

Publish two decisions:

1. **Direction discussion:** whether the pixels are coherent and category-fit enough for user selection.
2. **Implementation readiness:** whether responsive, semantic, focus, state, rights, safe-area, and real-zoom gates pass.

A route-native set may pass direction discussion even when no single global winner exists. Name the base direction per route and allow a hybrid only for a specific evidenced function. Keep state galleries as review evidence; require production states to render in their native route rather than shipping the gallery.

## 8. Fail closed on finalization races

A snapshot can verify at review start and still be invalidated by an orchestrator, cleanup job, or parallel reviewer before publication. Treat finalization as its own gate:

1. Draft the report outside the candidate tree when practical, or clearly mark it provisional.
2. Immediately before publishing, verify that the manifest still exists, its digest still matches, and every listed file still closes.
3. Also inventory unexpected candidate-tree changes such as new parallel reports or missing evidence. A valid report path outside the manifest does not excuse disappearance of manifested files.
4. Only after that check succeeds should the report claim a candidate-bound verdict. Move/write the final report as the last authorized mutation.
5. If the final check fails, do not preserve an earlier PASS/NEEDS ITERATION as the official verdict. Publish `BLOCKED — final snapshot re-verification failed`, retain useful findings as explicitly provisional, name the missing/mutated evidence, and request a new isolated freeze.
6. Never reconstruct or regenerate missing evidence in the shared checkout during an independent review; that creates a different candidate and crosses the no-edit boundary.

When a task explicitly names an expected machine-readable receipt (for example interaction verification), check its existence and manifest inclusion before expensive visual/runtime work. If absent, continue only when provisional findings are still useful; implementation readiness remains blocked.

## Minimal receipt fields

- manifest digest and listed-file closure at review start;
- final manifest digest and listed-file closure immediately before publication, or an explicit failed-finalization receipt;
- evidence classes inspected;
- runtime matrix count and exact viewports;
- document-overflow and undersized-target totals;
- intentional-rail classification;
- fixed-nav runtime clearance versus screenshot artifact;
- page-scale mechanism and large-text limitation;
- transition focus/heading findings;
- per-direction category-fit score;
- direction verdict, implementation verdict, and exact revision checklist.
