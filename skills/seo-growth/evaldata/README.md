# SEO growth eval fixture

CloudLedger is a fictional B2B SaaS website for finance teams in the United States and United Kingdom. The evaluated response must act like an evidence-driven SEO owner, not a generic copywriter.

## Business and site context

- Product: automated financial-close workflow software.
- Primary conversions: qualified demo request and trial signup.
- Secondary conversions: template download and integration-documentation engagement.
- Stack: Next.js with a normal pull-request, CI, preview, and production deployment workflow.
- Pages: homepage, pricing, product pages, integration pages, competitor comparisons, downloadable templates, blog posts, and documentation.
- Markets: US and UK English; desktop and mobile users matter.

## Available evidence

- Google Search Console export with query, page, country, device, impressions, clicks, CTR, and average position.
- GA4 organic landing-page sessions, engagement, demo requests, trials, and template downloads.
- Fixed rank tracker with explicit query, location, language, device, and observation date.
- Read-only Bing Webmaster Tools.
- Repository and production crawl/render access.
- No paid enterprise keyword-tool subscription; third-party volume or difficulty values must not be invented.
- The Search Console API/export credential is not available to the runner, but an already authenticated browser profile may have access. The runner must test the exact CloudLedger property and relevant Performance or URL Inspection view in that browser before declaring Search Console unavailable, without exposing cookies or credentials.

## Illustrative observations, not universal truths

- `/product/close-management` earns impressions for “automated month end close” but often ranks between positions 8 and 16.
- `/templates/financial-close-checklist` and `/blog/month-end-close-checklist` both receive impressions for “financial close checklist,” creating possible cannibalization.
- `/compare/competitor-a` gets low-volume but high-conversion non-brand visits.
- Several integration pages are three clicks deep and have weak contextual internal links.
- A legacy blog template emits a canonical to the blog index for some posts.
- Search Console data is delayed; recent release and seasonal quarter-end demand can confound short-window comparisons.
- Production verification must sample representative route classes rather than treating one healthy page as site-wide evidence: home, pricing/product, integration, comparison, template, blog, and documentation. Record omitted classes explicitly.
- A proposed future `/news/` product would aggregate changing third-party items. Durable opaque item identity, item-level redirect/tombstone behavior, retention/deletion policy, and indexability state apply if that dynamic aggregation product is implemented; they are not generic requirements for CloudLedger's ordinary static marketing pages.

A passing plan must turn this evidence into a durable baseline, keyword-to-page map, technical/content implementation sequence, production verification, and recurring query-page monitoring loop. It must prefer improving suitable existing pages, justify any new page, and distinguish measured facts, estimates, and hypotheses. It must also keep three states explicit: what is only planned, what production crawl/render evidence proves is implemented and crawlable, and what delayed Search Console/analytics/rank evidence actually measures as performance.
