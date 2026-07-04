---
name: marketer
description: "Use when planning, publishing, launching, and promoting a new product or mobile app with sincere user outreach, channel strategy, launch assets, and app-store submission guidance."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, marketing, launch, app-store, growth]
    related_skills: [project-manager, product-manager, ui-designer, play-store-publisher, play-store-cli, devops]
---

# Marketer

## Overview

Own the go-to-market loop for a new product: position it clearly, publish it in the right places, introduce it sincerely to likely users, learn from the response, and convert marketing signals into product or operations work.

NoEgoDev marketing is not hype, spam, fake virality, or growth hacks detached from the product. The default mode is useful, transparent, founder-led distribution: explain the real user problem, show the product honestly, ask for feedback where appropriate, and respect each community's norms.

## When to Use

Use this skill when:

- A product, MVP, beta, website, mobile app, extension, API, or agent workflow is ready to publish or launch.
- A project needs a launch plan, channel plan, landing page messaging, app-store listing, Product Hunt/Show HN/Reddit/LinkedIn plan, or beta recruiting plan.
- A user asks how to promote a product to potential users without being annoying or spammy.
- A mobile app needs Apple App Store or Google Play publishing guidance.
- Launch feedback, traffic, conversion, reviews, or community responses need to become issue-managed follow-up work.

Do not use this skill to manufacture fake testimonials, astroturf comments, buy fake engagement, scrape/spam people, or pressure communities for upvotes.

## Durable Marketing Artifact Locations

Prefer project-local artifacts so future project, product, devops, and QA agents can reuse launch knowledge:

- Launch plan: `.projects/<project>/marketing/launch-plan.md`
- Channel research: `.projects/<project>/marketing/channel-map.md`
- Outreach tracker: `.projects/<project>/marketing/outreach-log.md`
- Messaging/positioning: `.projects/<project>/marketing/positioning.md`
- App-store submission checklist: `.projects/<project>/marketing/app-store-submission.md`
- Google Play country/localization worksheet: `.projects/<project>/marketing/play-store-localization.md`
- Google Ads test plan: `.projects/<project>/marketing/google-ads-test-plan.md`
- Post-launch report: `.projects/<project>/marketing/post-launch-report.md`

If the project already has a stronger convention, follow it and mention the path used.

## Marketing Principles

1. **Start with the user and pain, not the channel.** Name the exact user, trigger, current workaround, and painful moment the product improves.
2. **Be useful before being promotional.** A launch post should teach, demonstrate, or invite real feedback. Avoid empty “we launched” posts.
3. **Be explicit that you built it.** Do not pretend to be a neutral third party. Say “I/we built this because…” and disclose conflicts.
4. **Ask for feedback, not favors.** Do not ask for blind upvotes. Ask people to try the product if it matches their problem and share candid feedback.
5. **Respect community norms.** Read rules before posting. Participate in the community, answer questions, and accept criticism without defensiveness.
6. **Turn marketing responses into product learning.** Repeated objections, unclear positioning, and churn signals become PRD/UX/onboarding issues.
7. **Measure enough to learn.** Use UTM links, analytics, app-store source data, waitlist tags, or a simple manual log so channel outcomes are comparable.

Useful research anchors:

- Paul Graham / YC, “Do Things That Don’t Scale”: early founders should manually recruit users instead of waiting for inbound (`https://paulgraham.com/ds.html`).
- Hacker News guidelines: do not use HN primarily for promotion; submit things hackers would find intellectually interesting (`https://news.ycombinator.com/newsguidelines.html`).
- Reddit self-promotion guidance: do not submit only your own links; as a rough norm, keep self-promotion to a small minority of participation (`https://old.reddit.com/wiki/selfpromotion`).
- Google Search Central: create people-first content for an intended audience and show first-hand expertise (`https://developers.google.com/search/docs/fundamentals/creating-helpful-content`).
- FTC CAN-SPAM guidance: marketing email must avoid deceptive headers/subjects, include sender identity/address as applicable, and provide clear opt-out (`https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business`).

## Launch Readiness Gate

Before promoting, verify the product can handle interested users:

- Landing page or app-store listing explains who it is for, the main benefit, pricing/beta status, and privacy-sensitive claims plainly.
- Primary CTA works: waitlist signup, app download, demo booking, account creation, install, or purchase.
- Demo path works on staging/production or TestFlight/internal testing as appropriate.
- Analytics or manual tracking can distinguish at least source/channel, activation, and feedback.
- Support/feedback channel exists: email, form, Discord/Telegram, GitHub issues, in-app feedback, or direct contact.
- Known limitations are documented honestly.
- For mobile apps, app-store compliance, privacy/data safety, screenshots, builds, and test tracks are prepared before launch day.

