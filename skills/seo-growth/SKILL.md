---
name: seo-growth
description: Use when a website needs evidence-based organic search growth. Researches high-potential queries, maps them to the best existing or justified new pages, implements technical and on-page improvements, verifies indexability and rendered output, and iterates from rankings, Search Console, analytics, and conversion evidence without search spam or fabricated metrics.
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, seo, organic-growth, search-console, content, analytics]
    related_skills: [marketer, product-manager, coder, qa, devops, ui-designer, english-copywriter]
---

# SEO Growth

## Overview

Own the complete organic-search growth loop for a website:

```text
understand business and audience
→ establish crawl/index/performance baseline
→ find query demand and existing search traction
→ map each target query cluster to one intentional page
→ implement technical, content, internal-link, and SERP-snippet improvements
→ verify production rendering and indexability
→ monitor query-page cohorts, rankings, traffic, engagement, and conversions
→ keep, improve, expand, merge, or roll back from evidence
```

The goal is qualified organic traffic that helps users and advances a real product outcome—not ranking screenshots, bulk pages, or traffic disconnected from activation, revenue, leads, retention, or another declared conversion.

## When to Use

Use this skill when:

- a user asks to improve, boost, recover, design, implement, or monitor a website's SEO;
- existing website pages need high-potential search queries and target-page assignments;
- rankings, impressions, clicks, click-through rate, organic conversions, crawlability, indexation, Core Web Vitals, or structured data need diagnosis;
- a content, migration, redesign, localization, or programmatic-page initiative needs an SEO strategy and measurement loop;
- prior SEO changes need ranking and business-impact review.

Do not use it to guarantee rankings, manipulate search engines, generate doorway pages, buy links, hide content, inflate traffic, or publish unreviewed scaled content. For app-store search, use `marketer` and store-publishing skills; for paid search, use `marketer`.

## Durable Operating Artifacts

Use the project's existing convention when stronger. Otherwise maintain:

- strategy and baseline: `.projects/<project>/seo/strategy.md`
- keyword-to-page map: `.projects/<project>/seo/keyword-page-map.csv`
- technical findings: `.projects/<project>/seo/technical-audit.md`
- change ledger: `.projects/<project>/seo/experiment-log.csv`
- current operating report: `.projects/<project>/seo/weekly-report.md`

Start from this package's `templates/`. Never place OAuth tokens, service-account keys, exported user-level query data, cookies, or credentials in these artifacts or the repository.

## Authority, Access, and Truth Rules

Before analysis or implementation, identify:

1. website/domain, canonical production origin, repository/CMS, deployment path, framework, and project instructions;
2. business goal, primary conversions, target audiences, products/services, geographies, languages, seasonality, and regulatory constraints;
3. access available to Google Search Console, Bing Webmaster Tools, analytics, tag manager, rank tracking, crawl tools, CMS/repository, deployment, logs, and CDN;
4. current migrations, redesigns, releases, campaigns, incidents, or tracking changes that could confound results;
5. exact scope the user authorizes: read-only audit, proposed changes, code/content implementation, production deployment, URL inspection/indexing requests, or recurring monitoring.

Require explicit authorization before modifying production, changing analytics/tagging, submitting removals, editing robots directives, changing canonicals/redirects, submitting URLs, or accessing private analytics properties. Use least-privilege credentials and never expose them in output.

Evidence hierarchy:

1. first-party measured data: Search Console, Bing Webmaster Tools, analytics, conversions, server/CDN logs, crawl and rendered-page evidence;
2. observed live SERPs for the target country, language, device, and date;
3. official platform tools such as Google Trends and Keyword Planner when available;
4. reputable third-party keyword/rank/crawl tools, labeled with provider and observation date;
5. qualitative hypotheses, explicitly labeled as hypotheses.

**Do not invent search volume, keyword difficulty, traffic potential, rankings, click-through rate, conversions, or competitor data.** If data access is missing, say what is unavailable, use transparent proxies, lower confidence, and produce an instrumentation/access plan before claiming opportunity size.

## Adopt → Configure → Extend → Wrap → Build New

Before building crawlers, rank trackers, dashboards, or keyword databases:

