# Canonical publication before rollout

Use this reference whenever a harvest selects a new or updated reusable skill for sibling-profile distribution.

## Hard gate

A selected update is publishable only when all of the following are true:

1. the canonical repository contains the complete package (`SKILL.md`, evals, fixtures, references, templates, scripts, and assets required by the behavior);
2. repository validation and behavioral evaluation pass;
3. independent review approves the exact final code candidate SHA;
4. required CI passes;
5. the candidate is merged into the remote default branch;
6. the merge commit is fetched, reachable from the remote default ref, and verified against the approved candidate tree.

A local/global installation, profile-local copy, mutable checkout, candidate worktree, pushed branch, open PR, review approval without merge, or negative disposition is not publication.

## Source-of-bytes rule

Export rollout bytes from the verified remote-default merge commit into an immutable temporary source. Do not copy from:

- the live global/default skill library;
- a source profile;
- the candidate worktree, even if its tree currently equals the merge tree;
- an open PR branch;
- a rejected or blocked commit.

Tree equality can verify content, but it does not change source authority. The merge object is the rollout source.

## State advancement

Advance an observed profile/package digest only for a candidate merged into the verified remote default branch and only after the applicable rollout/adoption evidence succeeds.

For blocked, rejected, deferred, pushed-only, or open-PR candidates:

- preserve the prior observed digest;
- keep the candidate `newly_observed`;
- store any stable reason in a separate disposition map keyed by candidate digest;
- never let the disposition count as publication or baseline advancement.

A full-snapshot `--record` implementation must fail closed when any newly observed update is unpublished. Enforce this in executable code and with a deterministic invocation test; prose warnings and phrase-presence tests are insufficient.

## Owner instructions and negative gates

An explicit user instruction may change target scope, accept product risk, or direct further investigation. It does not turn an unpublished or rejected candidate into a canonical distribution artifact. If the user explicitly wants noncanonical bytes deployed, classify that as a separate emergency/manual operation, not a successful harvest, and do not advance harvest state.

## Contradiction scan before review

Before freezing the final SHA, recursively inspect the complete behavior surface:

- top-level `SKILL.md`;
- `EVAL*.yaml` and fixtures;
- scripts and executable helpers;
- nested references and templates;
- tests and examples;
- controller/cron prompts that encode rollout or state behavior.

Search semantically for bypass families, not only exact old phrases:

- `dispositioned` or `rejected` entries advancing a baseline;
- owner override after a negative gate;
- candidate worktree or exact source commit as rollout source without verified merge authority;
- open PR, pushed branch, local validation, or tree equality treated as publication;
- state advancement before merge or before rollout adoption proof.

When review finds a contradiction, preserve the finding, update every affected path, rerun deterministic and behavioral validation, freeze a new SHA, and obtain fresh exact-SHA approval. Previous approval is stale after any byte change.

## Completion evidence

A successful harvest report must identify:

- canonical package identities and versions;
- approved candidate SHA;
- remote-default merge commit;
- complete changed-package set derived from immutable base-to-merge coordinates;
- rollout source provenance from the merge object;
- per-target backup, digest, and fresh-load/adoption result;
- state entries advanced and unpublished dispositions deliberately left unadvanced.
