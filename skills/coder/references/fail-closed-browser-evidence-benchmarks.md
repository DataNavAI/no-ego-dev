# Fail-closed browser evidence and generated benchmark gates

Use this reference when a release task must publish browser artifacts and/or score a generated release candidate against frozen benchmark inputs before deployment.

## Browser evidence as an atomic artifact set

1. Treat screenshots, accessibility snapshots, performance traces, LCP, and transferred-byte measurements as one target result. Do not append a target to the publishable result set until every required artifact exists and is nonempty.
2. Start browser tracing before page creation/navigation. Stop it only after navigation, metrics, accessibility collection, interaction checks, and screenshot capture. A trace-stop failure must fail the target.
3. Require the complete closed target matrix before durable publication. Copy every screenshot and trace into one versioned artifact directory before replacing the Markdown/JSON pointer.
4. Serialize publication for the same release identifier with an atomic directory lock. Keep copy → temporary report write → atomic report rename → stale artifact cleanup inside the lock. Timeout fails closed and must never delete another process's live lock.
5. Make release namespaces readable but collision-resistant: sanitize an ASCII prefix, truncate it to a calculated byte budget, then append a digest computed from the complete unsanitized identifier. Preserve the complete digest suffix after truncation.
6. Calculate the longest real filesystem component, not only the namespace. Include separators, artifact labels, timestamp, PID, and extension. Test a very long identifier and conservative timestamp/PID widths against the 255-byte component limit.
7. Count transferred bytes fail-closed: include every same-origin response body, including repeated URLs and responses without `Content-Length`; do not deduplicate by URL. Conservatively reconcile body totals with Resource Timing.
8. Run concurrency regressions for both same-release publication and distinct identifiers whose readable sanitized labels collide.

## Privacy-safe browser evidence publication

Browser artifacts can leak machine-local identity even when screenshots and report prose look clean. Treat privacy as a publication gate, not a reviewer courtesy.

1. Before staging, scan every text/JSON/log artifact **and the contents of every archive** for absolute home/workspace paths, usernames, tokens, cookies, authorization headers, query secrets, and unexpected user-entered text. A repository-level text grep is insufficient because Playwright trace ZIPs can store absolute test paths in `trace.stacks`.
2. Prefer generation-time relative paths. If the recorder cannot avoid absolute paths, sanitize the archive entry deterministically before publication, preserve archive structure/metadata required by the trace viewer, and reject the bundle if the private prefix remains anywhere.
3. Normalize screenshot paths in machine-readable results to artifact basenames or release-root-relative paths; keep local evidence directories out of JSON and logs.
4. After any sanitation, recompute every affected artifact hash in `evidence.json`, regenerate checksum manifests, and verify all hashes from the repository root. Never retain a stale digest that describes the pre-sanitized bytes.
5. Re-open every trace archive, validate its expected entries, and scan decompressed members. Then verify report/registry symlinks remain contained within the evidence root and resolve to nonempty files.
6. Record privacy sanitation as an evidence transformation. It does not change candidate identity, but it **does** invalidate any review of the previous staged tree; freeze a new index tree and rerun integrity review.
7. If an objective product review holds the release while technical rows pass, preserve both truths: keep target-level automated PASS results, mark the overall candidate FAIL/BLOCKED, record the product findings, and do not let matrix success override the audience-seeded decision.

## Pre-deployment scoring of generated candidates

When frozen benchmark URLs point at production but the candidate is intentionally not deployed yet, add an explicit local generated-root input instead of pretending production HTTP contains the candidate.

- Preserve the exact frozen logical URLs, paths, cohort rows, and input hashes.
- Map each frozen path to a contained `index.html` beneath a validated generated root; reject missing files and traversal/containment failures.
- Record the inspection method truthfully (for example, `generated release-candidate HTML`) and keep network-fetched competitor rows labeled as signed-out GET evidence.
- Keep the local-root option explicit and opt-in. The default scorer behavior should remain the documented production/network behavior.
- Emit deterministic JSON/CSV schemas; configure CSV with `lineterminator="\n"` so regenerated evidence passes `git diff --check`.
- Regenerate benchmark JSON/CSV after every scorer semantic change or generated-product markup change. Passing totals from an older artifact are not evidence for the final scorer/output pair.

## Product-selector scoring must fail closed

Product-specific semantic selectors can improve a generic scorer, but they create false-success risks.

