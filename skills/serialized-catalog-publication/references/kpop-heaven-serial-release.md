# K-pop Heaven Serial Release Reference

## Research packet checklist

- [ ] Canonical Latin name, verified Hangul/local-language name, aliases, group/solo type, stable ID, route
- [ ] Exact Latin + Hangul query variants recorded
- [ ] Five stable source readbacks, or the project-approved lower count after all contract artifacts are updated
- [ ] Claims, evidence passages/locators, questions, and deterministic bindings are bidirectional and self-contained
- [ ] Korean fan sources are labeled `fan-secondary`/`discovery-only`; official/editorial corroboration is retained for ordinary final claims
- [ ] Sensitive/current/legal/health/relationship/personal claims use stronger sources

## Media checklist

- [ ] Source page identity, original URL, creator, displayed license/permission, source-of-original
- [ ] Source-page and license readbacks: status, final URL, content type, bytes, hash, semantic identity
- [ ] Downloaded original hash/bytes/dimensions/content type
- [ ] Deterministic derivative recipe, tool version, hash/bytes/dimensions/content type
- [ ] Crop/safe-area review, factual alt text, intended placement, attribution, takedown path
- [ ] Rights status preserved honestly; no inferred permission
- [ ] Owner standing approval applies only to ordinary factual/editorial media with all safeguards and no clearly wrong/prohibited condition

## Exact-SHA release checklist

1. Fetch current `origin/main`.
2. Rebase candidate branch and record exact base/head.
3. Run focused verifiers, lint, full tests, build, public-boundary, media-ledger, architecture, and project-specific release checks.
4. Independently inspect the exact diff and immutable PR identity; return `APPROVE` or `REQUEST_CHANGES`.
5. Merge only the reviewed head.
6. Verify the merge commit and exact deployment revision.
7. Read live version, release/catalog membership, Learn/Challenge routes, media URL/hash/credit, smoke, health, and rollback evidence.
8. If any readback is protected/403, browser-incomplete, or environment is staging rather than production, report that state instead of claiming publication.
9. Advance the artist queue only after production verification; otherwise enter `BLOCKED_EXTERNAL_AWAITING_OWNER_DEFERRAL`, ask once whether to defer, and keep the queue paused without repetitive checkpoint/tracker churn until the owner decides or new evidence arrives.

## Provenance/release failure patterns

- `rights.sourceUrl is not canonical`: reconcile the media ID-to-artist binding in the canonical release validator; do not weaken URL checks.
- Old artist count/order fixture: update the authoritative fixture and exact route/question counts only when the new artist is genuinely bound into release authority.
- Merged + staging-deployed but no live catalog readback: call it staging-verified, not published.
- Device login appears complete but `gh auth status` still shows the old account: the waiting login process was likely killed before saving; use a persistent PTY/background flow, authorize immediately, then verify username and `gh repo view`.