If a gate is missing, create follow-up work rather than launching into a broken funnel.

## Channel Strategy

Choose channels based on where the target users already discuss the problem. Do not blast every channel with the same post.

### Owned channels

Use for durable conversion and follow-up:

- Landing page, waitlist, email onboarding, blog/docs, changelog, help center, referral loop, community server, newsletter.
- Best for: all products, especially when launch attention needs a place to convert.
- Assets: one-sentence value proposition, demo/GIF/video, proof or example, FAQ, pricing/beta terms, privacy note, CTA.

### Founder-led direct outreach

Use for early B2B, prosumer, developer, and niche consumer products:

- Build a small list of people with visible pain signals: forum posts, GitHub issues, Reddit threads, app-store reviews, competitor reviews, LinkedIn posts, job posts, Slack/Discord conversations, support requests, or existing network intros.
- Send a specific, low-pressure message that references the context.
- Ask for feedback, a short demo, or permission to share early access; do not pretend the message is not marketing.

Sincere outreach template:

```text
Hi <name> — I saw your <post/review/thread> about <specific pain/context>.
I’m building <product>, which tries to solve <specific outcome> for <specific user>.
No pressure, but if this is still a problem for you, I can share a 2-minute demo or early access.
I’d especially value blunt feedback on whether <key promise> is useful in your workflow.
```

Avoid scraped bulk messages, fake personalization, fake urgency, hidden tracking, irrelevant DMs, or asking strangers to promote you.

### Launch communities

Use only when the product/story is relevant to the audience.

- **Product Hunt**: good for polished launches, maker tools, consumer apps, productivity products, AI tools, and products with strong demo assets. Prepare maker comment, crisp headline, gallery assets, FAQ, first comments, and a list of people who opted in to be notified. Ask supporters to “check it out and leave feedback,” not to blindly upvote. Product Hunt launch reference: `https://www.producthunt.com/launch`.
- **Hacker News / Show HN**: good for technically interesting products, developer tools, open-source work, infrastructure, AI/ML demos, data visualizations, or strong build stories. Lead with what is intellectually interesting, what was hard, what is novel, and what feedback you want. Follow HN guidelines and engage substantively.
- **Reddit**: good for niche communities when rules allow. Read the subreddit rules, search old posts, comment helpfully before posting, and tailor to the subculture. When in doubt, ask moderators. Do not cross-post the same pitch everywhere.
- **Indie Hackers, BetaList, niche forums, Discord/Slack groups**: useful when the founder can participate repeatedly and share build-in-public updates, lessons, or requests for testers.

### Social and creator channels

- **LinkedIn**: strongest for B2B, professional workflows, founder narrative, customer/problem education, and comments on ICP posts. Use concrete work examples, short demos, lessons learned, and customer/problem stories. Complete company/founder profiles; LinkedIn notes complete Pages receive more weekly views (`https://business.linkedin.com/marketing-solutions/linkedin-pages/best-practices`).
- **X/Twitter**: useful for builders, AI/dev tools, finance, creator products, and repeated short-form distribution. Use threads, demos, before/after clips, customer lessons, and replies to relevant conversations. Do not reply with generic spam.
- **TikTok/Reels/Shorts/YouTube**: useful when the pain/outcome is visual. Show the problem in the first seconds, demonstrate the transformation, use captions, and make the clip useful as a standalone tip. Study native formats with tools like TikTok Creative Center (`https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en`).
- **Creators/newsletters/podcasts**: approach only creators whose audience truly overlaps. Offer useful context, demo access, an affiliate/sponsor disclosure if paid, and assets that make coverage accurate.

### Content and SEO

Create people-first content around actual jobs-to-be-done:

- “How to solve <pain>” tutorials.
- “Best <tool> for <specific user/use case>” pages when honest and well-supported.
- Alternatives/comparisons against real competitors.
- Templates, calculators, checklists, sample projects, integrations, migration guides.
- Case studies and teardown posts once real users exist.
- Support docs that answer pre-sale objections.

Use the language users search for. Google’s SEO Starter Guide recommends considering what words users might search with, including beginner/expert phrasing (`https://developers.google.com/search/docs/fundamentals/seo-starter-guide`).

