> [!CAUTION]
> **REVIEW ONLY — DO NOT MERGE**
>
> This draft PR is a temporary review surface. It is not an implementation/landing PR and will be closed without merge after the review lifecycle is complete.

- **PR mode:** `REVIEW_ONLY`
- **Decision owner:** `<name/role>`
- **Cleanup owner:** `<name/role>`
- **Cleanup trigger:** `APPROVED | ABANDONED | SUPERSEDED`
- **Canonical artifact:** `<path>`
- **Canonical destination / handoff PR:** `<branch, PR URL, or pending>`
- **Review branch:** `review-only/<artifact>-<date>`
- **Temporary previews/resources:** `<URLs/resources or none>`

## Decisions requested

- [ ] `<DEC-01: exact decision>`

## Five-minute review path

1. Read `<rendered artifact link>`.
2. Review `<DESIGN_REVIEW.md or key section>`.
3. Leave comments in **Files changed** beside stable review IDs.
4. Record approval, requested changes, or abandonment explicitly.

## Scope

### Included

- `<reviewed artifact/decision>`

### Out of scope

- `<implementation/publication/other>`

## Verification evidence

- `<render/test/screenshot evidence>`

## Cleanup plan

After the outcome is explicit and accepted work is verified at the canonical destination:

- [ ] Re-read PR metadata and verify `REVIEW_ONLY` title/body plus the exact `review-only/*` head branch; stop on ambiguity.
- [ ] Post final outcome, revision, destination, and residual-risk comment.
- [ ] Close this PR **without merge**.
- [ ] Delete only the exact remote review head branch after confirming it is not the default/protected branch.
- [ ] Verify the review worktree is clean, then remove the exact local review branch and worktree.
- [ ] Remove only inventoried temporary previews, captures, review copies, access grants, and scratch assets.
- [ ] Retain the closed PR URL, disposition log, durable evidence, and canonical artifacts.
- [ ] Verify no unrelated resource or the only copy of accepted work was deleted.
