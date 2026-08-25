# Workflow-Stall Postmortem to Canonical Skill Rollout

Use this when repeated agent activity produces little product progress and the user asks to correct the governing skill library, then deploy it across sibling profiles.

## Diagnose before editing

1. Separate **immediate product blockers** from **systemic multipliers**. For example, missing evidence/media may block one catalog item, while tracker commits, blind worker refill, and broad exact-base invalidation multiply that narrow blocker across the queue.
2. Reconstruct a deduplicated timeline from sessions, scheduler outputs, repository history, and direct live state. High session/commit volume is not product throughput.
3. Verify public truth directly. A merged PR, successful scheduler run, or staging deployment is not production publication. If cached reports conflict with live production/staging readback, correct the report before encoding policy.
4. Trace each repeated stop to the complete policy surface: orchestrator/controller skill, project-manager tracking rules, exact-candidate review rules, domain publication skill, evals, fixtures, support references, and any hard-coded scheduled-job prompt.

## Design the correction

Preserve real safety boundaries while removing compositional churn:

- keep provenance, identity, rights, route/set parity, exact final-candidate approval, deployment, rollback, and production readback gates;
- keep explicit owner-requested serial mode, but add a durable `BLOCKED_EXTERNAL_AWAITING_OWNER_DEFERRAL` state and ask once rather than retrying or creating filler work;
- make recurring ticks lost-event watchdogs, not evidence of a worker deficit;
- keep routine lease/review/CI/no-change state outside the product default branch;
- do not use tracker-only or verifier-only work to fill capacity;
- for unrelated documentation-only base movement, prove patch/affected-tree equivalence and reuse trustworthy evidence; rebase once at promotion and obtain one final exact current-base/current-head approval;
- measure released product capability, lead time, no-op ratio, tracker-only PR count, stale/rebase ratio, and unfinished attempts—not worker occupancy or commit count.

Write deterministic regression tests first. Update `SKILL.md`, `EVAL.yaml`, fixtures, and references together. If a new package is promoted from a live profile, make it a complete class-level package rather than a product-state dump.

## Freeze and publish canonically

1. Work from an isolated worktree at current `origin/<default>`; never use a dirty canonical checkout.
2. Inventory all sibling variants before choosing bytes.
3. Use a canonical version strictly newer than every divergent live variant. Equal version strings with different package digests are a release defect, not harmless drift.
4. Run focused and repository-wide tests, diff checks, and staged secret scanning.
5. Freeze one candidate generation and obtain independent review. Any byte change—including README or version metadata—invalidates the verdict and requires a fresh review.
6. Fetch again before push/merge and use guarded exact-head promotion.

## Transactional sibling rollout

1. Back up every affected target package outside repositories and hash the backup.
2. Recompare live targets immediately before mutation; block on drift after backup.
3. Overlay canonical files while preserving compatible target-only support files. Report each target as exact or adapted.
4. If a live profile has the same frontmatter skill name at a nested legacy path, back it up and retire it only after the canonical path is installed; require exactly one discovered package per skill name.
5. Verify canonical-file byte parity, preserved target-only files, fresh-process skill discovery, and post-adoption digests. Skill-only overlays usually hot-load; do not restart gateways without evidence that startup-loaded state changed.
6. Treat scheduled-job prompts and attached-skill lists as a separate policy surface. A skill rollout does not automatically repair contradictory hard-coded cron instructions.

## Reporting

Report canonical commit/PR/merge evidence, tests, security scan, backup location, each profile's exact/adapted status, preserved additions, duplicate retirement, discovery proof, and any still-separate scheduler prompt correction. Never conflate successful package copy with product publication or runtime behavior adoption.
