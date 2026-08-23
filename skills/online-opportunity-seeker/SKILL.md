---
name: online-opportunity-seeker
description: "Use when researching product opportunities for a given vertical by combining keyword trend/search demand, Reddit/community pain signals, Google results, app-store/play-store competitors, and existing-service gaps into ranked product bets."
version: 0.1.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, product-research, opportunity-discovery, market-research, seo, app-store]
    related_skills: [product-manager, marketer, ui-designer, project-manager]
---

# Online Opportunity Seeker

## Overview

Find practical product opportunities in a vertical by studying what people already search for, complain about, pay for, download, and compare. This skill is for early discovery before the team commits to a PRD, prototype, or launch plan.

The output is not a generic market overview. It should produce ranked, evidence-backed opportunity bets: clear user pain, search/query language, active communities, existing services, competitor weaknesses, possible wedge, MVP shape, acquisition angle, and what evidence is still missing.

Use honest research. Do not invent trend numbers, Reddit quotes, app rankings, review counts, revenue, or competitor capabilities. If a tool cannot access Google Trends, Reddit, Google Search, Apple App Store, Google Play, or a specific data provider, state the limitation and use a transparent proxy such as public search results, subreddit search pages, app-store web pages, review snippets, keyword autocomplete, or clearly labeled assumptions.

## When to Use

Use this skill when:

- The user gives a vertical and asks for product ideas, startup ideas, niches, unmet needs, online opportunities, app opportunities, or market gaps.
- Product-manager needs evidence before writing a PRD for a vague product direction.
- Marketer needs search/community/app-store demand research before positioning or launch planning.
- A team wants to know whether a vertical has search demand, visible user pain, and weak existing solutions.
- A user asks what to build for a niche, audience, job-to-be-done, app category, subreddit cluster, or keyword theme.

Do not use this skill for mature go-to-market execution after a product is already chosen; use `marketer` then. Do not use it to scrape private communities, evade rate limits, fabricate testimonials, or spam users. Do not present opportunity scores as investment advice or guaranteed outcomes.

## Durable Artifact Locations

Create durable artifacts so product, design, marketing, and implementation agents can reuse the research:

- Opportunity research report: `.projects/<project-or-vertical>/research/opportunity-map.md`
- Keyword/query map: `.projects/<project-or-vertical>/research/keyword-map.md`
- Community pain log: `.projects/<project-or-vertical>/research/community-pain-log.md`
- Competitor/app-store matrix: `.projects/<project-or-vertical>/research/competitor-matrix.md`
- Ranked opportunity shortlist: `.projects/<project-or-vertical>/research/opportunity-shortlist.md`
- Follow-up validation plan: `.projects/<project-or-vertical>/research/validation-plan.md`

If the user only wants a quick answer, still name the artifact paths you would create or update for durable project work.

## Research Inputs

Use at least four evidence channels unless the user explicitly asks for a fast skim:

1. **Search keyword demand** — Google Trends, Google autocomplete, People Also Ask, Google Search result pages, SEO tools if available, app-store search suggestions, YouTube/TikTok search suggestions when the vertical is visual.
2. **Reddit and community pain** — relevant subreddits, forum threads, Discord/Slack public communities, Hacker News, Indie Hackers, GitHub issues, product support forums, niche Facebook/LinkedIn groups if accessible.
3. **Existing services from Google Search** — landing pages, pricing pages, comparison pages, support docs, alternatives pages, Chrome extensions, SaaS directories, marketplaces, templates, calculators, and AI wrappers.
4. **App stores and marketplaces** — Google Play, Apple App Store web listings, Chrome Web Store, Shopify/WordPress/Slack/Notion marketplaces, depending on the vertical.
5. **Review and complaint signals** — app-store reviews, G2/Capterra/Product Hunt reviews, Reddit complaint threads, support community posts, cancellation reasons, pricing complaints, feature requests.
6. **Economic and workflow context** — who pays, current workaround, urgency, compliance/security constraints, data availability, integrations, and whether the buyer differs from the user.

## Step-by-Step Workflow

### 1. Define vertical boundaries

Clarify or infer:

- Target vertical and sub-verticals.
- Geography/language/locale if relevant.
- User type: consumer, prosumer, SMB, enterprise, developer, creator, student, parent, health/finance/legal professional, etc.
- Platform scope: web, mobile app, browser extension, chatbot/agent, API, marketplace plugin, template/content product.
- Constraints: no-code/AI-first, mobile-first, B2B, privacy-sensitive, regulated, budget, time-to-MVP.

