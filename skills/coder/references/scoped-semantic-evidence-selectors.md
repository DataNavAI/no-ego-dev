# Scoped semantic evidence selectors

Use this pattern when a quality or benchmark scorer records DOM evidence for entity-scoped product semantics.

## Core rule

A score is not auditable unless its selector resolves to the same element and exact text that earned the score. Do not record a generic selector such as `h1` when the scored heading lives inside a validated product root; an unrelated earlier heading can make the evidence contradict the scorer.

## Workflow

1. Validate the unique semantic root first (for example, exactly one `[data-artist-passport]`).
2. Resolve identity, facts, actions, and empty states only inside that root.
3. Emit root-scoped evidence selectors such as `[data-artist-passport] h1` rather than page-global tag selectors.
4. Add both controls:
   - a valid root with an unrelated matching or mismatching global element before it;
   - an invalid root whose global title/heading appears valid.
5. Assert both score behavior and evidence integrity:
   - invalid scoped identity cannot receive semantic credit from title/global headings;
   - `document.querySelector(recordedSelector)` resolves the recorded element;
   - resolved normalized text equals `evidence.exact_text`.
6. Regenerate all persisted JSON/CSV evidence after changing selectors or evidence notes, even when numeric scores do not change.
7. Recheck row counts, dimension sums, JSON/CSV parity, thresholds, and frozen input hashes.
8. Treat any post-review artifact regeneration as a new staged tree: rerun focused verification and re-review before commit.

## Common pitfall

Testing only that malformed pages score zero misses false evidence on valid pages. A valid scoped H1 can earn the correct score while a generic `h1` evidence selector resolves an unrelated outside heading. Always test selector resolution independently of scoring.
