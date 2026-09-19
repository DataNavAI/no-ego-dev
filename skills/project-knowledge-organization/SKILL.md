---
name: project-knowledge-organization
description: "Use when starting or maintaining durable project knowledge for a client software project."
version: 0.2.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Project Knowledge Organization

## Overview

Keep project knowledge in a predictable folder so future work starts with context. NED treats docs as part of the product, not a side quest.

## Standard Layout

```text
.projects/<project-slug>/
├── README.md                 # current project brief and links
├── decisions/                # ADR-style decisions
├── prds/                     # core and feature PRDs
├── tech-specs/               # architecture and implementation specs
├── milestones/               # milestone goals and task maps
├── runbooks/                 # deploy, ops, debug recipes
└── evidence/                 # screenshots, logs, test outputs, eval results
```

## Workflow

1. Create or locate the project slug.
2. Write `README.md` with client goal, product type, repo links, environments, and current status.
3. Record assumptions and open questions explicitly.
4. Save PRDs, specs, decisions, and verification evidence as separate files with dates.
5. Update the knowledge folder after each milestone; do not rely on chat history.

## Canonical discovery and migration

1. Perform **canonical source discovery** before organizing: inventory repositories, tracked paths, default branches, document stores, issue trackers, shared drives, exports, owners, last verified times, and links from runtime/configuration. Classify each item as canonical, projection, working copy, archive, import candidate, or unknown; do not choose by recency alone.
2. Preserve the **archive/import distinction**. An archive is immutable historical evidence and never becomes current authority merely because it is complete. An import candidate must retain provenance, be reviewed/deduplicated, and be explicitly promoted into a named canonical source.
3. For Git material, record repository remote, **tracked path**, blob/commit identity, branch, merge base, and **ancestry**. Generated copies, untracked folders, and detached exports may support recovery but do not silently replace a tracked canonical source.
4. Use an **isolated Git handoff** for cross-repository movement: freeze source coordinates, use a clean branch/worktree, preserve attribution, import only approved files, verify destination diff/tests, push without force, and perform remote **readback** of exact head/base/path identities. Keep independently owned repositories separate.
5. Apply **mixed-repository reduction** when one folder combines unrelated products or authorities: inventory ownership and dependencies, select explicit canonical repositories, migrate in reviewable slices with redirects/indexes, and retain old locations as read-only archives until consumers are verified.

## Operational knowledge contract

- Write **role-readable operations** docs: separate owner/operator/developer/support/auditor entry points; state purpose, prerequisites, safe commands, expected output, rollback, escalation, and evidence. Avoid assuming one role's credentials or vocabulary.
- Maintain a **source-readiness manifest** for every promoted corpus: source owner, canonical URI/repository/path, immutable revision or observation time, license/classification, allowed uses, schema/format, completeness, freshness, validation, known gaps, downstream consumers, and next review.
- Prefer a **shared canonical repository** when several agents/products consume the same policy, prompt, catalog, or source corpus. Consumers pin a version and keep only product-local overlays; reconcile drift back to the shared source rather than copying divergent files.
- For an **unlinked Google Doc**, first search Drive by exact title/owner/time and inspect parent/location metadata. If browser or link discovery fails but authorized credentials exist, use the Drive/Docs **API fallback**, fetch document metadata and content, and perform readback of document ID, revision/modified time, owner, and destination link. Never fabricate a link or use a similarly named document without identity proof.

For **regulated/catalog lifecycle** work, add retention, classification, consent/rights, review/approval state, effective/expiry dates, takedown, supersession, audit, and deletion rules. Keep these controls domain-neutral; product-specific operating details belong in the owning project, not this reusable package.

## Pitfalls

- Do not dump raw transcripts as “knowledge”. Extract decisions and constraints.
- Do not store secrets, access tokens, or private customer data unless the workspace is explicitly approved for it.
- Do not let docs drift: when implementation changes architecture, update the tech spec or add a retrospective spec.

## Verification Checklist

- [ ] Project folder exists.
- [ ] Current goal and links are in README.md.
- [ ] PRDs/specs/milestones have stable paths.
- [ ] Evidence exists for completed work.