If the vertical is broad, split into 3-7 sub-niches before searching.

### 2. Build a keyword seed map

Create seed clusters from:

- Problem phrasing: “how to <pain>”, “why is <workflow> hard”, “best way to <job>”.
- Solution phrasing: “<vertical> software”, “<task> app”, “<role> tool”, “AI <task>”.
- Competitor phrasing: “<competitor> alternative”, “<competitor> pricing”, “<competitor> reviews”.
- Urgent phrasing: “template”, “calculator”, “checklist”, “automation”, “tracker”, “reminder”, “generator”, “compliance”, “invoice”, “scheduler”, “CRM”, “dashboard”.
- Mobile/app phrasing: “<task> app”, “<vertical> tracker”, “<vertical> planner”, “Google Play <keyword>”, “App Store <keyword>”.

For each cluster, record:

- Query examples.
- Intent: learn, compare, buy/download, solve urgent problem, complain, hire/outsource.
- Demand proxy: trend direction, result density, autocomplete richness, ad/commercial density, app-store density, or explicit unknown.
- Notes on local language if the target market is non-US/non-English.

### 3. Search trends and demand proxies

When trend tools are available, compare relative interest across keyword clusters and note seasonality. When not available, use transparent proxies:

- Number and quality of autocomplete suggestions.
- People Also Ask questions and repeated long-tail questions.
- Google results: ads, SEO pages, listicles, comparison pages, product landing pages, support docs, active communities.
- App-store results: number of relevant apps, review volume, update recency, rating spread, category fit.
- Marketplace results: extensions/plugins/templates and review counts.

Do not claim exact search volume unless the source provides it. Prefer “high/medium/low evidence from <source>” over fake precision.

### 4. Mine Reddit and communities for pain

Find communities using searches like:

- `site:reddit.com/r <vertical> <pain>`
- `site:reddit.com/r <vertical> "how do you"`
- `site:reddit.com/r <vertical> "alternative"`
- `site:reddit.com/r <vertical> "app" OR "tool" OR "software"`
- `site:reddit.com/r <competitor> "pricing" OR "bug" OR "support" OR "feature request"`

For each relevant thread/community, capture:

- Subreddit/community name and approximate fit.
- Pain statement in your own words; quote only short public snippets when necessary and cite the URL.
- Evidence type: repeated complaint, workaround, buying request, tool recommendation, competitor frustration, workflow tutorial, beginner confusion.
- Urgency: annoyance, time sink, revenue/cost risk, compliance risk, social/emotional pain, daily workflow blocker.
- Community rules and promotion sensitivity if later launch is possible.

Respect community norms. Do not DM users, scrape personal data, or treat one angry thread as proof of market demand.

### 5. Map existing services and app-store competitors

For Google/web competitors and marketplace/app-store results, record:

- Name, URL/listing, platform, target user, pricing if visible.
- Primary promise and core workflow.
- Strengths users seem to value.
- Weaknesses from reviews, support docs, missing features, pricing complaints, UX friction, outdated UI, poor localization, lack of integrations, privacy concerns, or platform gaps.
- Acquisition surface: SEO category, app-store keywords, communities, integrations, templates, influencer/content channels.
- Defensibility or commoditization risk: easy AI wrapper, data/network moat, workflow lock-in, compliance barrier, distribution dependency.

Include direct competitors, substitutes, and manual workarounds. A spreadsheet, Notion template, VA service, Excel workflow, or Reddit megathread can be a stronger signal than a polished SaaS competitor.

### 6. Synthesize opportunity patterns

Look for overlaps:

- Search demand + repeated community pain + weak existing products.
- Existing products with demand but bad UX, stale updates, poor mobile support, bad localization, or hated pricing.
- High-intent queries where results are mostly content/listicles, not good software.
- App-store categories with many downloads but recurring complaints in reviews.
- Communities using manual templates or spreadsheets for frequent workflows.
- New platform or regulation changes creating fresh pain.
- AI/automation can reduce tedious workflow steps without pretending to replace expert judgment.

Also flag anti-opportunities:

- Many strong incumbents with low complaint volume.
- Users want free advice/content, not software.
- The real buyer is inaccessible or sales-heavy.
- App-store acquisition looks crowded and undifferentiated.
- Compliance, trust, data access, or marketplace policy makes a small MVP unrealistic.

### 7. Rank opportunities

Score each candidate 1-5 on:

