# Exact-tree visual product re-review

Use when a reviewer receives a detached Git tree containing candidate-bound screenshots and action receipts, especially after evidence plumbing changed but the product/runtime is claimed to be unchanged.

## Bind the target without touching the checkout

1. Locate the repository that actually contains the supplied object; do not treat the current directory as the candidate merely because it has a related project name.
2. Require `git cat-file -t <tree>` to return `tree`.
3. Record `HEAD` and `git status --porcelain=v2` before review. If the live index does not match, review the supplied tree directly with `git show <tree>:<path>` and `git ls-tree`; do not reset, checkout, or stage it.
4. Identify the nearest coherent baseline by changed-path scope when needed, but bind every review conclusion to the supplied tree—not the live worktree.

## Compact carry-forward for checksum-frozen directories

When the input is a read-only checksum-frozen directory rather than a Git tree, and the task explicitly permits confirming an earlier visual verdict unchanged:

1. Verify the new manifest's pinned digest, exact entry count, every listed checksum, independent filesystem closure, and read-only state before semantic review.
2. Compare the earlier and current candidates by relative path plus file digest. Report changed common files, additions, removals, and the exact unchanged count.
3. Classify the rendering boundary explicitly: HTML, CSS, client/runtime code, media assets, screenshots/contact sheets, render receipts, and interaction/accessibility receipts. A carry-forward verdict is allowed only when every file in that boundary is byte-identical and the earlier verdict was bound to those exact bytes.
4. Inspect changed non-rendering files semantically. Do not call a change “evidence-only” merely because its filename is documentation or a manifest; confirm it cannot alter pixels, behavior, accessibility semantics, or runtime data.
5. Corroborate representative served HTML/JS/CSS/media hashes against the current candidate and verify the listener/access boundary. If runtime bytes differ, stop carrying forward and perform a fresh product review.
6. Keep unresolved prior blockers unresolved unless the new candidate adds direct evidence for them. Root-text stress and CDP page scale, for example, do not close a genuine browser-menu zoom gate.
7. Re-run full visual inspection whenever any rendering-boundary byte changed, the previous review was not immutable/candidate-bound, evidence contradicts itself, or the user requests a fresh review rather than compact carry-forward.
8. Repeat complete manifest/filesystem/read-only closure after the sole authorized external report write.

Equal hashes establish identical bytes, not that an earlier review was sound. Carry-forward depends on both byte identity and a trustworthy immutable baseline verdict.

## Review the product evidence, not just its plumbing

1. Read the audience/persona and CUJ contract from the exact tree.
2. Parse the candidate report and representative action receipt. Confirm release digest, source SHA, deployed origin, interfaces, states, and action outcomes agree.
3. Recompute every representative checksum from exact tree blobs in memory. Do not trust a manifest or `PASS` counter alone.
4. Visually inspect every representative screenshot from the frozen blobs. Cover desktop and mobile for each requested state; assess identity clarity, information hierarchy, truthful empty/current utility, source/correction/follow affordances, and remaining friction.
5. If the vision interface requires a pathname, materialize only temporary derived review images outside the repository, preferably contact sheets built directly from `git show` bytes. Delete them before the final preservation check. Never add them to the candidate tree.
6. Do not infer visual identity from equal hashes alone. Equal hashes prove identical bytes; unequal hashes may reflect timestamps, fetched content, or encoding changes and therefore require fresh visual review.
7. Compare machine-readable receipts with the screenshots. Record semantic contradictions—such as a receipt calling a state empty while the screenshot is populated—separately from product quality. An evidence-plumbing defect does not automatically lower the product score when the exact visible runtime is useful, but it remains an integrity/spec-review finding.
8. When safe and read-only, corroborate the deployed health endpoint and representative route HTTP status. Treat source revision/cohort health as live corroboration; use durable deployment evidence for the exact immutable image digest when the health endpoint does not expose it.

## Scoring and verdict

- Begin with the requested numeric score and verdict vocabulary, for example `8/10 — PASS`.
- Preserve a prior product score only after independently re-inspecting the exact current screenshots and action evidence. Do not rubber-stamp the earlier verdict because filenames or product claims are unchanged.
- Keep product blockers separate from evidence-integrity blockers. Placeholder art, long mobile pages, clipped navigation, or technical source labels may be non-blocking friction; unresolved entity ambiguity, cross-artist leakage, dishonest empty/current states, or broken source/follow/correction actions are product blockers.
- Report exact tree, release digest, reviewed interfaces/states, checksum results, live corroboration, notable evidence contradictions, and files modified (`none`).

## Preservation closure

Remove temporary review artifacts and stop temporary servers. Re-run `git rev-parse HEAD`, `git cat-file -t <tree>`, and `git status --porcelain=v2`; require the checkout state to match the initial snapshot before issuing the verdict.