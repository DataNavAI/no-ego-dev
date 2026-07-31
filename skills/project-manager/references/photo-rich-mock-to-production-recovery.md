# Recovering Photo-Rich Mock Fidelity in Production

Use this when an accepted mock is photo-led but the implementation ships sparse, abstract, or fallback-only visuals.

## Principle

Treat missing requested photography as a product-fidelity gap, not cosmetic polish. Do not silently replace an approved photo-first direction with gradients, silhouettes, initials, or generic illustrations. Keep visual approval, media/publication eligibility, implementation, and QA as separate gates.

## Evidence-first diagnosis

1. Inspect the accepted mock’s runnable source, clean screenshots, media manifest/receipts, and design-review decisions.
2. Inspect the production renderer, static builder, public-boundary scanner, release contract, and live URL.
3. Identify the exact reason photos disappeared: absent data model, blanket raster prohibition, review-only disposition, missing license/attribution, build omission, or rendering regression.
4. Quantify the visual contract by route and role rather than saying “add more images”: hero, lesson portrait, challenge image, discovery card, update card, result art, fallback.

## Decompose the correction

Create dependency-ordered children rather than one broad “add pictures” task:

1. **Media eligibility and deterministic asset boundary**
   - closed cohort;
   - source/license/creator/attribution/rights disposition;
   - exact source and derivative hashes;
   - bounded dimensions/bytes/MIME;
   - deterministic public filenames;
   - fail-closed rejection of unlisted, review-only, malformed, traversal, symlink, wrong-hash, and private-path assets.
2. **Photo-rich UI integration**
   - map every approved mock placement to a production component/route;
   - preserve aspect ratio, focal crop, alt text, loading priority, responsive behavior, fallback, credits, and primary-action hierarchy;
   - never present stock people or generated celebrity lookalikes as the real subject.
3. **Independent visual/media QA**
   - immutable candidate;
   - mobile and desktop screenshots;
   - expected photo-role counts;
   - zero broken image requests/elements;
   - layout containment and fixed-navigation clearance;
   - exact attribution-to-rendered-asset correspondence;
   - public scan proving no mock/review/private/unmanifested media leakage.

Update the parent objective, child hierarchy, native dependencies, counts, acceptance criteria, and `STATUS.md` when the correction changes milestone truth.

## Continuous execution while reviews run

A pending asynchronous review blocks only the reviewed branch’s merge or production deployment. It should not idle the project when another dependency-safe, non-overlapping child in the same active milestone can proceed in its own branch/worktree. Keep one merge owner, preserve immutable review heads, and do not combine branches merely to appear busy.

Before dispatching parallel work, prove:

- no shared files or generated-output ownership conflict;
- no dependency on unmerged behavior;
- no external side effect requiring the pending verdict;
- separate branch/PR/test evidence;
- late review findings will still be consumed and can stop that branch’s merge.

## Common failure modes

- Assuming “licensed on Commons” equals production approval without preserving the exact license and attribution contract.
- Keeping a blanket raster ban after the product direction explicitly requires photography, instead of replacing it with a closed manifest-bound allowlist.
- Copying review assets directly into production while their disposition remains `NOT_APPROVED` or review-only.
- Calling abstract fallback art “pictures” after the user explicitly asked for photographs.
- Waiting idle for one reviewer even though an independent milestone child is safe to start.
- Adding photo files without matching build-manifest, cache/MIME, public-boundary, credits, browser, and broken-image tests.