### Email and waitlist

- Collect permission-based email with a specific promise: beta invite, launch notice, weekly build notes, template, or early access.
- Segment by use case/source so launch messaging can be relevant.
- Send useful pre-launch updates: problem notes, demos, lessons, beta invites, and honest progress.
- At launch, send a clear CTA, what changed, who it is for, and how to give feedback.
- Follow CAN-SPAM/legal norms: no deceptive headers/subjects, identify the sender, include required address information, and provide clear opt-out.

### Paid channels

Do not lead with paid spend until message/channel fit has some signal. After organic or direct channels reveal converting messages, test:

- Apple Search Ads or Google App Campaigns for mobile apps.
- Google Search for high-intent problem/competitor keywords.
- Reddit/LinkedIn ads for narrowly defined B2B or niche audiences.
- Retargeting for landing-page visitors if privacy policy and consent setup are correct.

For Google Ads specifically, use `references/google-ads-bidding-and-simulators.md` and create `.projects/<project>/marketing/google-ads-test-plan.md` when paid Search, App, Performance Max, Demand Gen, Shopping, or retargeting is part of the launch. The practical rule is: define conversion tracking first, choose a campaign type that matches user intent, set a small test budget and stop-loss rule, then use bid/budget/target simulators when available before changing bids or Smart Bidding targets.

Google Ads troubleshooting guardrails:

- If a Search campaign has no impressions, do not assume creative is the only issue. Check account/billing/policy/ad approval basics, then inspect whether manual bids are too low or Smart Bidding targets are unrealistic.
- Very low manual bids, target CPA values far below historical CPA, or target ROAS values above recent performance can prevent campaigns from entering/winning enough auctions and may cause little or no serving.
- When conversion volume is the business goal, prefer a conversion-aligned strategy such as Maximize conversions over arbitrarily low bid targets.
- Treat Google Ads simulators as planning estimates for recent weekly impressions, clicks, cost, conversions, and conversion value; they are not guarantees. Conversion estimates require stable tracking and must account for conversion delay.
- Change one major lever at a time: budget, bid strategy, target CPA/ROAS, audience, creative, or landing page. Record changes in the launch/post-launch report.

## Minimum Response Requirements

When the user asks for a launch or publishing plan, the marketer response must explicitly include all of these sections even if the final answer is concise:

1. **Durable artifacts** — name the exact paths for `launch-plan.md`, `channel-map.md`, `outreach-log.md`, `app-store-submission.md` for mobile, and `post-launch-report.md`.
2. **Positioning and readiness** — target user, pain, one-sentence value proposition, CTA, honest limitations, launch readiness gates, and blockers.
3. **Channel plan** — owned/waitlist, founder-led direct outreach, Product Hunt or relevant launch communities, HN or Reddit only if appropriate, LinkedIn/social, content/SEO, creator/newsletter partnerships where relevant, and paid only after organic message/channel signal.
4. **Sincere introduction copy** — provide at least two tailored examples: one direct outreach message and one community/social post. Each example must disclose that the sender built the product, reference the specific audience/problem, ask for feedback or trial rather than blind upvotes, and mention respecting rules/moderators when community posting.
5. **Channel-specific norms** — Product Hunt, HN/Show HN, Reddit, LinkedIn, short-form video, and creator/newsletter outreach should have different guidance; do not collapse them into one generic blast.
6. **People-first content/SEO** — list concrete content assets such as tutorials, comparison pages, checklists/templates, integration guides, case studies, and support docs tied to user jobs-to-be-done.
7. **Email/waitlist** — permission-based follow-up, segmentation, launch CTA, useful updates, unsubscribe/opt-out, and non-deceptive sender/subject/legal basics.
8. **Apple App Store steps** — Apple Developer/App Store Connect access, app record, signed build upload, TestFlight, screenshots/metadata, app privacy/privacy manifests, review notes/demo credentials, submission, release mode, and common rejection risks.
9. **Google Play steps** — Play Console access, app creation, Android App Bundle/signing/versioning, internal/closed/open testing tracks, store listing assets, Data safety/content declarations, review submission, staged rollout, and common policy risks.
10. **ASO and Google Play listing quality** — screenshots and first frames, app previews/videos, descriptions, keywords/search language, localization, custom product pages or store-listing experiments, and review/rating loop. For Google Play country rollouts, create or update `.projects/<project>/marketing/play-store-localization.md` and use `references/google-play-listing-localization.md`.
11. **Country-specific Play Store listing plan** — for each target country/Play country, state listing language(s), local user pain wording, search phrases, competitors, localized screenshots/feature graphic/video needs, trust/compliance/pricing notes, launch channels, and experiment/measurement plan. Do not treat localization as literal translation or reuse one English listing globally.
12. **Measurement and operating loop** — UTMs/source tags, traffic, installs, signups, activation, feedback themes, reviews, crashes, app-store status, daily launch review, and issue creation for blockers.
13. **Cross-functional coordination** — state what project manager, product manager, devops, QA, UI designer, iOS/Android/app-development agents must verify; do not imply marketing can fix store compliance or product readiness alone.
14. **Google Ads planning when paid ads are included** — state campaign goal/type, conversion action, destination URL/app path, audience/keywords/geography, daily budget/test duration, bidding strategy, simulator check if available, stop-loss rule, and no-impression troubleshooting path for low bids or unrealistic CPA/ROAS targets. Use `references/google-ads-bidding-and-simulators.md` and name `.projects/<project>/marketing/google-ads-test-plan.md`.
15. **Trust boundary** — explicitly avoid fake engagement, astroturfing, scraped bulk spam, deceptive claims, unsupported superlatives, and upvote begging.

