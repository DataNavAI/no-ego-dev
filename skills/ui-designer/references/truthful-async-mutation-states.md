# Truthful asynchronous mutation states

Use this pattern for consent, permission, token registration, revocation, refresh, payment, upload, or any workflow where local intent, OS/provider state, and server confirmation can diverge.

## State model

Model and persist these separately:

- `desiredState`: the user’s latest choice.
- `lastConfirmedState`: the last server/provider-confirmed truth.
- `pendingMutation`: operation kind, local request ID, and start time.
- `lastTerminalOutcome`: operation kind, closed result, request ID, and time.

Never project optimistic success. A retry first enters an explicit pending state; only confirmed success enters success, and explicit failure returns to a recoverable error/degraded state. On restart, restore the journal before permission/network checks so ambiguous enable/disable/refresh does not silently revert.

## Interaction rules

1. Disable duplicate submissions while one mutation is pending, but style the disabled control visibly differently from adjacent enabled actions.
2. Keep truthful last-confirmed language visible during pending or degraded states, e.g. “마지막 확인 상태”.
3. Preserve opt-out from every server-confirmed enabled state, including refresh pending/error and permission-denied-after-enable. Opt-out may supersede refresh; coordinate with architecture so stale responses cannot reverse final user intent.
4. For concurrent enable/disable/refresh, require a server-enforced monotonic preference revision or equivalent ordering contract. Equal revision is idempotent retry/refresh; newer intent wins; stale revision fails closed.
5. OS permission denial terminalizes pending enable/refresh before projection, but must not block server revocation.
6. Keep error copy honest about uncertainty: do not claim off until revoke confirms, or current token health until refresh confirms.

## Prototype and evidence

- Provide clean and annotated captures for pending, success, and both failure/recovery branches.
- Add deterministic review controls or hooks such as `completeMutation(true|false)`; do not rely on animation timing or a retry button that always simulates success.
- Exercise the real action: error → retry → pending → success, then error → retry → pending → failure.
- Record exact viewport, overflow, fixed-navigation bounds, target height, and disabled status.
- Measure persistent navigation labels and other small text independently; normal text still requires 4.5:1. Disabled controls may be exempt from text contrast, but must remain visibly distinguishable from enabled controls.
- Regenerate every affected clean/annotated capture and the contact sheet after shared token or navigation changes.

## Handoff checks

- Design brief names every state and transition.
- Interaction legend identifies retry, pending, opt-out, and settings recovery separately.
- Tech spec owns persistence, concurrency ordering, idempotency, restart recovery, and timeout behavior.
- QA covers restart at every pending/error point, stale response arrival in both orders, explicit success/failure, duplicate-input suppression, opt-out during degraded/pending state, and fixed-nav clearance at the exact viewport.
