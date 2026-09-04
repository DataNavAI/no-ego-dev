# Decision-ready message examples

These examples show how to preserve technical evidence while making product consequence, project motion, and user responsibility immediately clear.

## 1. Review infrastructure not ready

### Weak

> Gateway PID predates config mtime, so runtime adoption of child 1800 / gateway 3600 is unproven. Run `hermes gateway restart`.

### Decision-ready

```markdown
**The requested <active project> release is waiting for independent review access.**

**Executive summary:** The <active project> code candidate is ready, but reviewers may be stopped before completing their evidence. Publishing the requested release now could leave it without a complete independent approval. The candidate and tests remain intact; after restart, the team will verify review access and continue toward the release.

**Human action needed:** **Workspace operator — now:** Restart the user-owned Hermes gateway once. Only the workspace operator controls this host service; review automation cannot safely restart it. This unblocks independent release review.

**Detailed information:**
- <verified PR/status link>
```

The technical timeout/process evidence belongs in the linked runbook or appendix.

## 2. Product decision rather than database choice

### Weak

> Should we use Postgres transactions or DynamoDB eventual consistency?

### Decision-ready

```markdown
**The requested <active project> account behavior needs a consistency decision.**

**Executive summary:** Immediate consistency prevents billing or permission screens from briefly disagreeing, but updates may take longer during traffic spikes. Brief staleness improves responsiveness but can confuse users in trust-sensitive flows. Delivery design will proceed after the product promise is set.

**Human action needed:** **Product owner — before implementation:** Confirm that billing and permissions must update everywhere immediately. Recommendation: require immediate consistency there and allow brief staleness only for activity feeds. Only the product owner can set this customer-facing promise; delivery automation cannot choose it. This unblocks storage design.

**Detailed information:**
- <verified product requirement or decision record>
```

The delivery team chooses the storage and transaction design after the product contract is clear.

## 3. No user action

```markdown
**The requested checkout reliability fix is ready for release review.**

**Executive summary:** Checkout no longer drops orders during the reproduced traffic spike. Automated tests and production-like load checks passed; the team is proceeding to independent release review and rollout preparation.

**Human action needed:** None

**Detailed information:**
- <verified PR>
- <verified test or release evidence>
```

## 4. Partial blocker

```markdown
**The requested analytics rollout needs a privacy-retention decision.**

**Executive summary:** Event collection is implemented and can be tested internally, but production rollout cannot begin until the retention promise is defined. UI work and schema validation will continue while the decision is pending.

**Human action needed:** **Privacy owner — before production rollout:** Choose whether raw event data may be retained for 30 or 90 days. Recommendation: 30 days to reduce privacy exposure while preserving launch analysis. Only the privacy owner can set this data promise; delivery automation cannot choose it. This unblocks production analytics.

**Detailed information:**
- <verified PRD section>
- <verified privacy assessment>
```

This distinguishes blocked work from work that can continue.

## 5. Missing user-accessible evidence

```markdown
**The requested <active project> recovery verification passed; staging remains next.**

**Executive summary:** The recovery behavior requested for <active project> passed verification, so the team can continue to staging. The evidence currently exists only in a local test artifact; the team will attach it to the release record before production approval.

**Human action needed:** None

**Detailed information:** No user-accessible link is available. Verified local artifact: `artifacts/recovery-test/report.md`.
```

Do not invent a dashboard or repository URL.

## Pre-send checklist

1. Can a user understand the product consequence without opening a link?
2. Does the message say why it is arriving now?
3. Does `Human action needed` contain only the required human action or exact `None`, with autonomous next steps kept in `Executive summary`?
4. For every human action, does the item explain why automation cannot safely perform it and what product stage/result it unblocks?
5. If a decision is requested, is it about behavior/outcomes rather than frameworks or mechanisms?
6. Is there a recommended default and a clear consequence of delay?
7. Does the message distinguish paused work from work that continues?
8. Was every link opened or otherwise verified against the stated artifact/revision?
9. Are technical details preserved somewhere appropriate without becoming the user's burden?
10. Are severity, uncertainty, and limitations stated honestly?
11. Is sensitive operational material excluded?