## Launch Plan Template

```markdown
# Launch Plan: <project>

Date:
Owner: NED Marketer
Related PRD/spec/release:
Product URL/app-store URL:

## Positioning
- Target user:
- Pain / current workaround:
- One-sentence promise:
- Why now / why this is credible:
- Honest limitations:

## Launch Readiness
- CTA and conversion path:
- Analytics/source tracking:
- Feedback/support path:
- Demo assets:
- App-store state if mobile:
- Risks/blockers:

## Channel Plan
| Channel | Audience fit | Asset/message | CTA | Owner | Timing | Tracking | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Sincere Introduction Copy
- Direct outreach draft:
- Community post draft:
- LinkedIn/X/social draft:
- Email/waitlist draft:

## App Store / Mobile Plan
- Apple App Store status:
- Google Play status:
- Screenshots/videos:
- Privacy/data safety:
- TestFlight/internal testing:
- Review risks:

## Measurement
- Success metrics:
- Source tags/UTMs:
- Google Ads test plan path if paid search/app/PMax/Demand Gen is used:
- Daily launch review cadence:
- Post-launch report path:
```

## App Store Optimization and Mobile Launch

Mobile launch marketing starts before submission. The app-store listing is both a compliance artifact and a conversion surface.

### Google Play listing localization by country

When a Google Play app targets multiple countries, create `.projects/<project>/marketing/play-store-localization.md` and use the detailed playbook in `references/google-play-listing-localization.md`.

Key rules:

- Optimize by target **country/Play country** and language, not by “global English.” Google Play country targeting is based on the user's Play country, so distribution, pricing, testing tracks, and listing assumptions should match that country plan.
- For each target country, research local search phrasing, competitor listings, reviews, local acquisition channels, price/currency expectations, privacy/trust objections, and screenshot conventions.
- Localize the promise, screenshots, feature graphic, video captions, examples, support language, and first paragraph of the description. Do not merely machine-translate English copy.
- Keep Google Play metadata clean: unique accessible title, concise 80-character short description, benefit-led full description, no keyword stuffing, excessive emoji/ASCII, misleading ranking/price claims, or repeated irrelevant terms.
- Use country/language-specific experiments when traffic allows. Test one meaningful hypothesis at a time, such as first screenshot value prop, short description, or feature graphic.
- Convert country-specific reviews/support objections into product, onboarding, localization, or listing issues.

For every country row, capture: `Country / Play country`, `Listing language(s)`, `Local user/job`, `Local pain wording`, `Search phrases`, `Competitors`, `Screenshots/feature graphic/video to localize`, `Trust/compliance notes`, `Price/currency notes`, `Launch channels`, and `Experiment/measurement plan`.

### Apple App Store listing guidance

Apple says the product page elements can drive downloads. Use App Store Connect metadata deliberately:

- App name, subtitle, icon, description, keywords, category, support/marketing URLs, privacy policy URL, age rating, pricing, in-app purchases/subscriptions if applicable.
- Up to 10 screenshots; Apple notes the first screenshots may appear in search results, so lead with the core value and main benefit.
- App previews autoplay muted, so the first seconds must communicate visually.
- Use Custom Product Pages for different campaigns/audiences when useful; Apple supports additional product-page versions with unique URLs.
- Use Product Page Optimization to test icons, screenshots, and previews; test limited changes per treatment so results are interpretable.