- Pain intensity and frequency.
- Evidence quality across independent channels.
- Search/app-store acquisition potential.
- Competitive gap clarity.
- MVP feasibility for NoEgoDev.
- Monetization plausibility.
- Trust/compliance/platform risk, reverse-scored.
- Differentiation/wedge strength.

Use the scores to rank, but explain the reasoning. Do not hide weak evidence behind a numeric total.

### 8. Turn top bets into product briefs

For the top 3-5 opportunities, include:

- Opportunity name.
- Target user and situation.
- Pain/job-to-be-done.
- Evidence summary with sources or search paths.
- Existing alternatives and gap.
- Wedge/MVP concept.
- First screen or critical user journey.
- Acquisition channel and likely keywords/subreddits/app-store terms.
- Monetization hypothesis.
- Biggest risk or unknown.
- Validation test: landing page, concierge workflow, clickable mock, subreddit research question, app-store listing test, manual outreach, or small SEO content test.
- Recommended owner handoff: `product-manager` for PRD, `ui-designer` for mocks, `marketer` for positioning/validation landing page, `project-manager` for issue routing.

## Required Output Format

Unless the user asks for a different format, produce:

1. **Scope and assumptions** — vertical, geography, user type, sources checked, limitations.
2. **Keyword and demand map** — clusters, intent, demand proxy, notes.
3. **Community pain map** — subreddits/forums, recurring pain, urgency, source links or search paths.
4. **Existing-service/app-store matrix** — competitors/substitutes, strengths, gaps, review signals.
5. **Opportunity shortlist** — ranked 3-5 bets with scores and concise product briefs.
6. **Anti-opportunities** — tempting ideas to avoid or defer.
7. **Validation plan** — next 3-7 days of tests, artifact paths, and handoffs.
8. **Recommended next step** — which opportunity to clarify with product-manager and whether visual mocks are needed.

## Quality Bar

A passing opportunity report:

- Uses the target vertical's real search language instead of generic startup buzzwords.
- Compares multiple keyword clusters, not one obvious head term.
- Includes Reddit/community evidence or clearly explains why community evidence was unavailable.
- Names existing services/apps and why they do or do not satisfy the need.
- Distinguishes user pain from founder excitement.
- Separates evidence from assumptions.
- Produces ranked product bets that are small enough to prototype or validate.
- Includes acquisition and validation thinking, not just feature ideas.
- Routes follow-up work to the right NoEgoDev skills.

## Common Pitfalls

1. **Inventing numbers.** Never make up search volume, trend percentages, review counts, revenue, downloads, or rankings. Use ranges only when a source provides them.
2. **Only reading competitor landing pages.** Landing pages show claims, not pain. Balance them with reviews, community complaints, support docs, and alternatives searches.
3. **Treating Reddit as the whole market.** Reddit is useful for language and pain discovery but biased by community demographics and norms.
4. **Ignoring substitutes.** If users already solve the problem with spreadsheets, templates, agencies, assistants, or manual workflows, those are competitors.
5. **Picking the biggest market by default.** The best NoEgoDev opportunity is often a sharp wedge in a narrow sub-niche, not a broad crowded category.
6. **Skipping app-store reality for mobile ideas.** For mobile opportunities, inspect Play Store/App Store competitors, reviews, update recency, screenshots, subscriptions, and policy constraints.
7. **Confusing SEO content opportunity with software opportunity.** If the query intent is mostly informational, the best first product may be a calculator/template/content asset, not a SaaS app.
8. **Overfitting to AI.** AI is useful when it removes tedious work, summarizes messy inputs, or personalizes workflows; it is not a wedge by itself.
9. **Not preserving research.** Save or name durable artifacts so downstream product/design/marketing agents do not repeat discovery.

## Verification Checklist

Before finishing, verify:

- [ ] Vertical scope, user type, geography/language, and platform assumptions are stated.
- [ ] Keyword/query clusters include intent and demand proxies or explicit unknowns.
- [ ] Reddit/community pain signals are summarized with source links/search paths and promotion sensitivity when relevant.
- [ ] Existing web services, app-store/play-store competitors, substitutes, and manual workarounds are compared.
- [ ] Top opportunities are ranked with evidence quality, competitive gap, MVP feasibility, acquisition path, monetization, and risks.
- [ ] Anti-opportunities and unknowns are called out plainly.
- [ ] Validation plan includes concrete next tests and artifact paths.
- [ ] Follow-up owners are named: product-manager, ui-designer, marketer, project-manager, or implementation skills as appropriate.
