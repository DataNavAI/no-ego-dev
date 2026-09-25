# Visual-First Review Deck Validation

Use this reference when a UI/UX proposal must be reviewed as a visual presentation rather than a verbose specification.

## Presentation contract

1. Put a compact metadata header first, followed immediately by a contact sheet or thumbnail index.
2. Use one slide-like section per direction, screen, or material state.
3. Each section should contain a dominant screenshot/prototype frame (or desktop/mobile pair), a short title, no more than three concise bullets or about 75 words, and one explicit decision prompt.
4. Use visual state strips and annotated frames where they communicate behavior faster than prose.
5. Move research, design tokens, full annotation legends, and implementation detail to a linked canonical brief or appendix.
6. If concrete visuals are unavailable, keep the design decision `BLOCKED`; do not replace the missing artifacts with a longer narrative.

## Link-integrity preflight

Before publishing the rendered deck:

1. Enumerate every relative Markdown link and fragment in the source deck.
2. Verify each destination file will exist at the deck's final relative location.
3. Verify each `#fragment` matches a heading the destination template actually generates.
4. Apply the renderer's anchor convention. For GitHub Markdown, normalize the heading to lowercase, remove punctuation, and replace spaces with hyphens; account for duplicate-heading suffixes when present.
5. Render the deck and click every appendix/navigation link.
6. Add paired regression assertions for both sides of important links: the source deck contains the expected path/fragment, and the destination template contains the corresponding heading. Also reject known stale fragments.

## Regression matrix

| Case | Expected result |
|---|---|
| Contact sheet appears after compact header | Pass |
| Long narrative precedes first visual | Fail |
| Direction has dominant visual + concise decision prompt | Pass |
| Prose describes a direction with no viewable artifact | `BLOCKED` |
| Appendix link points to a generated canonical heading | Pass |
| Link fragment has no matching heading | Fail |
| Detailed implementation notes live in linked brief/appendix | Pass |
| Accessibility, annotations, and state coverage are removed to reduce prose | Fail |

The visual deck is the decision surface; the linked brief remains the implementation source. Concision must not remove accessibility requirements, interaction annotations, responsive behavior, state coverage, or engineering acceptance criteria.