1. **Adopt** existing Search Console/Bing/analytics data and project tools.
2. **Configure** existing CMS, framework metadata, sitemaps, structured-data components, analytics dimensions, and dashboards.
3. **Extend** project-owned scripts/components when one small change closes a gap.
4. **Wrap** official or existing APIs with a narrow, tested adapter only when recurring work justifies it.
5. **Build new** only when no maintained tool fits, documenting why, ownership, cost, rate limits, privacy, and maintenance.

See `references/tooling-and-data-sources.md` for the default tool matrix and official sources.

## Phase 1 — Establish the Baseline

### 1.1 Understand the website as a product

Record:

- audience segments and jobs-to-be-done;
- offerings, funnel stages, primary/secondary conversions, and value per conversion when known;
- current information architecture and page types;
- brand/non-brand, local/international, informational/commercial/transactional/navigational scope;
- release, migration, and content history;
- organic baseline using comparable date windows.

Do not optimize for visits alone. Pair every SEO objective with a user outcome and a business metric.

### 1.2 Crawl and inventory the actual site

Create a URL inventory from multiple sources where available: crawlable internal links, XML sitemap, CMS/database, Search Console landing pages, analytics landing pages, logs, and known campaign URLs. Record final status, redirect target, canonical, index directive, content type/template, title, H1, word/content purpose, internal inlinks, depth, structured data, language/locale, mobile rendering, and conversion role.

Inspect at minimum:

- `robots.txt`, XML sitemap discovery/content, status codes and redirect chains;
- canonical tags and conflicts, `noindex`, robots directives, duplicate/thin/soft-404 behavior;
- HTTP/HTTPS and host normalization, URL parameters, pagination/facets/search pages;
- rendered HTML, JavaScript-dependent content and links, mobile usability;
- Core Web Vitals: LCP, INP, CLS, plus supporting lab diagnostics;
- orphan pages, broken internal links, crawl depth, navigation, breadcrumbs;
- hreflang and locale/country routing when international;
- structured data eligibility, syntax, visible-content consistency, and template coverage;
- tracking and conversion integrity.

A robots block does not reliably remove an already known URL from search. Avoid casually blocking resources required for rendered-page understanding. Treat canonical as a signal, not a guaranteed directive.

### 1.3 Freeze baseline cohorts

Before edits, export or record:

- Search Console query-page rows with country, device, search appearance, impressions, clicks, CTR, and average position;
- analytics organic landing-page sessions/users, engagement, conversions, and conversion value where reliable;
- rank tracking for an explicit query/location/language/device set;
- indexed/excluded counts and representative URL Inspection evidence;
- Core Web Vitals field status and crawl findings;
- at least a 28-day baseline and a year-over-year comparator when seasonality warrants it.

Preserve observation timestamps, property, filters, timezone, and data source. Search Console data is delayed, aggregated, and privacy-filtered; the Search Analytics API does not guarantee all data rows and may return only top rows. Do not treat it as real-time or exhaustive truth.

## Phase 2 — Research High-Potential Queries

### 2.1 Build demand from real language

Seed research from:

- Search Console queries already earning impressions or positions;
- site search, support tickets, sales calls, reviews, communities, and customer wording;
- product/category/problem/use-case/integration/comparison/alternative/template/location questions;
- SERP autocomplete, related searches, People Also Ask, forum discussions, and competitor pages;
- Keyword Planner, Trends, Bing, and reputable third-party datasets when authorized.

Expand variants across beginner/expert wording, synonyms, entities, modifiers, questions, local terms, languages, and funnel stages. Group by shared **search intent and expected result type**, not string similarity alone.

### 2.2 Inspect the live SERP

For every serious cluster, observe the target SERP in the intended country, language, and device. Record:

- dominant intent and page type (guide, product, category, tool, template, local page, video, forum, news);
- SERP features and zero-click risk;
- freshness, depth, format, entities, evidence, and experience shown by leading results;
- whether the site has a credible differentiated answer;
- competitor authority only as a practical constraint, never as a reason to copy.

A keyword with large reported volume but mismatched intent is not an opportunity.

### 2.3 Score opportunities transparently

Use the keyword-to-page map. Score each cluster using available evidence:

- **demand** — measured impressions/volume/trend, with source/date;
- **attainability** — current average position, topical/site fit, SERP competition, link/internal-authority reality;
- **business value** — conversion relevance, customer value, funnel role;
- **user value** — ability to satisfy the intent substantially better;
- **momentum** — pages ranking roughly 4–20, high-impression/low-CTR results, or growing demand;
- **effort/risk** — implementation cost, review burden, migration/indexation risk, cannibalization.

Document the formula and raw evidence. Do not convert unknowns into fake precision. A practical priority is `expected impact × confidence ÷ effort`, but the components must remain visible.

### 2.4 Include AI search without creating a separate fiction

Google documents AI Overviews and AI Mode as using its core Search ranking and quality systems. Apply the same helpful, reliable, people-first standard: make content uniquely useful, factually supported, accessible in rendered pages, and easy for users and search systems to understand. Do not manufacture AI-only doorway pages, rewrite pages merely to imitate generated answers, or trade first-hand value for commodity summaries.

Do not claim that `llms.txt`, special “AI markup,” artificial content chunking, or fabricated third-party mentions improve Google visibility. Use normal crawlability, indexability, structured data supported by visible content, and strong page experience. If Search Console exposes its Generative AI performance report for the property, use it as an additional measured view with dated filters and the same aggregation/privacy caveats—not as a substitute for query-page, analytics, conversion, or controlled rank evidence.

## Phase 3 — Build the Keyword-to-Page Map

A **keyword-to-page map** assigns one primary intent cluster to one intentional canonical target page while allowing secondary queries that share the same intent.

For each cluster:

1. inspect every plausible existing page and its current query-page performance;
2. choose the best existing page when it can satisfy the intent without changing its product purpose;
3. mark `refresh`, `consolidate`, `redirect`, `create`, `defer`, or `reject`;
4. state primary query/intent, secondary queries/entities, country/language/device, funnel stage, baseline, business goal, proposed changes, owner, and monitoring cohort;
5. detect cannibalization from multiple pages alternating/ranking for the same intent;
6. pick one canonical winner, then differentiate, merge, redirect, canonicalize, or de-optimize competing pages based on user need and link/equity evidence.

### Existing page versus new page

Prefer an **existing page** when it already matches intent, has links/history, earns impressions, or can become the best answer without confusing its current audience.

Create a **new page** only when:

- the intent is materially distinct from every existing page;
- the business can provide unique, useful, maintained content or functionality;
- the page belongs naturally in site architecture and internal linking;
- indexation adds user value rather than manufacturing keyword permutations.

Do not create doorway pages, near-duplicate location pages, or thin programmatic variants. If many pages are justified, define data quality, uniqueness, template review, indexation thresholds, monitoring, and retirement rules before scaling.

## Phase 4 — Design and Implement Improvements

### 4.1 Inspect project conventions first

Read repository instructions and detect the framework/CMS, metadata conventions, routing, components, tests, analytics, and deployment controls. Reuse project-owned title/meta, canonical, structured-data, sitemap, breadcrumb, and internal-link components. Coordinate code changes with `coder`, visible content and information design with `ui-designer`/`english-copywriter`, validation with `qa`, and deployment/monitoring with `devops`.

Do not stop at recommendations when the user authorized implementation and the website is accessible. Make scoped changes, run the project's checks, inspect the focused diff, deploy through its normal path when authorized, and verify production.

### 4.2 On-page and content implementation

For each target page:

- align the page's actual purpose and content with search intent;
- create a specific, accurate, useful title and one clear primary H1;
- write a truthful meta description for click qualification, not a ranking guarantee;
- answer the main need early, then cover necessary subtopics/entities in a coherent hierarchy;
- demonstrate first-hand experience, evidence, authorship, sources, product details, examples, limitations, and update dates where relevant;
- add useful images/video/tables/tools with descriptive context and accessible alt text when appropriate;
- strengthen contextual internal links with natural descriptive anchors from relevant pages;
- make the next user action clear and measurable without harming the answer;
- keep visible page content, structured data, title, and claims consistent.

Use keywords naturally. Never use keyword stuffing or mechanically repeat exact phrases. “People-first” means the page is worth visiting even if search traffic disappears.

### 4.3 Technical implementation

Implement the smallest system-level correction that fixes the page class:

- correct status codes, redirect chains, canonicals, `noindex`, robots behavior, and XML sitemap membership;
- ensure important content and internal links exist in rendered HTML and work on mobile;
- emit unique, accurate server-rendered title, description, canonical, Open Graph/Twitter metadata, meaningful fallback content, and JSON-LD for public target URLs when the stack supports them; verify route precedence so SPA/static catch-alls do not mask detail routes;
- apply context-appropriate escaping to HTML text/attributes, XML, and JSON-LD, including hostile stored-value tests that try to terminate tags or scripts;
- include only crawlable canonical URLs in sitemaps and emit `lastmod` only from a valid canonical page-modification timestamp—not an aspirational freshness date or unrelated publication field;
- fix duplicate URL generation and parameter/facet crawl traps;
- improve Core Web Vitals without deleting required UX or measurement blindly;
- add eligible structured data using supported schema types and visible factual content;
- add breadcrumbs and crawlable architecture where they improve users and discovery;
- preserve URLs and equity during migrations with one-to-one redirects and before/after inventories;
- validate hreflang return links, locale/country intent, and self-canonical behavior for international sites.

Structured data can enable rich-result eligibility; it does not guarantee display or ranking. Never mark up invisible, misleading, or unsupported content.

### 4.4 Change isolation and rollback

Record every material change in the experiment log with page cohort, hypothesis, baseline window, change date, release/commit, expected mechanism, primary metric, guardrail metrics, confounders, and rollback. Prefer one coherent hypothesis per cohort. Avoid changing titles, content, internal links, templates, tracking, and URLs simultaneously unless safety or a migration requires it.

## Phase 5 — Verify Before Claiming Completion

Verify in the actual target environment:

- response status, redirect destination, canonical, robots meta/header, sitemap state;
- rendered HTML title, meta description, H1, body content, internal links, structured data, analytics/conversion events;
- desktop and mobile critical journey and page usability;
- structured-data validation and representative URL Inspection when access permits;
- crawl diff, broken links, orphaning, duplicate behavior, and Core Web Vitals lab regressions;
- deployment SHA/release and the exact pages changed.

A local source diff is not proof that production search engines can crawl the intended page. Do not claim indexed, ranking improved, or traffic increased from deployment alone.

## Phase 6 — Monitor Rankings and Business Outcomes

### Cadence

- **Immediately after release:** production verification and annotation.
- **Weekly:** query-page cohort review, rank tracking, crawl/index alerts, conversions, experiment decisions.
- **Every 28 days:** compare a stable reporting window with the prior period and year-over-year where seasonality matters.
- **Quarterly or after major releases:** recrawl, remap opportunities, consolidate decay/cannibalization, review templates and information architecture.

For a normal content/on-page experiment, allow roughly **6–12 weeks** before a durable outcome judgment unless strong evidence shows breakage or a faster reversal is needed. New sites, low-volume queries, migrations, and major algorithm/seasonal events may need longer.

### Required monitoring grain

Monitor at query-page level, then aggregate deliberately by cluster, page type, intent, country, device, brand/non-brand, and change cohort. Track:

- impressions, clicks, CTR, average position;
- explicit rank tracking for fixed query/location/language/device definitions;
- organic landing-page engagement, conversions, conversion rate/value;
- indexed/excluded status, crawl errors, sitemap and structured-data status;
- Core Web Vitals field data;
- assisted conversion or discovery value when informational pages are not last-click closers.

Average position is not a precise universal rank. Personalization, geography, device, SERP features, and aggregation matter. Use fixed rank tracking for controlled observations and Search Console for actual property visibility.

### Iteration decisions

- **Impressions up, CTR weak, position stable:** inspect intent, title/snippet qualification, SERP features, brand trust; test an accurate title/meta improvement.
- **Position 4–20 with conversions/business fit:** deepen useful coverage, evidence, internal links, UX, and page authority; inspect competitors and cannibalization.
- **Clicks up, conversions down:** fix intent/offer/CTA mismatch or tracking before chasing more traffic.
- **Multiple pages alternate for one cluster:** choose a winner and consolidate/differentiate.
- **No movement:** verify crawling/indexing and implementation first; then reassess intent, quality, authority, demand evidence, and experiment isolation.
- **Traffic/rank loss after release:** check technical/indexation/template regressions, URL/canonical changes, tracking, seasonality, competitors, SERP layout, algorithm volatility, and manual/security issues before attributing cause.
- **Clear harm tied to the change:** use the recorded rollback and keep evidence.

