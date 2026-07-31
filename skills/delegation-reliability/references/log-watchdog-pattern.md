# Runtime log watchdog pattern

This reference captures the reusable evidence model for supervising process-local Hermes delegation. Adapt paths through the active profile; never hardcode a past batch ID.

## Useful markers

Typical runtime log lines contain:

```text
tools.async_delegation: Dispatched async delegation batch deleg_<id> (<N> task(s), session_key=...)
[<session-id>] agent.turn_context: ... platform=subagent ...
[<session-id>] agent.conversation_loop: Turn ended: reason=text_response(...)
tools.async_delegation: Interrupted <N> async delegation(s) (gateway shutdown ...)
[ASYNC DELEGATION BATCH COMPLETE — deleg_<id>]
```

Interpretation:

| Evidence | State |
|---|---|
| Dispatch marker only, within startup grace | Starting |
| Expected child session IDs plus recent activity | Active |
| Some normal child endings and another child active | Partially complete, healthy |
| All normal child endings, no batch notification yet | Consolidation pending |
| Batch completion marker | Complete |
| Interruption marker after dispatch and before completion | Interrupted |
| Fewer child starts than expected after grace | Missing child |
| Unfinished child with no recent activity beyond threshold | Stale |

## Selection rule

Prefer an explicit expected-active registry maintained by the parent workflow. If none exists, scan dispatches newest-to-oldest and select the newest batch that has neither a matching completion marker nor authoritative all-child normal completion. Do not classify historical, completed, or explicitly interrupted IDs as expected-active.

Consider only lines at or after the selected dispatch. A later completed dispatch does not erase an older unresolved batch; scanning for the newest *unresolved* batch avoids that blind spot. If all children ended normally but the consolidated completion payload has not arrived, classify it as `consolidation_pending`, not active or failed. A bounded delivery threshold may alert separately without claiming agents should still be running.

## Child discovery

Collect unique session IDs from `platform=subagent` turn-start lines after dispatch. For each child, track:

- most recent timestamp;
- whether a `Turn ended` marker exists;
- whether the reason is normal `text_response` or an interruption/failure.

Do not infer child identity from thread IDs or model-client lines; those can rotate.

## Alert behavior

Recommended defaults:

- startup grace: 3 minutes;
- stale threshold: 15 minutes for a 10-minute watchdog cadence;
- healthy/completed stdout: empty;
- unhealthy stdout: one concise message naming batch ID, expected/observed count, and failure class;
- deduplication: persist SHA-256 of the last emitted alert; clear it on healthy recovery.

A script-only cron job should use `no_agent=True`, because the script itself produces the exact alert and empty stdout intentionally means silence.

## Scheduler setup and verification

1. Save the watchdog under the active profile's `scripts/` directory; keep profile paths derived from the active profile rather than another profile's home.
2. Run it manually against the live log. Healthy stdout must be empty and exit status zero.
3. Create a recurring `every 10m` script-only job with origin delivery. Omit `repeat` for an indefinite recurring watchdog unless a finite lifetime was requested.
4. List jobs and verify the exact job ID, enabled state, schedule, script path, delivery target, and next-run timestamp.
5. Test transitions with synthetic log/state fixtures: healthy active, partial completion, all complete, missing start, interruption, stale activity, delayed consolidation, duplicate alert, and recovery.

The scheduler check is part of completion: creating a job without manual execution and readback is not verified.

## Recovery

When interrupted:

1. Check whether every requested durable artifact exists.
2. Treat missing or partial artifacts as non-verdicts.
3. Re-dispatch against the same immutable candidate and digest.
4. Mark the task as replacement work caused by interruption.
5. Verify the replacement's output handles before reporting success.

## Safety

- Read-only log inspection only.
- Never expose secrets copied from logs.
- Never make the watchdog launch replacement agents recursively.
- Never treat a stale log alone as proof of task failure if another authoritative completion record exists.
