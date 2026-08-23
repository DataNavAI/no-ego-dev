# SEO Tooling and Data Sources

Use this reference to select maintained evidence sources before building custom SEO infrastructure. Access, products, quotas, and interfaces change; confirm current official documentation before implementation.

## First-party search and analytics

| Need | Adopt/configure first | Notes |
|---|---|---|
| Google query/page performance | Google Search Console Performance report and Search Analytics API | Segment by query, page, country, device, date, and search appearance where available. Aggregation/privacy limits mean totals and rows may not reconcile perfectly. |
| Google URL/index diagnosis | Search Console URL Inspection and Index Coverage/Page indexing reports | URL Inspection is representative evidence, not a bulk guarantee of indexation. Request indexing only when authorized and appropriate. |
| Bing query/index data | Bing Webmaster Tools and available APIs/exports | Useful second-engine evidence, crawl diagnostics, sitemaps, and URL inspection. |
| User and conversion outcomes | Existing analytics (for example GA4), product analytics, CRM, and server-side conversion records | Validate consent, attribution, bot filtering, event definitions, and release annotations before comparing. |
| Demand direction | Google Trends | Relative indexed interest, not absolute search volume. Record geography, category, search type, and window. |
| Paid-search query planning | Google Ads Keyword Planner when authorized | Estimates depend on account/settings and are not guaranteed organic traffic. |

Official anchors:

- Google Search Essentials: `https://developers.google.com/search/docs/essentials`
- SEO Starter Guide: `https://developers.google.com/search/docs/fundamentals/seo-starter-guide`
- Helpful, reliable, people-first content: `https://developers.google.com/search/docs/fundamentals/creating-helpful-content`
- Search spam policies: `https://developers.google.com/search/docs/essentials/spam-policies`
- Search Console performance data: `https://support.google.com/webmasters/answer/7576553`
- Search Analytics API: `https://developers.google.com/webmaster-tools/v1/searchanalytics/query`
- URL Inspection API: `https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect`
- Search Console API usage limits: `https://developers.google.com/webmaster-tools/limits`
- Bing Webmaster Tools: `https://www.bing.com/webmasters/about`
- Google Trends: `https://trends.google.com/trends/`

## Crawl, render, and technical validation

Prefer project-existing tools. Common maintained options include:

- browser DevTools, Lighthouse, PageSpeed Insights, and Chrome UX Report for lab/field performance;
- framework build output and route manifests;
- project crawlers such as Screaming Frog/Sitebulb when licensed;
- open-source crawlers/auditors such as Lighthouse CI, Unlighthouse, and crawler libraries when their maintenance/security fit is verified;
- Schema Markup Validator and Google Rich Results Test for structured data;
- server/CDN logs for searchbot access patterns when privacy and retention permit.

Official anchors:

- Core Web Vitals: `https://web.dev/articles/vitals`
- PageSpeed Insights: `https://pagespeed.web.dev/`
- JavaScript SEO basics: `https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics`
- robots.txt: `https://developers.google.com/search/docs/crawling-indexing/robots/intro`
- sitemaps: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview`
- canonicalization: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- redirects/site moves: `https://developers.google.com/search/docs/crawling-indexing/301-redirects`
- structured data: `https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data`
- Schema.org: `https://schema.org/`

## Rank tracking and third-party keyword tools

Use an existing licensed rank tracker before creating one. Freeze query, location, language, device, search engine, SERP-feature handling, and observation time so trend lines are comparable. Respect provider terms and query limits.

Third-party volume, difficulty, traffic potential, backlink, and authority metrics are provider-specific estimates. Record provider/date/database/location and never blend them as if they were first-party facts. Avoid automated direct search-result scraping when it violates applicable terms or access controls.

## Custom adapter decision

Build or wrap an API only when all are true:

1. the recurring decision cannot be supported by an existing export/dashboard;
2. the user authorized account/API access;
3. secrets can stay outside repositories and reports;
4. quotas, pagination, retries, data retention, privacy, and ownership are documented;
5. deterministic tests cover filters, date boundaries, aggregation, partial data, rate limits, and redaction;
6. the adapter has an operator and retirement path.

Do not create a custom crawler, warehouse, or rank tracker merely to appear thorough.
