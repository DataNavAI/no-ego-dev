# Static-generated profile card redesign

Use when a static/generated artist, creator, product, or entity profile page receives feedback that it has too many boxes, poor organization, one long all-in-one page, useless tabs, or too little visual/photo connection.

## Product pattern

1. **Make the main profile one primary object.** The default page should answer “who/what is this?” first. Prefer a single photo-led profile card (photocard, trading card, Pokémon-card-like, creator card, product card) over stacked info panels.
2. **Move secondary jobs into detail routes.** Replace tab rows and long inline sections with real linked subpages/routes for separate jobs such as `social`, `songs`, `schedules`, `media`, `members`, `reviews`, or `history`. Keep the main page focused.
3. **Use photos/visuals as identity, not decoration.** If verified/licensed photos exist, put them in the card hero. If real media is missing, use an explicit rights-safe visual gallery/collage/fallback that still lets users connect the page to the entity, and state the media gap in the final report.
4. **Remove useless tabs as markup.** Delete tab/button generation and stale JS/CSS hooks, not just visual styling. Detail routes should be regular anchors that work on direct load.
5. **Control static page explosion.** If every entity could generate many subpages, consider group/category-level detail pages for related individual profiles, then link individual profile cards to those group/category subpages.
6. **Preserve deep content and tests.** Move existing sections to focused detail pages rather than deleting them unless the user asked for removal.

## Implementation checklist

- Map the generator source, generated HTML, CSS, route writer, tests, and static verifier before editing.
- Add route builders/helpers for profile main page and detail pages.
- Main page assertions should check for card classes and route-card links, and negative assertions for old inline heavy sections.
- Detail page assertions should check each moved section still exists and direct-loads.
- Regenerate output and verify representative main/detail pages in generated files.
- Browser-check both local path context and production path context; some static servers expose generated routes under a `/product/...` prefix locally even when production canonical URLs are root-level.

## Verification evidence to report

- The exact screenshot or user feedback artifact inspected before editing.
- Source files changed: generator, tests, static verifier, generated output, and design/product decision note if created.
- Commands: generator, syntax check, tests, build/static verifier, diff check.
- Local mobile screenshot of the redesigned main card and at least one focused detail page.
- Production HTML probe confirming main page lacks old inline sections and detail routes contain the moved content.
- Production mobile screenshot confirming the card-first layout.
