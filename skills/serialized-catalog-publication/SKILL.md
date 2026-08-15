---
name: serialized-catalog-publication
description: "Use when expanding a factual/content catalog under provenance, media, release, and deployment gates. Supports owner-authorized serial publication or parallel evidence preparation with one promotion lane, exact final-candidate verification, and production readback before counting publication."
version: 1.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [catalog, content, provenance, release, exact-sha, kpop, multilingual, serial-workflow]
    related_skills: [github-auth, github-pr-workflow, project-manager, product-communication]
---

# Serialized Catalog Publication

## Trigger

Use for catalog expansion where each item/artist requires factual content, media, provenance, release integration, and deployment verification. This applies especially when the owner requires one artist to be published before work starts on the next.

## Core operating rule

### Mode selection

Use strict one-artist serial execution only when the owner explicitly requests artist-by-artist publication or a verified project contract requires it. Otherwise, research and evidence closure may run in parallel on isolated candidate lanes while final promotion remains serialized. Record the selected mode and its authority; do not silently turn a temporary owner instruction into a universal catalog policy.

In **strict serial mode**, maintain a single active artist lane:

1. Research and verify one artist.
2. Close content, evidence, media, rights, route, QA, and release gates.
3. Merge and publish that artist.
4. Independently verify the live release/readback.
5. Only then begin the next artist.

A blocked serial artist may advance only when the owner explicitly defers it. Never use parallel workers to work on multiple artist packs under a serial-publication instruction.

In **non-serial mode**, isolated candidate lanes may research and close evidence in parallel, but only one candidate may occupy the promotion lane at a time. Selecting a promotion candidate pauses competing release integration; it does not erase their reusable evidence packets. The selected candidate alone proceeds through final current-base/current-head approval, merge, deployment, and production readback.

When the active serial artist is blocked by unavailable media, protected access, unstable source/readback evidence, deployment authority, or another external dependency, enter `BLOCKED_EXTERNAL_AWAITING_OWNER_DEFERRAL`. Preserve the blocker once, ask the owner once whether to defer that artist, and stop repeated retries, verifier-only hardening, and checkpoint/status churn until new evidence or a decision arrives. If the owner declines deferral, keep the queue parked honestly; do not manufacture work to appear active.

## Workflow

### 1. Establish authority and queue

- Read the current PRD, release criteria, research protocol, status snapshot, and active GitHub state.
- Record the queue order and, in strict serial mode, the one active artist. In non-serial mode, record isolated candidate lanes plus the single selected promotion candidate.
- Distinguish candidate, blocked checkpoint, release-ready, merged, staging-deployed, and production-verified states.
- Do not count a candidate, verifier PR, or staging build as a published pack.

### 2. Verify access before work

Check the active GitHub identity, repository visibility, remote read, push capability, and workflow scope before dispatching long-running work. For multiple GitHub accounts:

- verify the intended account by username, not merely token presence;
- verify `gh repo view` and `git ls-remote` against the target repository;
- never expose tokens in chat;
- if device login is required, keep the login process alive while the user authorizes it; a foreground command killed by a tool timeout may leave the old account active;
- after authorization, re-run identity and repository checks before claiming access.

### 3. Research identity in both scripts

For Korean artists/groups, require:

- canonical Latin name;
- verified Korean/Hangul name from an authoritative or semantically verified source;
- aliases and exact query variants;
- searches using both Latin and Hangul forms;
- Korean-language sources as well as English/international sources.

Never infer a Hangul spelling from a search snippet, machine translation, or fan post alone. Record the exact query variants and the evidence that establishes the local-language identity.

### 4. Use fan sources with bounded authority

Korean K-pop fan sites, fan-maintained profiles, community wikis, and fan archives may be used for discovery, local terminology, aliases, chronology leads, and ordinary low-risk fact leads.

Classify them as `fan-secondary` or `discovery-only`. Do not present them as official or primary. A fan-source claim may support ordinary factual content only after stable-page and semantic verification, with corroboration from an official, primary, or reputable editorial source when practical. Never use fan sources alone for sensitive, high-risk, current, legal, health, relationship, allegation, or personal-data claims. Search snippets, aggregators, and social posts remain discovery leads.

### 5. Build a self-contained packet

Require a durable packet containing identity, aliases, sources, paired readbacks, claims, evidence passages and locators, questions, deterministic bindings, media provenance, rights status, attribution, alt text, crop review, takedown route, and exact blockers. Verify the artifact exists in the canonical checkout, parses, and reports counts/state.

Do not publish partial content. If a hard gate fails, record the exact field or evidence gap and keep `mustNotPublish=true`, `productionEligible=false`, or the project equivalent.

