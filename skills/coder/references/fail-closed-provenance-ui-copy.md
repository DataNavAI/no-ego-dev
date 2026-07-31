# Fail-Closed Provenance UI Copy

Use this reference when a generated profile/detail UI must show source-backed cards, biographies, relationship labels, or repeated outbound providers without presenting inferred or ambiguous text.

## Current-item receipts

Treat the first source receipt as authoritative provenance and any CTA/action URL as a separate optional action.

- Require a standard bounded `sourceUrls` array with an exact first own-data record such as `{url, label, type, verifiedAt}`.
- Require a safe HTTPS URL, trimmed bounded control-free label/type, canonical UTC `verifiedAt`, and exact equality between `item.lastVerifiedAt` and the receipt timestamp.
- Use a finite `contentType`→visible-label map. Never humanize arbitrary caller/source strings.
- A valid action URL cannot rescue a missing, malformed, accessor-backed, extra-key, or timestamp-mismatched receipt.
- Project every receipt field required by downstream validation/rendering; forgetting one field can silently turn valid production cards into empty states.
- Render the source label, mapped content type, checked date, and an anchor to the receipt URL. Do not label an action URL as the source.
- Test one real production-shaped outlet receipt plus table-driven missing/blank/oversized/HTTP/accessor/extra-key/mismatched-timestamp/unknown-content-type cases, requiring zero getter calls.

## Biography reuse across root and About

A biography is one reviewed claim shown in two interfaces.

1. Build one verified biography projection with text, exact sources, and checked timestamp.
2. Render root Profile and About receipts through the same claim-scoped helper and label (`Profile`).
3. If receipt markup cannot be produced, omit the biography text from About and show only the specified named-empty state.
4. Compare the receipt fragments in tests rather than merely asserting both pages contain generic source words.

## Repeated official providers

Repeated Instagram, YouTube, or website rows need distinct truthful labels without inventing account purpose, geography, or ownership.

1. Validate and URL-dedupe rows while preserving registry order.
2. Count valid rows by provider kind.
3. Keep the established short provider label when unique.
4. When duplicated, extract only bounded URL-native identifiers without decoding:
   - Instagram exact safe path → `@handle`;
   - YouTube `/@handle` or `/channel/ID` → that exact identifier;
   - website → parsed hostname.
5. If identifiers are absent, unsafe, or collide, label every duplicate of that provider deterministically as `Provider link N`.
6. Apply the same distinct text to the anchor's accessible name. Assert visible and accessible labels are pairwise unique for real repeated-provider entities.
7. Read hostile records descriptor-safely; never invoke accessors merely to derive labels.

## Scoped partial-data copy

When publication intentionally omits unknown evidence, headings must not imply completeness. Use product-approved language such as “Reviewed current member records” and “Reviewed former member history,” with matching reviewed-empty copy. Do not promote unknown rows or claim an exhaustive roster.

## Efficient strict-TDD sequence

For a multi-finding final remediation, preserve vertical cycles and verification headroom:

1. Inventory every finding and identify shared fixtures/helpers before editing.
2. Complete one focused RED→GREEN slice end to end.
3. Immediately update shared valid fixtures for any newly required exact field; otherwise unrelated tests fail for the wrong reason.
4. Run the focused slice after each production patch. Do not accumulate several unexecuted model/renderer/data changes.
5. Batch only independent reads and coherent atomic patch hunks. Avoid dozens of tiny patch calls when one exact multi-file patch is safe, but never trade away intermediate GREEN checkpoints.
6. Before starting the next finding, record current failures and remaining required commands. Reserve enough execution budget for the whole feature file, canonical test/build, generated-output restoration, diff review, and exact staging.
7. If execution budget becomes constrained, stop adding behavior. Run syntax/focused verification, report the exact incomplete state, and do not stage or claim completion.
