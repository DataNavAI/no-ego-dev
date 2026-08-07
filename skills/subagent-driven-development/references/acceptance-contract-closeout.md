# Acceptance-contract closeout after merge

Use this when a parent epic or coordination issue appears ready to close after implementation/documentation PRs merge.

## Closeout gate

1. Re-read the live parent issue and enumerate every literal acceptance row. Do not infer acceptance from milestone percentages, merged PR count, or a summary document.
2. Classify each row as `PASS`, `PENDING`, or `CONTRADICTED`, with an immutable artifact/PR/report or authenticated tracker readback for every `PASS`.
3. Keep review kinds distinct. A documentation-only exact-SHA code review cannot substitute for an explicitly required independent PRD review or independent technical-design review. Decision-owner approval also does not satisfy a literal independent-review row unless the acceptance contract is explicitly amended.
4. If current owner policy supersedes an older process constraint (for example, a former review-round cap), reconcile durable authority before closure: either run the now-authorized missing gate or explicitly amend the parent acceptance text. Do not silently reinterpret historical comments.
5. Bind artifact approval to the reviewed bytes. An unrelated later `main` advance does not invalidate an artifact review when the approved artifact blobs are unchanged, but verify those blob hashes at closeout.
6. Verify the merge commit/tree includes the reviewed candidate bytes. For squash merges, compare tree IDs or exact governed blob hashes.
7. Verify child issue closure through authenticated state and `closedByPullRequestsReferences` where available. Auto-close linkage is evidence, not a reason to assume the parent also closed.
8. Before any external mutation, verify explicit authority to comment on and close the governed tracker items. With that authority, add one concise durable closeout comment only after all rows pass, then close children before their parent and re-read every final state. Without it, produce a read-only closeout assessment and leave the tracker unchanged and blocked on owner action.

## Fail-closed outcomes

- If any literal row is missing, leave the parent open and state the smallest exact unblock requirement.
- If comment or closure authority is absent, do not mutate the tracker; return the evidence-bound closeout packet and exact owner action required.
- Do not weaken acceptance merely to make tracker state match shipped code.
- Do not update status documents to claim issue closure before the close/readback occurs. If a post-merge status correction is required, land and review it first, then close the tracker.
- Tracker-only closeout may proceed in parallel with an unrelated repository reviewer, but it must not move the reviewer's base branch.