Use statistical caution. Do not call a small low-volume fluctuation a win. State window, denominator, uncertainty, confounders, and whether the evidence is directional or statistically persuasive.

## Search Spam and Safety Guardrails

Never implement or recommend:

- keyword stuffing, hidden text/links, cloaking, sneaky redirects, link schemes, or paid links that pass ranking credit;
- doorway pages, scraped content, scaled content abuse, site reputation abuse, or expired domain abuse;
- fake reviews/authorship/experience, copied competitor content, unsupported medical/legal/financial claims;
- automated queries or scraping that violate applicable terms, access controls, robots policies, privacy requirements, or rate limits;
- Indexing API use for unsupported ordinary web pages;
- destructive URL removals, mass redirects, domain moves, or robots/noindex changes without explicit authorization, inventory, rollback, and post-change verification.

No fabricated evidence. Do not claim “SEO complete,” “indexed,” “ranked,” or “traffic increased” unless the corresponding production/search data proves it. Rankings cannot be guaranteed.

## Reporting Contract

Lead with product behavior and business scope:

```text
SEO growth — <site> — <date/time + timezone>
- Outcome: <before → after behavior, or current evidence>
- Scope: <pages/templates/queries/countries/devices>
- Opportunity: <top query clusters and selected target pages>
- Changes: <production URLs and implementation summary>
- Verification: <crawl/render/index/schema/CWV/deployment evidence>
- Performance: <window; impressions/clicks/CTR/position/conversions; confidence>
- Remaining limits: <missing access, latency, low volume, confounders>
- Next action: <keep/improve/expand/consolidate/rollback; owner/date>
- Artifacts: <strategy/map/audit/experiment/report paths>
```

Separate observed facts, third-party estimates, and hypotheses. Include source/date/filter definitions for every material metric.

## Common Pitfalls

1. **Starting with keyword volume instead of product value.** High-volume irrelevant traffic wastes crawl, content, and conversion capacity.
2. **Creating new pages before mapping existing pages.** This causes cannibalization and discards history/equity.
3. **Treating average position as a single rank.** Segment and use controlled rank definitions.
4. **Optimizing snippets without satisfying intent.** CTR gains that disappoint users do not create durable growth.
5. **Publishing AI text without first-hand value or review.** Tool assistance does not remove accuracy, originality, or accountability requirements.
6. **Changing too many variables at once.** Unisolated experiments prevent learning.
7. **Calling deployment an SEO result.** Verify crawl/render/index state, then wait for measured search outcomes.
8. **Ignoring conversions and guardrails.** More clicks can still be worse product traffic.
9. **Deleting or redirecting URLs casually.** Inventory links, traffic, canonical history, and rollback first.
10. **Building custom tooling prematurely.** Existing first-party and maintained tools usually produce faster, safer evidence.

## Verification Checklist

- [ ] Business goal, audience, conversions, geography/language, access, and authorization are explicit.
- [ ] Site inventory covers crawl, sitemap, Search Console/analytics landing pages, templates, and rendered mobile behavior.
- [ ] Baseline includes dated query-page, rank, conversion, index, crawl, and performance evidence.
- [ ] Keyword clusters are grounded in real sources and observed SERP intent; no invented metrics.
- [ ] Every target cluster maps to one intentional existing page or one justified new page.
- [ ] Cannibalization, content uniqueness, internal links, architecture, and page purpose are addressed.
- [ ] Technical audit covers robots.txt, XML sitemap, status/redirects, canonical, noindex, rendering, mobile, structured data, internationalization, and Core Web Vitals.
- [ ] Implemented content is people-first, accurate, differentiated, useful, and conversion-aware.
- [ ] Production response and rendered HTML are verified after deployment.
- [ ] Experiment log records baseline, hypothesis, cohort, change date, release, metrics, confounders, and rollback.
- [ ] Weekly and 28-day monitoring segments query-page data by relevant country/device/intent cohorts.
- [ ] Ranking changes are interpreted alongside impressions, clicks, CTR, conversions, indexation, and seasonality.
- [ ] No search spam, unsupported claims, unauthorized access, leaked credentials, or guaranteed rankings.
- [ ] Final report states evidence, uncertainty, limits, durable artifacts, owner, and next decision.
