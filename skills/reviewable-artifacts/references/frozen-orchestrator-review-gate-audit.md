# Frozen Orchestrator and Review-Gate Audit

Use this checklist for a composite review of a durable runner, controller/cron prompt, state gate, and regression tests when the bundle can authorize later side effects.

## Identity envelope

1. Hash every frozen artifact before reading or testing it.
2. Record mode and size when privacy or durability is in scope.
3. For Git dependencies, record both immutable blob identity (`commit:path` plus SHA-256) and mutable live identity (worktree HEAD, PR head/base, provider checks).
4. Re-hash frozen artifacts after the last probe.
5. If a dependency worktree or PR head moves mid-review, discard tests run against a mixed generation. Continue against an immutable blob when possible; otherwise return an incomplete result. Do not attribute concurrent external edits to read-only review commands.

## Authority trace

Trace executable authority end to end rather than trusting prompt prose:

- **Canonical result binding:** Parse report bytes and require repository, PR, lineage, round, bundle, attempt, head/base/tree/diff, and result to match. A separately supplied result flag must not override contradictory bytes. Hash byte-exact `read_bytes()` before strict UTF-8 decoding: `read_text()` can normalize CRLF and create a digest that is not the file's SHA-256.
- **Operational index:** A digest/status index is not canonical approval unless the provider/report evidence is re-read and matched before the side effect. If one bounded replacement is allowed, store evidence per attempt; a candidate/bundle-only key can make the replacement conflict with its prior `INCOMPLETE` record. Bind aggregate authority to the gate-selected latest terminal attempt and exact report digest.
- **Consume once:** Inspect every terminal claim state. A failed claim that can be reclaimed is not consume-once.
- **Generation ordering:** Same-candidate deduplication is insufficient; a new candidate round must wait until every bundle in the prior generation is terminal.
- **Bounded recovery and actual prompt:** Trace claim output through launch-time prompt generation, not only a prompt-builder unit. Do not infer recovery merely because scope differs from the default composite scope: a first specialized bundle also has a non-default scope. Require an explicit claim kind and a valid prior-attempt/report identity only for true recovery.
- **Mechanical boundary:** Locate the exact point where head, base, required checks, auto-merge, and queue state are re-read relative to the actual merge. Pre-spawn checks plus an LLM instruction leave a time-of-check/time-of-use gap. Post-side-effect verification must inspect the approved base, merge parent, and tree rather than only merged state and head.
- **Provider checks:** Verify configured required-check identities, including App/integration identity, not merely names or a nonempty green rollup. Reject ambiguous same-name checks. Evaluate ruleset sentinels such as `~ALL` and `~DEFAULT_BRANCH`, slash-aware wildcards, and exclusions with provider-accurate semantics.
- **Completion wakes:** Distinguish spawn success from eventual wake-command success. Require delayed failure and receipt-write failure to persist durably.
- **Launch compensation:** Force a primary receipt-update failure after a claim but before spawn. Compensation must still finalize or persist private fallback evidence; do not put compensation after an unguarded receipt write.
- **Dependency pinning and private state:** Verify digest and required mode immediately before every dependency invocation, including compensation and delayed validation—not only once at function entry. On a fresh root, inspect state-parent, state-file, and lock-file modes; private files inside a `0755` parent do not satisfy a private-directory contract.

## Read-only probes

Avoid incidental test writes where possible:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q -p no:cacheprovider <focused-tests>
```

High-value negative probes:

- contradictory report content versus supplied approval flag;
- CRLF or trailing-byte report input proving the stored digest is the exact file-byte digest;
- finalizing `INCOMPLETE`, claiming its bounded replacement, then successfully indexing/finalizing the replacement;
- first specialized-bundle claim producing an initial specialized prompt, not an `INCOMPLETE` continuation with a missing prior digest;
- reclaim after a claim is finalized failed;
- delayed nonzero wake process still alive at the first poll;
- primary receipt-update failure after claim but before spawn, with compensation/fallback still durable;
- `~ALL`, `~DEFAULT_BRANCH`, nested wildcard, and excluded queue rulesets;
- same-name required check from the wrong App/integration and duplicate-name ambiguity;
- active/incomplete prior generation followed by a new round;
- replacement prompt containing only the authorized recovery scope;
- post-merge base/parent/tree mismatch despite a matching head;
- fresh state-root parent/file/lock modes;
- multiprocess receipt updates preserving every field and private modes.

On macOS, multiprocessing launched from stdin may use `spawn` and fail because `<stdin>` is not importable. Retry with independent `python -c` subprocesses, such as through `xargs -P`; treat the first result as a harness failure, not a product defect.

## Reporting

Start with requested artifact identities and exactly one classification. For each blocker give severity, exact file/line or immutable-blob evidence, impact, and precise correction. Deduplicate by root cause, disposition every prior finding, separate valid from invalidated probes, and state whether persistent changes were made.
