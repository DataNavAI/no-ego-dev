# Product-oriented user communication

Use this reference for issue reports, blockers, progress updates, decision requests, incident summaries, and milestone handoffs.

## Communication contract

Lead with what changes for the product or its users. Translate technical evidence into:

1. **Affected product behavior** — which journey, promise, capability, or operating outcome is affected.
2. **User-visible effect** — what users can or cannot do, including data, trust, money, accessibility, or reliability consequences.
3. **Scope and urgency** — who is affected, how often, how severe it is, and whether there is a safe workaround.
4. **Current response** — what the team is doing and what remains uncertain.
5. **Product decision needed** — only the requirement or tradeoff the user owns, with a recommended default.

Technical evidence remains available for engineers and audits, but implementation terminology should not be the headline. Define necessary jargon in plain language after the product impact.

## Decision boundary

Ask users to choose product requirements and product tradeoffs, such as:

- the target audience or journey;
- required behavior and acceptable failure/degradation;
- privacy, retention, safety, trust, and rights promises;
- priority, launch timing, cost ceiling, supported surfaces, and rollback expectations;
- whether to preserve compatibility or intentionally change the public contract.

Do not ask users to choose frameworks, libraries, database schemas, cache policies, queue topology, retry algorithms, API internals, deployment wiring, or code structure unless they explicitly own technical direction or the implementation choice itself changes a product promise. The delivery team should derive implementation from the chosen product outcome and documented constraints.

When a decision is required, offer a product-framed recommendation and compact options. Explain each option through user experience, risk, cost, timing, and reversibility rather than technology preference.

## Rewrite examples

### Availability issue

**Technical-first**

> The database connection pool is saturated and requests are returning HTTP 503 after the retry budget is exhausted.

**Product-first**

> Some customers cannot complete checkout during traffic spikes. About 8% of attempts failed in the last hour; retrying later works, but customers may abandon purchases. We are restoring checkout capacity now and will confirm whether any orders were charged without confirmation.

### Data freshness issue

**Technical-first**

> Redis invalidation races with the write path, so stale cache entries survive until TTL expiry.

**Product-first**

> After a merchant updates a price, some shoppers may see the previous price for up to five minutes. Checkout still uses the correct price, but the mismatch can reduce trust. We recommend making product pages consistent immediately, even if updates take slightly longer to appear.

### Requirement decision

**Implementation-detail question**

> Should we use PostgreSQL or DynamoDB?

**Product-requirement question**

> Should account and billing updates always succeed or fail together, even if that makes peak writes slightly slower? We recommend yes because partial billing changes would be difficult for customers to understand and support to reverse.

### Release blocker

**Technical-first**

> The iOS signing profile expired and CI cannot produce an IPA.

**Product-first**

> We cannot ship the iOS update yet, so iPhone users will not receive the planned crash fix on schedule. Android is unaffected. Renewing release access restores the normal delivery path; no product-scope decision is needed.

## Mandatory communication envelope

Every user-facing communication includes four fields:

1. `Purpose:` Why this message is being sent now.
2. `Executive summary:` The product impact, current state, and next team step in plain language.
3. `Action needed:` The exact user decision/action required to keep the project moving, with a recommendation and deadline when relevant. Write `Action needed: None` when the team can continue without the user.
4. `Detailed information:` Verified links to canonical status, PRs, issues, decisions, incidents, dashboards, evidence, or specifications.

Before sending, **verify every link** resolves, is accessible to the intended user, identifies the stated artifact/revision, and contains the evidence described. Never fabricate a URL. If no user-accessible link exists, say `Detailed information: No user-accessible link is available` and provide a verified repository-relative or local path when useful.

## Compact status format

```markdown
Purpose: <status | decision | blocker | risk | completion | handoff>
Executive summary: <why this matters to the product and current state>
Product impact: <affected journey or promise>
User-visible effect: <what users experience>
Scope and urgency: <who/how many/how severe/workaround>
Current response: <what is being done and next evidence checkpoint>
Action needed: <product requirement/tradeoff, recommendation, deadline — or "None">
Detailed information: <verified canonical links or an honest unavailable/path note>
```

Never disguise a severe issue with polished language. Product-oriented means clearer consequence and ownership, not minimizing technical risk.