### 6. Apply media policy

Ordinary factual/editorial media may use owner standing approval when identity, source provenance, attribution, integrity, alt text, crop, takedown path, intended placement, and non-prohibited status are recorded. Still hold media when it is clearly wrong, fabricated, placeholder, prohibited for any use, endorsement/sponsorship framed, or has unresolved safety, privacy, accessibility, identity, provenance, or takedown defects.

Preserve original and derivative hashes, dimensions, content types, deterministic recipe/tool version, source-page/license readback, creator, attribution, and anti-endorsement framing. Never infer permission from silence or a badge.

### 7. Review and release exact revisions

#### Promotion-lane convergence

Keep research packets and blocked evidence durable without treating every intermediate checkpoint as a release candidate. A blocked checkpoint needs a full PR/review/merge lifecycle only when it preserves reusable evidence that cannot live in the canonical issue/artifact store or when repository policy explicitly requires it. Do not consume the promotion lane merely to restate a known blocker.

Select the nearest evidence-complete artist for promotion. Rebase that candidate once onto the current release base, reuse trustworthy unaffected checks, run only identity-invalidated gates, and obtain one final independent exact current-base/current-head approval. Batch or defer unrelated documentation/tracker merges until after promotion. **Do not commit routine queue or lease transitions to the product default branch.**

- Use a durable branch/commit/PR checkpoint early.
- Refresh/rebase stale branches onto the current main before review.
- Verify exact PR head, base, ancestry, and merge commit.
- Run focused verifiers, lint, full tests, build, public-boundary, media-ledger, architecture, deployment, smoke, and rollback/recovery checks required by the project.
- Treat fixture failures as real release-contract evidence; fix the canonical authority or expectation rather than weakening the gate.
- Require independent review with explicit `APPROVE` or `REQUEST_CHANGES` against the immutable candidate SHA.

#### Durable blocked-checkpoint merge

A blocked, fail-closed candidate may be merged as durable non-production state when repository policy permits it and the live PR is clean, mergeable, and covered by successful required checks. Before merging, reconcile the PR body with the actual head SHA (stale copied metadata is an audit defect), mark the PR ready if it is only draft because verification was pending, and confirm the changed-path set contains only candidate/checkpoint, verifier, and focused-test artifacts. Use the repository's normal merge method, then verify the merged PR, main ref, merge commit, exact changed files, and persisted checkpoint fields (`state=blocked`, `mustNotPublish=true`, zero admitted claims/questions/evidence, quarantine/rights uncertainty). Do not manually deploy or promote; distinguish an automatic staging-only post-merge workflow from production publication and report it separately.

For the exact-base refresh and merge/readback checklist, see `references/kpop-heaven-serial-release.md`.

### 8. Verify live publication before advancing

#### Staging is not production

A pack is not published merely because a PR merged or staging deployment succeeded. Independently read back:

- exact deployed revision from the live version endpoint;
- release/catalog count and artist membership;
- Learn and Challenge routes;
- rendered content/media where possible;
- canonical media URL/hash/attribution;
- smoke and health/readiness evidence;
- deployment environment and whether it is staging or production.

If an endpoint returns 403 or browser/readback evidence is incomplete, report the limitation and keep the serial queue paused. Enter `BLOCKED_EXTERNAL_AWAITING_OWNER_DEFERRAL` when that external condition persists, ask once for the owner's defer/hold decision, and do not create repetitive tracker/checkpoint work. Do not infer live content from a version response alone.

## Reporting

Use a compact status envelope:

- `Purpose`
- `Executive summary`
- `Action needed`
- `Detailed information`

Lead with product state: which artist is active, whether it is candidate/blocked/staging/live, why it matters, and what happens next. Name the exact SHA/PR and verification evidence only where it changes the release decision.

## Common pitfalls

- In strict serial mode, starting a second artist while the current one is blocked without explicit owner deferral. This does not prohibit isolated research/evidence work in non-serial mode.
- Calling a candidate or staging deployment “published.”
- Treating a worker summary as proof instead of independently reading the artifact, PR, CI, and live endpoint.
- Reusing stale PR bases after main advances.
- Treating a stable source URL as sufficient without semantic readback and content binding.
- Using fan sites as official evidence or inferring permission from a Creative Commons label without recording the license/source tuple.
- Lowering claim/question counts informally without updating the PRD, release criteria, schemas, validators, fixtures, and UX contract together.
- Declaring live success when protected endpoints return 403 or the browser cannot verify rendered content.

## Reference

See `references/kpop-heaven-serial-release.md` for the compact research, media, GitHub, and release-readback checklist distilled from prior execution.