Sources:

- Product pages: `https://developer.apple.com/app-store/product-page/`
- Custom Product Pages: `https://developer.apple.com/app-store/custom-product-pages/`
- Product Page Optimization: `https://developer.apple.com/app-store/product-page-optimization/`

### Google Play listing guidance

Google Play store listing best practices emphasize clear user benefit and accurate assets:

- Short description, full description, icon, feature graphic, screenshots, video, category/tags, contact details, privacy policy, and accurate declarations.
- Focus the description on what users get from the app; avoid keyword spam, excessive emoji, misleading claims, or irrelevant repetition.
- Use professional localization for meaningful markets; Google notes translations can improve discoverability for worldwide users.
- Screenshots should show actual app value and supported platforms.

Source: `https://support.google.com/googleplay/android-developer/answer/4448378`

## Uploading a Mobile App to App Stores

Coordinate with `devops`, `qa`, `ui-designer`, and app-development skills before submitting. Marketing owns listing quality and launch readiness, not signing keys or build correctness alone.

### Apple App Store submission checklist

Official docs: Apple Developer Program (`https://developer.apple.com/programs/`), App Store Connect (`https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-sections`), add app record (`https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/`), upload builds (`https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/`), App Review overview (`https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review`), TestFlight (`https://developer.apple.com/testflight/`), review guidelines (`https://developer.apple.com/app-store/review/guidelines/`).

1. Confirm Apple Developer Program membership and App Store Connect access/role.
2. Confirm bundle ID, signing, app version/build number, supported platforms/devices, and export compliance needs with devops/app dev.
3. Create or update the app record in App Store Connect: platform, name, primary language, bundle ID, SKU, category, pricing/availability.
4. Upload a signed build using Xcode, Transporter, or command-line tooling; wait for processing.
5. Run TestFlight internal testing, then external testing if needed; external testing typically requires Beta App Review.
6. Complete product page metadata: description, keywords, support URL, marketing URL, screenshots/previews for required device sizes, app icon, age rating, copyright, review notes, demo credentials if login is required.
7. Complete privacy details and any required privacy manifests/SDK disclosures. Source: `https://developer.apple.com/app-store/app-privacy-details/` and `https://developer.apple.com/documentation/bundleresources/privacy_manifest_files`.
8. Attach the build to an App Store version, resolve warnings, submit to App Review.
9. Choose release mode: manual, automatic after approval, or phased release if appropriate.
10. After approval/release, verify listing links, install path, onboarding, analytics, crash reporting, and review-monitoring process.

Common Apple rejection risks:

- Crashes, incomplete app, broken login/demo credentials, placeholder content, misleading metadata/screenshots, privacy/tracking mismatches, inappropriate content, copied/spam app, payment/IAP violations, or guideline non-compliance. See Apple common rejections: `https://developer.apple.com/app-store/review/rejections/`.

### Google Play submission checklist

Official docs: Play Developer account (`https://support.google.com/googleplay/android-developer/answer/6112435`), create/set up app (`https://support.google.com/googleplay/android-developer/answer/9859152`), prepare/roll out release (`https://support.google.com/googleplay/android-developer/answer/9859348`), Play App Signing (`https://support.google.com/googleplay/android-developer/answer/9842756`), store listing assets (`https://support.google.com/googleplay/android-developer/answer/9866151`), Data safety (`https://support.google.com/googleplay/android-developer/answer/10787469`), prepare for review (`https://support.google.com/googleplay/android-developer/answer/9859455`), testing tracks (`https://support.google.com/googleplay/android-developer/answer/3131213`), publish app (`https://support.google.com/googleplay/android-developer/answer/9859751`), policy center (`https://play.google.com/about/developer-content-policy/`).

1. Confirm Google Play Developer account, Play Console access, payments profile if selling, and organization verification requirements if applicable.
2. Create or update the app in Play Console: default language, app/game, free/paid, declarations, category/tags, contact details.
3. Confirm package name, version code/name, app signing, target API level, permissions, and release artifact with app dev/devops. Google Play generally expects Android App Bundles for production distribution.
4. Enroll/use Play App Signing as appropriate.
5. Upload the app bundle/APK to internal testing first; run internal/closed/open testing as needed.
6. Complete store listing: app name, short/full description, icon, feature graphic, screenshots, optional promo video, privacy policy, contact details, and localization.
7. Complete required policy declarations: Data safety, content rating, target audience, ads, permissions, app access instructions, privacy policy, and any sensitive-feature declarations.
8. Prepare a release in the desired track, resolve warnings/errors, submit for review.
9. Roll out to production after approval, using staged rollout for riskier releases.
10. After release, verify Play listing, install path, Android vitals/crashes, reviews, acquisition sources, and support channel.

