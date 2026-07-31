# Static-generated app to live CMS rearchitecture

Use when a static-generated product is corrected toward a live CMS/app platform, but a full framework rewrite (for example Next.js) would add risk before the first validated slice.

## Pattern

1. **Confirm the exact target product/version first.** If multiple variants/repos exist (v1/v2, prototype/live, old/new), inspect the active production URL, local repo, branch, and recent user correction before editing. Cancelled variants must not receive new feature work.
2. **Persist product comments/decisions durably.** Create a concise project doc that records the reviewed feedback/comments and the resulting architecture decisions. Redact private doc IDs/URLs in versioned docs.
3. **Keep the static shell, add live APIs first.** Reuse the existing Node/App Runner runtime when available. Add `/api/<product>/cms/*` endpoints for home, content search/list, artists list, and artist detail before considering a framework migration.
4. **Use database as source of truth with static fallback.** Read DynamoDB/CMS tables when configured; fall back to generated JSON when tables/env are absent or temporarily unavailable. Include response `source`/`mode` fields so health and tests reveal whether production is truly live.
5. **Configure media storage explicitly.** Add an S3/media bucket parameter/env var and expose only safe booleans/base URLs in health/API responses. Never print account IDs, credentials, or signed URLs.
6. **Rework visible app surfaces to consume live APIs.** Replace old queue/starter/static-copy pages with a SPA/live platform shell that fetches the CMS APIs, renders content cards and artist sections, and emits analytics for the live view.
7. **Wire infra and CI smoke checks.** Pass new table/bucket config through deployment templates/workflows, grant scoped DynamoDB/S3 permissions, and smoke test the public CMS endpoint plus the SPA shell in CI.
8. **Verify all layers.** Run syntax checks, CloudFormation/template validation, generated build verification, tests, deploy workflow watch, live API probes, and browser/visual verification of the production page.

## Pitfalls

- Do not implement on a cancelled alternate repo just because it contains newer architecture work. The user's latest version correction wins.
- Do not jump straight to a Next.js rewrite unless the first live-CMS slice requires it. A minimal live API + SPA shell can validate the product architecture faster.
- Do not leave static/generated assertions expecting old page names like “Queue Search” after the product concept changes; update static verifiers to match the new live platform language.
- Do not claim “live CMS” from generated JSON only. API payloads should say `static-fallback` unless DynamoDB/CMS reads are configured and succeeding.
