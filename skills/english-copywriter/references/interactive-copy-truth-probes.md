# Interactive copy-truth probes

Use these probes during Specialist review mode when visible copy changes at runtime. They assess copy truth; they do not replace implementation, accessibility, security, or binding release review.

## Outcome matrix

Exercise each applicable branch independently:

- Share: native success, cancellation, fallback success, fallback failure, total failure.
- Export/download: generation success, initiation failure, stale state, and mismatched payload.
- Quiz/challenge: correct, incorrect, repeated action, resume, completion, and result payload.
- Date/filter/tab: populated, empty, stale, keyboard-selected, and restored selection.
- Stepper: first advance, repeated activation, terminal step, and resumed state.

## Truth assertions

- `Shared`, `copied`, and `downloaded` name different outcomes and must match the branch that succeeded.
- Cancellation does not produce success or blame-oriented failure copy.
- Total failure produces recovery copy, never a success toast.
- Visible status, accessible status, progress, preview, and generated payload derive from the same outcome.
- A changed selection updates every dependent heading, body, badge, artwork label, action state, disabled reason, and route affordance.
- A dynamic identity stepper updates progress, art, visible name/role, fact, document title, and accessible label from the same record.
- Relative time agrees with the absolute timestamp and review clock everywhere it appears.
- An enabled verb-led control performs its promised action or exposes an honest unavailable state.
- Documentation labels examples as examples rather than claiming they are live demonstrations.

## Closure discipline

After nominal branches pass, probe identity, selection, outcome, and time closure across visible, hidden, accessible, generated, and documented surfaces. A green test is evidence only for the assertions it actually makes. Distinguish a product failure from a harness failure before recording a finding.