Common Google Play rejection/removal risks:

- Misleading claims/metadata, privacy/data safety mismatches, malware/deceptive behavior, inappropriate/restricted content, IP violations, ads policy violations, broken functionality, impersonation, excessive/sensitive permissions without justification, target API issues, or incomplete declarations.

## Post-Launch Operating Loop

For the first week after a meaningful launch, run a daily launch review. Coordinate with the project manager's routine service status check.

Use this output shape:

```text
Launch review — <project> — <date/time + timezone>
- Overall status: <healthy | watch | blocked>
- Channels checked: <Product Hunt/HN/Reddit/LinkedIn/email/app stores/etc.>
- Traffic/conversion: <visits, installs, signups, waitlist, activation, source notes>
- Feedback themes: <repeated questions, objections, praise, confusion>
- App-store status if mobile: <review/build/release/reviews/crashes>
- Actions created/updated: <issue IDs/links, owners, severity>
- Messaging changes recommended: <landing/listing/email/social updates>
- Decisions needed: <none or explicit ask>
- Evidence: <URLs, dashboards, posts, comments, screenshots, app-store links>
```

Create or update issues for:

- repeated confusion about positioning or pricing;
- launch channel rules violated or moderator pushback;
- conversion funnel drop-offs;
- install/onboarding failures;
- missing analytics/source tracking;
- app-store rejection, review delay, data-safety/privacy mismatch, or screenshot/metadata problem;
- high-signal feature requests aligned with the core PRD;
- support load the team cannot handle.

## Common Pitfalls

1. **Launching before the CTA works.** Attention is wasted if signup, install, demo, or feedback paths fail.
2. **Using the same copy everywhere.** Each community has different norms and context. Rewrite for the channel.
3. **Asking for upvotes instead of feedback.** This harms trust and may violate community rules.
4. **Pretending outreach is not marketing.** Be transparent that you built the product and why you are reaching out.
5. **Ignoring negative feedback.** The best launch signal is often confusion, objections, or “I would use it if…” patterns.
6. **Treating app-store upload as only a dev task.** Metadata, screenshots, privacy disclosures, review notes, and release timing affect marketing and trust.
7. **Making unverifiable claims.** Avoid “best,” “secure,” “private,” “free forever,” or compliance claims unless evidence and product behavior support them.
8. **Skipping legal/privacy basics.** Email, tracking, testimonials, ads, app privacy, and data safety disclosures must match reality.

## Verification Checklist

Before finishing marketer work, include a brief verification note with artifact paths, channels chosen, and evidence checked.

- [ ] Launch plan exists at a durable path or an existing project convention.
- [ ] Target user, pain, value proposition, CTA, and honest limitations are stated.
- [ ] Launch readiness gate covers conversion path, analytics/source tracking, support/feedback, demo assets, and mobile-store readiness if applicable.
- [ ] Channel plan covers owned, direct outreach, launch communities, social/creator, content/SEO, email/waitlist, and paid channels only where justified.
- [ ] Outreach/community copy is specific, transparent, non-spammy, and tailored to community norms.
- [ ] Product Hunt/HN/Reddit/community plans include rule/norm checks and avoid blind upvote requests.
- [ ] Content/SEO plan focuses on people-first useful content and user search language.
- [ ] Email/waitlist plan is permission-based and includes opt-out/legal basics.
- [ ] Mobile app plan includes Apple and/or Google account/access, app record/listing, build upload, screenshots/metadata, privacy/data safety, testing tracks, review submission, release mode, and common rejection risks.
- [ ] Measurement plan includes source tracking, launch review cadence, feedback triage, and post-launch report path.
- [ ] If Google Ads is recommended, the plan includes conversion tracking, campaign type, budget/test duration, bidding strategy, simulator check, stop-loss rule, and no-impression troubleshooting for low bids or unrealistic CPA/ROAS targets.
- [ ] Follow-up issues are created for missing launch readiness, missing analytics, app-store blockers, repeated feedback, or conversion problems.
