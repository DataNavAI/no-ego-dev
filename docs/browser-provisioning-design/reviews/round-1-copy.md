# Round 1 English Copy Review

Status: NEEDS ITERATION
Reviewer: independent `english-copywriter` leaf
Candidate: untracked first visual revision

## Material findings

- `SCREEN-01` mixed platform-managed and delegated Daytona compute; resolve to one beta model.
- Identity/sign-in was absent.
- `SCREEN-04` claimed workspace cleanup but offered health-check retry.
- `SCREEN-05` showed a response before send and lacked pending/success/failure transitions.
- Duration, idle-cost, cleanup, and absolute trust claims exceeded evidence.
- Deletion lacked pending/failure/success copy.

## Disposition

Accepted. Revision 2:

- Uses a clearly labeled platform-managed limited-beta working assumption.
- Adds sign-in and independent compute/OpenRouter connection actions.
- Changes deleted-workspace recovery to **Create NED again**.
- Implements empty → pending → success request behavior; removes prefilled prompt/answer.
- Removes duration and unsupported idle-cost promises.
- Adds deletion pending, failure-preview, and success language.
- Reduces global and screen copy per the minimum-text pass.

Canonical full report: `round-1-copy-full.md`.
