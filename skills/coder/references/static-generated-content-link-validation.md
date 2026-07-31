# Static Generated Content Link Validation

Use this when a static/generated product renders outbound content links such as social profile buttons, source links, official sites, media links, or creator/artist pages.

## Trigger examples

- User reports a visible outbound link opens a generic search, wrong source, placeholder, photo-credit page, or internal fallback.
- Generated profile/entity pages include social buttons (`Instagram`, `YouTube`, `Official`, etc.).
- A content refresh or scraper may overwrite generated pages and regress links.

## Implementation pattern

1. Fix link data at the generator/data source layer, not only in generated HTML.
2. If the link map is more than a tiny constant, extract it to a versioned data catalog such as `data/<product>-social-links.json` instead of burying it in the generator. Keep the generator responsible for rendering and validation, not for maintaining long canonical URL tables.
3. Prefer canonical official addresses over searches or inferred URLs:
   - Group-level social map for group pages and member fallbacks.
   - Idol/member override map only when a known personal account exists.
   - No generic search URLs for visible social buttons.
4. Add fail-fast generator validation for required link coverage. For example, every group rendered with social buttons should have `instagram`, `youtube`, and `official` entries; missing coverage should throw during generation/tests rather than silently render fallbacks.
5. Keep profile JSON-LD `sameAs` sourced from the same link helper so SEO/social metadata matches visible buttons.
6. Regenerate static pages after generator/data changes.
7. Add route-level tests for at least one reported entity and one group fallback:
   - Expected absolute HTTPS hrefs are present.
   - Generic search URLs, photo-credit domains, and internal fallback URLs are absent from social buttons.
8. Add a deterministic validator script for periodic checks. It should:
   - Fetch selected production routes.
   - Extract the social/link block.
   - Assert required labels exist.
   - Assert links are absolute HTTPS URLs.
   - Reject known wrong/generic patterns (`instagram.com/explore/search`, `youtube.com/results`, photo-credit pages, `/submit`).
   - Build route URLs with `new URL()` or equivalent path joining so `BASE_URL=http://localhost:8080/product` plus route `/entities/example` resolves to `/product/entities/example`, while production custom-host validation still resolves to `/entities/example`.
9. Schedule the validator in the repo CI/workflow when the repository owns GitHub Actions. For operational alerting, a script-only Hermes cron is also useful: stay silent on success, emit only failures.

## Verification

- `node --check` generator and validator scripts.
- Run full repo tests after regeneration.
- Run validator locally against the local path/host and against production after deploy.
- Browser-check the reported route and inspect actual `href` values, not just visible button text.
- Confirm scheduled validator exists and run it manually once after creation.

## Pitfalls

- `Official` must not point at an image credit/source URL. Photo credits are content attribution, not artist official sites.
- `Instagram`/`YouTube` buttons should not be search result URLs; users expect account/channel pages.
- Static hosts may have a local prefix (`/product`) while production custom host does not. Make validator base URL configurable so local and production validation both work.
- Avoid saving scratch screenshots/probe output in the repo; keep temporary evidence outside git.
