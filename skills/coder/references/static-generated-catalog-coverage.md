# Static-generated catalog coverage expansions

Use this when a static/generated product has an entity catalog that users say is incomplete, e.g. idol/group/profile databases, creator directories, place lists, or product indexes.

## Workflow

1. **Separate catalog source from generator code.** Move broad entity lists into a durable data file (for example `data/<domain>-catalog.json`) instead of hardcoding them in a generator. Keep generated pages reproducible from source data.
2. **Define pragmatic coverage, not a false universal claim.** If the user says “all”, expand to a broad, useful catalog and state the concrete coverage count. Avoid claiming true exhaustiveness unless backed by an authoritative source and update pipeline.
3. **Generate every required surface.** For each entity, regenerate profile routes, alternate artist/group routes, directory listings, sitemap entries, and search/index JSON. Directory pages should expose the full catalog, not only a small “popular” slice, unless pagination/search is implemented.
4. **Add a catalog validator.** Check minimum coverage thresholds, required anchor entities/groups, duplicate slugs, missing names, and empty groups. Wire it into `npm test` or the equivalent project test command so future refreshes cannot silently shrink coverage.
5. **Avoid fake precision.** Do not fabricate birthdays, positions, rankings, official links, photos, or biographical facts to make generated profiles look complete. Prefer neutral placeholders such as “member profile”, “fan updates”, or “source details welcome”; add verified facts only when a source pipeline provides them.
6. **Keep existing content/link validators compatible.** If a prior validator only covered social links for curated groups, validate those canonical links directly rather than forcing every newly covered catalog entry to have full official-link metadata.
7. **Verify locally and in production.** Run syntax checks, catalog validator, full tests, build/static verification, then deploy and check production JSON counts plus representative new routes.

## Verification examples

- Catalog validator prints concrete counts: `{ ok: true, groups: 88, idols: 587 }`.
- Generated page count increases as expected.
- Production JSON count check confirms the live catalog size.
- Representative newly added routes return 200, including both group and idol pages.
- No synthetic-fact fields remain populated in production JSON when the source does not verify them.

## Pitfalls

- Broad generated catalogs can create huge diffs. This is acceptable when pages are checked in, but the commit message and final report should summarize counts and verification instead of narrating file-by-file changes.
- Full-directory rendering can make pages long. That is better than hiding newly added coverage behind inaccessible generated routes; add pagination/filtering later if performance or UX demands it.
- A successful route is not enough: check search/index JSON and sitemap too, because discovery often depends on generated metadata rather than direct URLs.
