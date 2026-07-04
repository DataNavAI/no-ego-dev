# Google Ads bidding and simulator notes

Use this reference when a launch plan includes Google Ads, especially Search campaigns, App campaigns, Demand Gen, Performance Max, Shopping, or retargeting.

Sources:

- Google Ads Search campaign not running: Low bid targets and optimization goals — `https://support.google.com/google-ads/answer/13456810`
- Estimate your results with bid, budget, and target simulators — `https://support.google.com/google-ads/answer/2470105`

## Practical rules for NED marketing work

1. **Do not launch paid ads until tracking and conversion definitions exist.** A campaign cannot be evaluated without source tags, conversion actions, and a feedback loop.
2. **Align bidding strategy with the business goal.** If the goal is as many conversions as possible within a set budget, Google recommends using a conversion-oriented strategy such as Maximize conversions rather than manually forcing a low bid target.
3. **Avoid impossible Smart Bidding targets.** Very low manual bids, target CPA values far below historical CPA, or target ROAS values above what historical performance can support may cause campaigns to enter too few auctions, win too few auctions, receive no impressions, or not serve at all.
4. **Use historical performance as the guardrail.** When target CPA is much lower than prior average CPA, raise the target or use a less constrained strategy for learning. When target ROAS is too high for recent performance, lower the target or expect limited serving.
5. **Use bid/budget/target simulators before changing spend.** Google Ads simulators estimate how different bids, budgets, or targets might have changed recent weekly performance: impressions, clicks, cost, conversions, and conversion value. Treat them as planning estimates, not guarantees.
6. **If a campaign is limited by budget, solve the budget constraint before over-interpreting bid simulations.** Google may show budget ideas instead of the Campaign Bid Simulator when the campaign is budget-limited.
7. **Conversion estimates require stable tracking.** Major conversion tracking changes can invalidate simulator estimates. Avoid moving/removing tracking tags for at least two weeks before relying on conversion estimates. Account for conversion delay, which may extend up to the configured conversion window.
8. **Change one major lever at a time.** For launch learning, avoid changing budget, bid strategy, target CPA/ROAS, landing page, audience, and creative all at once unless the current campaign is clearly nonfunctional.

## Paid Google Ads launch checklist

For a small NED launch, capture this in `.projects/<project>/marketing/google-ads-test-plan.md` or the main launch plan:

- Campaign goal: traffic, waitlist signup, purchase, install, lead, demo booking, or app action.
- Conversion action(s): exact event names and where they are measured.
- Landing page/app destination: URL, load check, CTA check, and privacy/consent check.
- Campaign type: Search, Performance Max, App, Demand Gen, Shopping, or remarketing; explain why it fits the product stage.
- Targeting: geography, language, audience, keywords/search themes, negative keywords or exclusions where relevant.
- Budget: daily budget, test duration, maximum test spend, and stop-loss rule.
- Bidding: initial strategy, target CPA/ROAS if any, and why the target is plausible from historical or benchmark data.
- Simulator check: whether bid/budget/target simulator estimates were available; summarize expected impressions, clicks, cost, conversions, and conversion value ranges if available.
- Creative/assets: headlines, descriptions, images/video if needed, app assets if App campaign, and policy-sensitive claims to avoid.
- Measurement loop: daily check for spend, impressions, clicks, CTR, CPC/CPA, conversions, conversion delay, landing-page activation, and feedback quality.
- Issue triggers: no impressions, no clicks, high spend/no activation, disapproved ads, broken conversion tracking, impossible CPA/ROAS target, irrelevant search terms, or landing-page mismatch.

## Troubleshooting: Google Ads campaign has no impressions

When a Search campaign is not running or has no impressions:

1. Verify account/billing/policy/ad approval basics first.
2. Confirm campaign goal and bidding strategy match the business goal.
3. Check whether manual bids are too low to enter/win auctions.
4. For Smart Bidding, compare target CPA/ROAS to historical performance.
   - Target CPA too low versus historical average CPA: consider raising target CPA or using a less constrained strategy.
   - Target ROAS too high versus historical average ROAS: consider lowering target ROAS or using a less constrained strategy.
5. Check budget limitation status and budget ideas.
6. Use the available simulator from the campaign, ad group, keyword, product group, App, Demand Gen, Performance Max, Shopping, or Hotel interface to estimate impact before changing bids/targets.
7. Record the change and monitor for enough time to account for learning and conversion delay.

## Marketer response pattern

When recommending Google Ads, do not say “increase bids” generically. Say:

```text
Google Ads test: use <campaign type> because <user intent/channel fit>. Track <conversion action>. Start with <budget/test duration>. Use <bidding strategy>. Before launch, check the bid/budget/target simulator; if target CPA is below historical CPA or target ROAS is above historical ROAS, loosen the target rather than starving the campaign. Stop or revise if <stop-loss rule>.
```
