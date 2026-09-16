# Frozen Browser Provisioning Design Review

Use this probe set for security-sensitive browser setup/provisioning UX before asking for human approval.

## Candidate identity

Freeze the exact review bundle before independent review:

- manifest every PRD/brief/guideline/prototype/script/screenshot/review artifact with SHA-256;
- record base revision, review round, review kind, required review kinds, and manifest digest in the reviewer packet;
- require the reviewer to verify the manifest before inspecting source or pixels;
- any source, screenshot, guideline, or behavior change creates a new candidate and requires recapture/re-review.

## Behavioral truth probes

Do not approve storyboards from screenshots alone. Exercise the runnable prototype and verify:

1. Identity/sign-in is explicit before provider authorization.
2. Each provider connects independently; partial, denied, expired, retry, and return states are representable.
3. Create remains disabled until required grants exist.
4. Progress uses backend-verifiable stages, not fake percentages or duration promises.
5. Recovery matches resource truth:
   - retained workspace → retry failed stage;
   - deleted workspace → create again with the same idempotent intent;
   - cleanup pending/failed → show that state and a cleanup/support path.
6. First value is empty composer → pending → success or sanitized failure. Never pre-render a successful answer.
7. Destructive action is disabled until acknowledgement and covers pending, remote failure/retry, and verified completion.
8. Route/state transitions move focus to the destination heading; async status uses live-region semantics.
9. Enabled touch targets are at least 44px.
10. Probe 320px and 390px mobile plus desktop for document overflow; a clean 390px screenshot does not prove narrow-mobile support.

## Copy truth gate

Remove or gate claims about completion time, idle cost, cleanup, privacy, provider scope, or authorization availability until architecture/runtime/legal evidence supports them. Prototype-only controls and simulated states must be visibly classified and excluded from production handoff.

## Review sequence

1. Create runnable variants and initial captures.
2. Run independent minimum-text copy review and UI review.
3. Apply findings to canonical source, not screenshots alone.
4. Re-run behavioral probes and regenerate all captures.
5. Freeze the manifest.
6. Dispatch fresh candidate-bound copy/UI reviewers.
7. Publish the review-only PR only after the frozen candidate is `APPROVED` with no unresolved material blocker. Omit reversible nits and optional hardening entirely rather than recording residual notes.
