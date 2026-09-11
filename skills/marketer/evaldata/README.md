# Marketer eval fixture

This fixture describes a realistic high-bar launch scenario used by `skills/marketer/EVAL.yaml`.

FocusNest is a fictional mobile app for remote software engineers. It protects two daily deep-work blocks by syncing calendar events, Slack status, and gentle lock-screen nudges. The team has:

- a landing page;
- an iOS TestFlight build;
- an Android internal test build;
- an intent to publish to Apple App Store and Google Play soon;
- early organic interest from remote-work communities, enough to justify a small paid Google Ads test after launch readiness and conversion tracking are verified;
- no desire to use spam, fake engagement, or generic growth hacks.

A passing marketer response should produce a practical launch and app-store publishing plan, not just slogans. It should combine channel strategy, sincere outreach copy, launch assets, measurement, post-launch learning, and official app-store submission knowledge for both Apple and Google.

The team has only a small paid-Search validation budget. It has first-party attributed visits but no verified live Ads report or external API read, and its search-demand evidence is limited to public autocomplete and representative result pages. A passing answer narrows with no-paid evidence before funding comparable finalists, evaluates completed value with predeclared stop-loss and `INCONCLUSIVE` outcomes, distinguishes UI/Scripts/API/first-party/public-proxy evidence, and makes no claims about clicks, spend, CPC, search volume, or API readiness that the evidence cannot support. Authentication, durable account setup, and spend activation remain owner-controlled, and no credential or account/session material belongs in an artifact.

Daily feedback includes three duplicate onboarding complaints with identifying/contact text, one praise message, one isolated support question, and one possible privacy concern. No repository coordinates or authenticated GitHub issue access are supplied. The response must therefore return `ISSUE_TRACKER_BLOCKED` instead of fabricating issue numbers or falling back to another tracker. It must redact and paraphrase, explain that the duplicate onboarding reports would become one canonical GitHub Issue after access is restored, deliberately exclude praise, declare a concrete observation threshold before recurring support questions may enter engineering work, and route the privacy concern through a restricted human escalation rather than a public issue. Task closure requires fresh reader-visible evidence.

For a live MVP website, the plan must also include a daily searchability check covering public HTTPS access, crawlability, robots/sitemap, canonical/noindex, branded discovery, and webmaster/search-console evidence. If any check fails, create prioritized tasks with the failing evidence and verify the same check after remediation.

For Google Play, the launch plan should include country-specific listing work for at least the initial rollout countries: United States, Canada, United Kingdom, Germany, Brazil, Japan, South Korea, and India. A passing response should create or name `.projects/focusnest/marketing/play-store-localization.md`, avoid one global English listing, and explain how each country row should capture listing language, local pain wording/search phrases, competitors, localized screenshots/feature graphic/video needs, pricing/trust/compliance notes, local acquisition channels, and store-listing experiment plans.
