# Adversarial Publication-Boundary Review

Use this checklist when untrusted content is normalized, projected, selected, and rendered through multiple model boundaries.

## Closure across lossy projections

1. Validate the **original record** at the final trust policy before creating any compact/publication projection.
2. Validate the projection separately, but never let projection erase evidence that would have rejected the original.
3. Enumerate every redundant representation of authorizing data (top-level URL, all receipt entries, action URL, publisher origin). Require byte-exact agreement where the contract says they describe one resource.
4. Define exact or allowlisted shapes for nested provenance containers:
   - receipt array cardinality and own keys;
   - receipt object own data keys;
   - action object allowlisted own data keys;
   - no symbol, sparse, named-extra, custom-prototype, inherited-extra, or accessor-backed provenance.
5. Test the public selector/page model/server projection, not only the low-level validator. Assert hostile getters are never invoked.
6. Preserve deliberate prototype-pollution regressions: an own index may safely shadow an unrelated inherited value, while inherited extra receipt indexes/provenance names must reject. Do not replace this distinction with a blanket “prototype changed” rule.
7. Put one no-throw wrapper around the exported publication boundary. A preliminary type guard is insufficient: `Array.isArray()` can throw for a revoked proxy, and a stateful proxy can begin throwing only after several successful descriptor reads. Probe null, primitives, arrays, revoked proxies, and late-throwing descriptor traps; all must return rejection rather than escape an exception.
8. Close the top-level record as well as nested receipts. Prefer a closed-world own-key allowlist for the complete accepted content schema; URL-name matching alone misses aliases such as `alternateReceipt`, `alternateSource`, and `actionReceipt`. Reject symbols and every unknown own key before projection can erase it. If the public model legitimately adds navigation `href`, allow only an explicitly named, own-data, root-relative internal path; external or protocol-relative values still reject.
9. At compacting server/CMS boundaries, gate the original record **before** compaction and gate the compact result again. The first gate catches hidden secondary provenance; the second proves the exact public shape remains publishable. Do not read `item.publishStatus`, `item.verificationStatus`, or any other field before the protected gate: null, revoked proxies, and throwing `get` traps can escape first. After the protected gate, require status fields through own data descriptors, not ordinary property access, and wrap the collection boundary so one malformed row yields rejection rather than an endpoint failure.
10. Inventory every legitimate projection-owned field before enforcing the closed schema. Ranking metadata such as `rank`/`rankReason` is not provenance but still needs an explicit allowlist entry; test the actual public API response by passing each returned item through the exported publication gate. This prevents a security fix from silently emptying a valid home/CMS feed.
11. Pair each original-record smuggling regression with selector/page-model and server/CMS assertions. Unknown fields must reject before projection, and the projected output must independently remain valid; a projection that merely drops the hostile field is laundering, not sanitization.

## Adversarial text equivalence classes

Do not add one regex per reported headline. Build a matrix by class:

- subject order: target first and target second;
- case: original, lower, upper, mixed;
- separators: words, comma, plus, ampersand, slash, pipe, colon, semicolon, ASCII/en/em dash, with and without spaces;
- alias syntax: punctuation-heavy names and ASCII/curly possessives;
- framing: announce, release, collaboration, duet, featuring, team-up;
- valid controls: single-artist title separators followed by action or editorial wording.

Every unsafe probe needs a nearby valid control. A separator rewrite that rejects cross-artist text but also rejects `Artist—releases a new album` is not complete.

For ambiguous dash syntax, classify the segment adjacent to the known alias rather than blindly rewriting every dash as coordination. Extract the candidate counterpart phrase before an announce/release/collaboration action word. Treat reviewed known names and short multi-token non-descriptor phrases as likely counterpart identities, while keeping agency/editorial descriptors (`pop icons`, `global superstars`, `Example Music`) as explicit valid controls. Include known names that contain descriptor-like articles (`The Weeknd`) as named controls so a generic-word allowlist cannot launder them. This remains a conservative heuristic, not entity recognition; keep catalog-backed identity checks as an independent layer and expand unsafe/valid pairs together rather than broadening one side alone.

## Complexity and bounds

Any algorithm that scans separators and repeatedly slices/normalizes the title can become quadratic. Enforce a practical title-length bound **before** separator analysis, then benchmark just below and above that boundary. The over-limit path must fail closed without running the expensive classifier.

## Review convergence

After each reviewer finding:

1. reproduce the exact defect;
2. add the entire equivalence class plus valid controls;
3. rerun focused, canonical, browser, and build gates;
4. restore generated output;
5. freeze/stage one exact snapshot and re-review it.

If a review finds a blocker, all sibling verdicts remain useful diagnostics but cannot authorize commit/build. Any edit invalidates every prior verdict for immutable purposes.
