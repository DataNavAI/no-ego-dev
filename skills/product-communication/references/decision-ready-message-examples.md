# Decision-ready message examples

These examples show how to preserve technical evidence while making product consequence, project motion, and user responsibility immediately clear.

## 1. Review infrastructure not ready

### Weak

> Gateway PID predates config mtime, so runtime adoption of child 1800 / gateway 3600 is unproven. Run `hermes gateway restart`.

### Decision-ready

```markdown
**Independent release review needs access to continue.**

**Executive summary:** The code candidate is ready, but reviewers may be stopped before completing their evidence. Publishing now could leave the release without a complete independent approval. The candidate and tests remain intact while review is paused.

**Human action needed:** Restart Hermes once so reviewers receive the full execution window. After the restart, the team will re-verify runtime readiness and continue review automatically.

**Detailed information:**
- <verified PR/status link>
```

The technical timeout/process evidence belongs in the linked runbook or appendix.

## 2. Product decision rather than database choice

### Weak

> Should we use Postgres transactions or DynamoDB eventual consistency?

### Decision-ready

```markdown
**A decision is needed on how quickly account changes must appear.**

**Executive summary:** Immediate consistency prevents billing or permission screens from briefly disagreeing, but updates may take longer during traffic spikes. Brief staleness improves responsiveness but can confuse users in trust-sensitive flows.

**Human action needed:** Confirm that billing and permissions must update everywhere immediately. Recommendation: require immediate consistency for those flows and allow brief staleness only for activity feeds.

**Detailed information:**
- <verified product requirement or decision record>
```

The delivery team chooses the storage and transaction design after the product contract is clear.

## 3. No user action

```markdown
**The checkout reliability fix is ready for release review.**

**Executive summary:** Checkout no longer drops orders during the reproduced traffic spike. Automated tests and production-like load checks passed; the team is proceeding to independent release review.

**Human action needed:** None. Review and rollout preparation will continue automatically.

**Detailed information:**
- <verified PR>
- <verified test or release evidence>
```

## 4. Partial blocker

```markdown
**The analytics rollout needs a privacy-retention decision.**

**Executive summary:** Event collection is implemented and can be tested internally, but production rollout cannot begin until the retention promise is defined. UI work and schema validation will continue while the decision is pending.

**Human action needed:** Choose whether raw event data may be retained for 30 or 90 days. Recommendation: 30 days to reduce privacy exposure while preserving enough data for launch analysis.

**Detailed information:**
- <verified PRD section>
- <verified privacy assessment>
```

This distinguishes blocked work from work that can continue.

## 5. Missing user-accessible evidence

```markdown
**Reporting the internal verification result.**

**Executive summary:** The recovery test passed and the team can continue to staging. The evidence currently exists only in a local test artifact.

**Human action needed:** None. The team will attach the evidence to the release record before production approval.

**Detailed information:** No user-accessible link is available. Verified local artifact: `artifacts/recovery-test/report.md`.
```

Do not invent a dashboard or repository URL.

## Pre-send checklist

1. Can a user understand the product consequence without opening a link?
2. Does the message say why it is arriving now?
3. Does `Human action needed` explicitly say either the required action or `None`?
4. If a decision is requested, is it about behavior/outcomes rather than frameworks or mechanisms?
5. Is there a recommended default and a clear consequence of delay?
6. Does the message distinguish paused work from work that continues?
7. Was every link opened or otherwise verified against the stated artifact/revision?
8. Are technical details preserved somewhere appropriate without becoming the user's burden?
9. Are severity, uncertainty, and limitations stated honestly?
10. Is sensitive operational material excluded?
