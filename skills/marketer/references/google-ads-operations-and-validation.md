# Google Ads operations and opportunity validation

Use this reference for paid-Search opportunity tests, evidence triage, browser/UI operations, Ads Scripts, external API setup, and public demand-proxy research.

## Select the evidence branch

1. **Live Ads report:** authoritative for status, date range, impressions, clicks, spend, CPC, conversions, bidding, search terms, devices, geography, and impression share.
2. **Dated export:** usable only with its exact date/range.
3. **First-party attribution:** useful for visits and activation, but never proof of Ads clicks, spend, CPC, CTR, conversions, or campaign status.
4. **Public demand proxies:** useful for query language, intent, and prioritization, but never exact volume.

Separate verified findings, unavailable metrics, and hypotheses. Never calculate or characterize CPC without verified cost and click data for the same range.

## Lean opportunity tests

Paid traffic is a late validation layer, not the ideation engine.

1. Keep three to five materially different problems and give each an honest working prototype or fulfilled concierge path.
2. Narrow with keyword/SERP research, forecasts, moderated task tests, organic/direct recruitment, and rights/data/operations review.
3. Advance only the best-supported finalists when the budget can fund comparable tests. Match dates, geography, match types, treatment quality, and budget.
4. Judge completed value journeys, useful follow-on actions, return use, and fulfillment burden. CTR and waitlists are supporting signals.
5. Predeclare budget, stop-loss, minimum sample/window, and `INCONCLUSIVE` for sparse qualified clicks or completions. Require approval before expanding spend.
6. Create campaigns paused; verify destination, promised functionality, conversion tracking, geography, keywords/negatives, billing/policy state, and stop-loss before final enable confirmation.

## UI and Ads Scripts safety

Browser dashboard, Ads Scripts, and external API access are distinct capabilities.

- Confirm the signed-in identity, selected account, campaign, destination, and product before mutation. Never reuse conversion identifiers or site changes across products because names look similar.
- In the UI, choose what to retain from observed conversion/traffic evidence. If all rows show zero activity, say so and use a declared intent/eligibility fallback.
- For scripts, navigate through the product UI when direct URLs are unreliable. Verify the open script name and constants, save, preview, inspect intended changes/logs, and run only after preview or when an already-verified script is being used solely to retrigger authorization.
- Authentication, device approval, payment, and identity verification are owner actions. Stop and request the owner action; do not claim mutation success while authorization is pending.
- Verify actual execution from the exact script-history row, successful/error change details, logs, and the resulting campaign table/account query. A preview is not execution, and a stale grid does not replace mutation evidence.
- Prefer reversible, idempotent operations. When an API method is unsupported, use documented resource-name mutation operations and check every result rather than assuming a batch succeeded.
- Log only non-sensitive names/status/counts needed for verification. Redact account identifiers and never preserve browser-session content.

## External API readiness

UI admin access and Ads Scripts do not prove API readiness. A usable client requires an approved developer-token path, OAuth authorization, target customer context, and manager/login-customer context when applicable.

- API Center availability follows the selected Ads customer and is normally tied to a Manager account. Do not create a Manager account or choose durable country/time-zone/currency settings without owner approval.
- Inspect credential names and approved storage locations, never values. An installed SDK or OAuth client alone is insufficient.
- If a credential appears in chat, treat it as exposed: do not echo, store, reuse, or test it; require rotation and direct owner storage of the replacement.
- Prove readiness with a bounded read-only accessible-customer request and minimal account/campaign query. Record only redacted account identity, status, date range, row count, and the specific failure class.
- Keep authentication, token approval, user permission, and manager/customer mismatch as distinct failures.

## Live-report fallback and reversible experiments

When Ads metrics are unavailable:

- request a connected browser session or dated export with campaign/ad-group status, comparison range, impressions, clicks, CTR, spend, CPC, conversions, CPA/value, impression-share loss, search terms/match type, device, geography, schedule, bidding, and budget;
- label first-party arrivals as visits/visitors, not clicks;
- propose one major lever at a time, such as evidence-derived negatives, phrase/exact intent, message continuity, device/geography/schedule pruning, or simulator-informed bids;
- protect conversion rate, CPA/value, activation, and primary-journey completion with a rollback threshold.

For recurring reports, update both the collector/mapping and report contract. Always render whether spend, clicks, CTR, CPC, conversions, and CPA are connected, including explicit zero activity where required.

## Public search-demand proxies

When paid volume tools and first-party search data are unavailable:

1. Fix locale, market, date, product scope, and seed taxonomy.
2. Collect observed suggestions from at least two public engines and preserve each seed, original wording, source URL, and retrieval date.
3. Keep organic broad-seed recurrence separate from forced entity/modifier probes.
4. Inspect representative result types, incumbents, ambiguity, and query pollution. Do not use result counts as market size.
5. Use trends only for relative interest/seasonality when data loads; a daily trends feed or news feed is a narrow freshness diagnostic, not demand.
6. Assign a freshness SLA, source/provenance burden, geography/time-zone needs, correction burden, and operational fit before recommending an MVP.
7. Deliver a readable report plus source-linked machine-readable candidates. Label rankings `editorial product-priority` or `qualitative evidence strength`, never `search-volume rank` without a real volume source.

## Verification checklist

- Evidence mode and date range are explicit.
- First-party attribution is not relabeled as platform data.
- UI, Scripts, and API readiness are reported separately.
- Mutations are previewed/approved as required and read back from the exact target.
- Spend enablement, durable account setup, and authentication remain owner-controlled.
- No credentials, account identifiers, session data, or product-local paths appear in artifacts.
- Public proxies retain source/locale/date and make no volume claims.
