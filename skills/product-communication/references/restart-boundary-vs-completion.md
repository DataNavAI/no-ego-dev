# Restart Boundary vs. Completion

Use this when a controller, gateway, worker, or scheduler must be restarted before publication work can continue.

## The failure pattern

A message says `Restart the gateway to continue` and then lists process metadata. The user cannot tell:

- why the restart is required;
- why automation did not perform it;
- whether restart completes publication or only clears a preflight gate;
- what publication work still remains afterward.

This is misleading even when every PID, timestamp, and timeout value is accurate.

## Required explanation

State, in order:

1. **Active project/outcome:** name the release, deployment, harvest, or rollout.
2. **Current boundary:** explain the product-stage operation that cannot safely begin.
3. **Evidence:** say which running process predates which configuration and what runtime adoption therefore cannot be proved.
4. **Ownership:** explain why the owning request cannot safely restart its own controller and who can.
5. **Immediate effect:** state exactly which gate the restart clears.
6. **Remaining path:** name later verified gates—conflict resolution, candidate validation, exact-revision approval, evidence-only commit, CI, merge, rollout, or fresh-load checks.
7. **Next checkpoint:** state what a fresh request will verify and resume.

## Weak

> Restart the default gateway. PID 62187 predates the config update. Publication is blocked.

## Decision-ready

> Reporting the NoEgoDev skill-publication restart boundary.
>
> **Executive summary:** The NoEgoDev skill publication has not started because the running default gateway predates the timeout configuration required for long review tasks, so the harvest cannot prove those settings are active. This request cannot safely restart the controller that owns it. An external restart clears only this first preflight gate; it does not publish or deploy the skills.
>
> `Human action needed: Hermes administrator — restart the default Hermes gateway once now because automation cannot safely restart the controller that owns this request. This clears the runtime-adoption preflight; it does not by itself publish the skills.`
>
> **Detailed information:** After the restart, the next harvest must still resolve the open PR conflict, validate and approve an immutable candidate, create fresh evidence, pass CI, merge, and verify profile rollout.

## Pitfalls

- Do not headline PIDs, timestamps, config keys, or timeout values.
- Do not say `this unblocks publication` when it only permits publication work to resume.
- Do not hide later known gates to keep the message short.
- Do not report scheduler delivery status such as `ok` as proof that the harvest, publication, or rollout succeeded.
- Keep exact process evidence in `Detailed information` unless it changes the user's decision.
