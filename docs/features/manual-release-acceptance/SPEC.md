# Feature: Manual release acceptance

Status: implemented
Related issues: [#239](https://github.com/DataNavAI/no-ego-dev/issues/239)

## User outcome and scope
Contributors attach passing acceptance evidence to the exact final code candidate without independent PRs overwriting one shared receipt. This gate validates evidence identity and structure; it does not itself execute or certify manual actions. Existing legacy receipts remain compatible. Secrets and runtime logs must not enter receipts.

## Requirements
- FR-001: A code-changing PR ends in an evidence-only commit. Its sole changed path is `.github/manual-test-results/<candidate SHA>.json` or the legacy `.github/manual-test-result.json`; candidate SHA equals the full first-parent SHA of that commit. New receipts use the candidate-specific path.
- FR-002: Require passing result, nonempty environment/observations/commands, valid nonfuture timestamp and exact candidate identity. Reject absent, malformed, mismatched and mixed code/evidence commits with nonzero exit.
- FR-003: Documentation-only changes need no receipt. Candidate-specific receipts and the legacy receipt count as documentation for this classification.
- FR-004: Independent candidate receipts have separate paths. Merging a legacy receipt update from main must not conflict with a branch that only adds its candidate receipt.

## Critical user journeys
### CUJ-001: Verify an exact code candidate
Actor: contributor/CI. Critical because stale evidence cannot certify changed code. Starting with committed code, run acceptance, add the matching receipt in a separate commit, and run the verifier with explicit base/head. Success is exit0 and the exact candidate identity; failure requires correcting evidence or rerunning acceptance after code changes. Existing legacy workflows continue to work.

### CUJ-002: Merge independent work
Actor: contributor. Critical because a shared mutable receipt repeatedly blocks otherwise clean merges. Two branches start from one base; one changes the legacy receipt and the other adds a candidate-specific receipt. Merge preserves both without conflict. Actual code conflicts still require normal integration and fresh evidence.

## Detailed test cases
### TC-001: Candidate receipts preserve isolation and exact identity
- Journey / requirements: CUJ-001/002; FR-001–004.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js). Legacy compatibility and later candidate rejection also covered by [manual-test-gate.test.js](../../../tests/cli/manual-test-gate.test.js).
- Preconditions / fixtures: Git and Node; disposable repo with synthetic app.js and copied verifier, local synthetic Git identity, no credentials or external dependencies. Initial base contains the legacy receipt.
- Given: two branches from that base.
- When: one updates the legacy receipt and one changes app.js, commits it, then adds its passing candidate receipt.
- Then: the candidate branch verifier exits0, and merging the legacy branch is conflict-free with both receipts retained.
- Steps and assertions: create repository/base; commit code; create matching receipt with fixed past timestamp and synthetic commands/observations; commit only receipt; verify exit0; branch/update legacy; merge into candidate branch and assert exit0/no unmerged files. Separately reject wrong filename SHA, wrong JSON candidate, failed result, malformed JSON and a receipt commit that also changes app.js. Verify documentation-only branch exits0 without evidence.
- Variants / negative cases: legacy exact receipt remains accepted by existing integration test. Later code advance remains rejected. Missing receipt/non-receipt head is rejected. Provider authentication, concurrency locks and interrupted external operations are inapplicable: verifier only reads local Git/files and changes no external state.
- Cleanup: remove only each disposable repository after test; all Git identities remain local. No runtime/profile state.
- Pass evidence: named Node assertions for accepted/rejected exit codes, conflict-free merge and unchanged candidate receipt.

## Coverage and acceptance
| Requirement | Journey | Test cases | Automated test |
| --- | --- | --- | --- |
| FR-001/002 | CUJ-001 | TC-001 | candidate and legacy integration tests linked above |
| FR-003 | CUJ-001 | TC-001 | documentation-only variant |
| FR-004 | CUJ-002 | TC-001 | independent legacy merge variant |

## Open questions and coverage gaps
The gate verifies the receipt contract, not the truth of manual observations; owners remain responsible for executing acceptance. No live-provider qualification is claimed.
