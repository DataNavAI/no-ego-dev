# Repository-root STATUS.md snapshot PR verification

Use this when a task asks for a canonical status snapshot in a normal mergeable PR, especially for a private GitHub repository.

## Evidence order

1. Fetch the default branch explicitly and record its full SHA before reading status evidence.
2. Read the governing issue, milestone parents, current execution issue, blocked QA/release gates, merged evidence PRs, architecture/contracts, QA report, and runbook.
3. Enumerate milestone issues from GitHub rather than trusting prose counts. Exclude pull requests from issue totals, then compare enumerated totals with each milestone's API `open_issues` and `closed_issues`.
4. Classify counts by durable labels (`type: epic`, `type: implementation`, `type: qa`, `type: release-gate`) and report milestone totals/open/closed separately from work-type breakdowns.
5. Write the snapshot against the recorded default-branch SHA. Do not silently roll in dirty local changes or newer unverified branch evidence.

### Proving exclusivity and inherited evidence

When the snapshot uses words such as **only**, **sole**, **all**, or **currently dependency-safe**, verify the complement rather than checking only the named positive examples:

- enumerate every issue in the relevant milestone/parent;
- read each child's live dependency declaration;
- prove that the named children are unblocked and every omitted child still has at least one additional predecessor or gate;
- keep coordination parents separate from assignable implementation/QA children.

For work-type breakdowns, derive categories from durable labels and report taxonomy exceptions explicitly. A plain `documentation` label is durable evidence for a documentation row, but it is not the same as a `type: documentation` label; do not silently normalize one into the other.

When a status claim inherits results from a checksum-pinned audit:

1. independently recompute and verify the supplied audit checksum;
2. compare the immutable revision/tree and material counts quoted by `STATUS.md` with the audit bytes;
3. resolve the durable audit comment/report target in the authenticated collaboration context and confirm it carries the same material verdict and evidence;
4. label product tests and scans as **reused, not rerun** unless this review actually executed them.

A linked audit may contain pre-existing machine-local paths or identifiers. Do not reproduce them in the status snapshot; classify the upstream disclosure separately as pre-existing/non-blocking unless the candidate newly exposes sensitive material or relies on an inaccessible evidence path.

## Isolation and scope

- Never edit a dirty active checkout. Create a worktree from the fetched remote default ref.
- If the checkout has a stale narrow `remote.origin.fetch` refspec, do not rewrite repository configuration merely to proceed. Fetch the required branch explicitly, for example:

  ```bash
  git fetch origin refs/heads/main:refs/remotes/origin/main
  ```

- Before commit and again after PR creation, prove that only `STATUS.md` differs from the fetched default branch.

## Private-repository link verification

Unauthenticated `curl` commonly returns `404` for valid private GitHub URLs. That does not prove a broken link. Verify in the authenticated collaboration context:

- issue: `gh api repos/OWNER/REPO/issues/N`
- PR: `gh api repos/OWNER/REPO/pulls/N`
- milestone: `gh api repos/OWNER/REPO/milestones/N`
- commit: `gh api repos/OWNER/REPO/commits/SHA`
- file/tree: `gh api 'repos/OWNER/REPO/contents/PATH?ref=REF'`

For a branch handoff, compare all of the following:

- local `HEAD`
- pushed branch SHA from `git ls-remote`
- PR `headRefOid`
- local `STATUS.md` blob SHA
- GitHub Contents API blob SHA for the pushed branch

Verify an unambiguous marker in the remote file content as well as the blob identity. Record that the target is awaiting merge and link the pushed branch or commit—not stale default-branch content.

## Mergeability and checks

A normal landing PR should report `mergeable: MERGEABLE` and an acceptable `mergeStateStatus` such as `CLEAN`. Draft state and mergeability are separate: when the task explicitly requests a draft landing PR, keep `isDraft: true` while still verifying `MERGEABLE`/`CLEAN`; do not convert it to ready-for-review merely to satisfy this check. For a non-draft request, verify `isDraft: false`. An empty `statusCheckRollup` means no PR checks are configured; report that truthfully and rely on the completed local verification rather than calling the absence of checks a pass.

## Recommended verification packet

Record:

- evidence/default-branch SHA
- local/pushed/PR head SHA
- changed paths
- test, build, Markdown, and `git diff --check` results
- authenticated link-resolution count
- handoff kind (`pr_branch` while awaiting merge)
- target URL and target/default refs
- `STATUS.md` blob SHA and content marker
- access/resolution check time

Run `scripts/validate_status_handoff.py` against this packet when available.

## Temporary evidence hygiene and final verification

- Invoke the skill's existing validator script directly; do not copy its source into profile/workspace `tmp` merely to run it. A copied `.py` validator can be misclassified as newly edited product code by workspace verification.
- If the validator needs a JSON packet, keep it disposable, outside the repository, and remove it before the final canonical verification. Never include the packet or a copied validator in the PR.
- Treat cleanup as a state change: after deleting auxiliary scripts, packets, generated files, or other evidence helpers, rerun the repository's exact bare canonical verification command so the final evidence is bound to the actual delivered state.
- Finish by proving all three independently: the repository worktree is clean, the pushed/PR head is unchanged, and no disposable evidence paths remain. Do not rely on an earlier passing run if the verification harness reports later edits.