1. Detect **all** broad product markers (for example, `[data-artist-passport]`) and require exactly one where the page contract allows one. A missing marker on a product-source row, a duplicate marker, or a malformed marker must score missing/zero rather than fall through to generic keyword credit.
2. Scope every product selector to that validated marker. Never let a valid first root borrow About, names, roster, current, source, or action elements from another root elsewhere in the document.
3. Validate real content, not merely node presence. About/biography credit should come from nonempty fact-bearing `p`/`li`/`dd` content; a heading-only section must not pass. Optional names/roster nodes count only when their own text is nonempty.
4. Once a product marker/source kind is recognized, malformed product structure must score missing/zero for that dimension. **Never fall through to a generic keyword scorer.** This includes a product row with no marker at all when the generated product contract requires one.
5. Restrict product-selector credit to the product source kind so frozen competitor scoring does not drift.
6. For action/link dimensions, require the real semantic action—not nearby prose containing a keyword. Examples:
   - current utility requires a scoped HTTPS current-action anchor or the exact named honest-empty contract with its source and correction actions;
   - honest-empty source/correction actions must resolve to the exact canonical entity route (for example, `<canonical-path>/sources` and `<canonical-path>/correction`), not merely any URL whose path ends with `/sources` or `/correction`;
   - official/social credit requires a scoped HTTPS anchor with the expected action hook and an allowed official/social source type;
   - text such as “from official sources” must never count as an official link.
7. If honest scoring exposes a real missing product action, fix the renderer/model and test the visible product behavior instead of weakening the scorer. Re-run affected static/browser gates because benchmark work has now changed the product surface.
8. Test the valid positive fixture and hostile near-valid variants:
   - no product marker plus generic high-scoring keywords;
   - duplicate product markers where only one is valid;
   - missing or invalid discriminator attribute;
   - empty required section plus generic high-scoring keywords;
   - heading-only About plus a names marker;
   - empty optional selector nodes;
   - named empty state missing source/correction actions;
   - a product-shaped updates module outside the validated root;
   - source/correction links for an unrelated entity that only share the expected suffix;
   - current action with a non-HTTPS URL;
   - official-looking prose without a semantic official-action anchor.
9. Assert dimension state, score, evidence selector, and aggregate thresholds. Inspect the committed evidence rows to ensure credited actions point to the expected anchors rather than generic paragraphs.

## Generated renderer safety while adding benchmark-visible actions

- Reuse the renderer's existing validated model selectors (for example, a safe official-link projection); do not render raw registry fields solely to satisfy a scorer.
- Deduplicate biography/source and official-action URLs before rendering.
- Keep actions entity-scoped inside the product source section with stable semantic hooks and visible labels.
- Preserve hostile-runtime hardening already present in the renderer. If local arrays can run under inherited non-writable numeric properties, use the established own-property append helper rather than `Array#push`.
- Add a renderer-level RED→GREEN test before changing the scorer's expected product evidence.

## Verification sequence

1. Focused RED proves the old scorer/harness misses the required artifact or grants false credit.
2. Minimal GREEN implementation.
3. Focused positive and malformed-fixture tests, including action-without-anchor and structure-cardinality cases.
4. Generate the candidate into a temporary non-repository directory.
5. Run the explicit benchmark and assert all cohort thresholds, route counts, inspection methods, frozen hashes, and evidence-selector classes.
6. If benchmark honesty required a product-renderer correction, rerun prior affected static and browser suites; do not rely on pre-change evidence.
7. Run canonical tests and build; restore only known generated output.
8. Run `git diff --check`, stage exact authorized evidence/code paths, and complete the review-readiness receipt.
9. After commit, run one composite independent review at the same clean SHA. Any correction invalidates that verdict.

## Focused final read-only review

When the user requests a final pre-commit review, forbids modifications, and wants only realistic critical/important defects:

1. Review staged renderer/scorer/test changes first; treat large generated JSON/CSV diffs as outputs to validate programmatically rather than reading them linearly.
2. Probe official/action scoring with a compact adversarial matrix: valid scoped action passes; missing or duplicate root, out-of-scope action, non-HTTPS URL, unsupported source type, and keyword-only prose all score zero.
3. Check renderer output directly for one normalized URL occurrence per source/action, stable semantic hooks, escaped values, and no unsafe schemes. Include cross-collection dedupe (biography sources versus official links), not only dedupe within each input list.
4. Cross-check JSON and CSV row-for-row: unique row IDs, exact dimension score sums, evidence URLs, selectors/text, inspection methods, and frozen input hashes. Recompute cohort mean, median, minimum, and trust/utility subsets from the committed rows.
5. Judge threshold validity with headroom: gates set exactly at observed values are fragile; prefer a documented margin while still catching the intended regression.
6. Run only focused named tests plus syntax and diff checks. Avoid formatters, auto-fixers, in-place generators, staging, commits, and checks that create caches when “modify nothing” is literal.
7. If regeneration is necessary, write to a disposable temporary directory outside the worktree and compare in memory. Do not assume the default local generated directory matches the staged renderer—it may be stale or ignored, and a mismatch against stale output is not itself a defect.
8. Confirm `git status --short` is unchanged before returning exactly `APPROVED` or `REQUEST_CHANGES`. Every rejection must include a concrete reproduction with expected versus actual behavior; omit speculative and low-severity suggestions.
