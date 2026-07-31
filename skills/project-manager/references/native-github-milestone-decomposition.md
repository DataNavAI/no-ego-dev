# Native GitHub Milestone Decomposition and Sequential Execution

Use this procedure when an existing GitHub backlog contains broad “big tasks” that should become milestones/epics with small execution children.

## 1. Establish authority before editing

1. Verify repository and GitHub write access with harmless read/status calls.
2. Inspect requirements, architecture milestone order, open and closed issues, comments, existing child history, milestones, and current repository status.
3. Create one coordination-only planning issue for the backlog conversion before mutating issue structure.
4. Preserve the product/architecture milestone order when it already exists. Do not invent arbitrary buckets merely to satisfy a request phrased as “two milestones” or “into milestones.”

## 2. Separate planning hierarchy from execution units

- GitHub milestone = objective/timebox/release phase.
- Epic parent issue = coordination, scope, counts, dependency waves, and closure rules only.
- Implementation/QA/release-gate child = the assignable unit.
- A broad issue title/body must explicitly say `epic` or `sub-epic` and prohibit one-PR execution.
- Every child must contain outcome, scope, exclusions, owner/specialist, dependencies, acceptance, targeted tests/QA, and closure evidence.

Use a minimal taxonomy so counts remain machine-checkable:

- `type: epic`
- `type: implementation`
- `type: qa`
- `type: release-gate`
- `status: blocked`

## 3. Remove circular milestone dependencies

A late release-candidate/browser/device certification gate does not belong to an earlier implementation milestone merely because it tests that feature.

When remaining QA requires infrastructure or an immutable staged candidate from a later milestone:

1. Move its milestone and execution parent to the later release milestone.
2. Preserve traceability to the earlier implementation in the issue body.
3. Keep the gate open/blocked; never infer a pass from reclassification.
4. Let the earlier milestone close only on its implementation acceptance, while production remains blocked by the later release gate.

This enables strict milestone sequencing without hiding release risk.

## 4. Use native GitHub sub-issues

Prefer native sub-issues over prose-only checklists when supported.

REST shapes:

```text
GET    /repos/{owner}/{repo}/issues/{parent}/sub_issues
POST   /repos/{owner}/{repo}/issues/{parent}/sub_issues
       {"sub_issue_id": <numeric issue database id>}
DELETE /repos/{owner}/{repo}/issues/{parent}/sub_issue
       {"sub_issue_id": <numeric issue database id>}
```

A child normally has one execution parent. If work is reclassified to a later milestone, reparent it to the milestone that owns execution and keep earlier relationships as explicit body links.

## 5. Build dependency waves before dispatch

For each epic, publish:

- child issue list;
- dependency waves;
- implementation/refactor count;
- independent QA count;
- release-gate count;
- blocked count;
- currently unblocked children.

Planning later milestones is allowed, but implementation starts only in the first incomplete milestone. Dispatch one small unblocked child, finish/verify/close it, then advance according to dependencies.

## 6. Verify the hierarchy authoritatively

After creation or reparenting, read back GitHub rather than trusting creation output.

Fail the decomposition verification on:

- duplicate durable titles;
- missing milestone assignment;
- missing required child-body sections;
- unexpected native parent/child membership;
- label/count mismatches;
- blocked external gates that are closed or lack `status: blocked`;
- broad parents not marked coordination-only;
- later milestones accidentally reported as started.

Verify exact totals by milestone and classification, plus open/closed state. Store the summary on the coordination issue.

## 7. Handle controlled backlog deltas

A parent-closure audit may discover a genuine missing task after the initial decomposition. Do not waive it or force the old count to remain true.

1. Create one new small child under the audit/epic.
2. Update milestone totals, hierarchy verification, parent bodies, coordination comments, and `STATUS.md`.
3. Keep parent closure blocked until the child lands and immutable-main readback passes.
4. State that the change is a controlled backlog delta, not scope drift hidden in a parent.

A status PR can become stale while it is open if a new child is created. Re-read live counts at exact PR head, refresh only the snapshot fields, rerun link/count/repository checks, then merge.

## 8. Resolve issue-to-PR evidence correctly

Issue numbers and PR numbers share GitHub numbering but are not interchangeable. Never infer that issue `#25` was closed by PR `#25`.

Use `closedByPullRequestsReferences`, issue timeline/readback, or explicit issue comments to resolve the actual closing PR, then verify that PR's merged state and merge commit.

## Completion evidence

A successful conversion records:

- planning issue URL;
- milestone URLs/order;
- native parent/child hierarchy;
- exact implementation/QA/release-gate/blocked counts;
- zero-error authoritative readback;
- first active small child;
- explicit future auth/access blockers;
- merged canonical `STATUS.md` URL when the snapshot lands;
- confirmation that later milestone implementation has not started.
