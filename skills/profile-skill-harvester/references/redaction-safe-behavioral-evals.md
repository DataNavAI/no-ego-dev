# Redaction-safe behavioral evals

Use this when a behavioral eval covers credential-, lock-, auth-, or ownership-sensitive operations and the eval runner redacts prompts, outputs, expectations, or failure reasons before persistence or judging.

## Failure mode

Credential scrubbers commonly treat key-like words such as `token`, `secret`, `credential`, `authorization`, `password`, or `session_id` followed by `:`, `=`, or a CLI argument as sensitive. A regex may replace the value—or the remainder of the logical line—with `[REDACTED]`.

A behavioral prompt that demands an exact secret-shaped shell fragment can therefore become self-defeating:

- the evaluated model may see or emit a scrubbed fragment;
- the judge may compare a redacted value with the requested literal;
- persisted reports can hide whether the original output was correct;
- repeated model retries produce noisy failures without testing product behavior.

## Split the verification boundary

Do not weaken production ownership checks. Split them by evidence type:

1. **Deterministic tests verify private mechanics.** Unit/integration tests must prove exact owner-record parsing, nonce/token comparison, authenticated IPC, wrong-proof rejection, PID-reuse safety, cleanup, and timeout behavior.
2. **Behavioral evals verify policy and ordering.** Represent the private operation with a redaction-safe state label such as `release_owned_lock`. Require every terminal path to transition through `release_owned_lock` then `verify_lock_absent`.
3. **Keep external boundaries explicit.** Use a redaction-safe label such as `human_only_boundary`, with a deterministic sequence such as `persist_boundary_continuation -> release_owned_lock -> verify_lock_absent`.
4. **Describe, do not print, private transport.** State that production rereads the current owner record and passes its exact opaque owner nonce to the packaged helper without logging it. Do not require a literal secret-shaped CLI argument in model output.

This is not permission to replace exact ownership verification with prose. The helper and deterministic tests remain authoritative for private bytes; the behavioral eval tests orchestration semantics.

## Debugging procedure

1. Stop after the first repeated failure class; do not keep rerunning the same prompt.
2. Read the Markdown report and raw result artifact.
3. Inspect the runner's credential-redaction implementation and identify key/assignment patterns that consume values or whole lines.
4. Confirm whether redaction happens before model/judge invocation, only during serialization, or both.
5. Rename simulation-only states away from credential-key syntax and move private argument correctness into deterministic tests.
6. Rerun once with the revised redaction-safe contract.
7. Preserve both pieces of evidence: deterministic private-mechanics tests and the behavioral state-machine verdict.

## Review checks

- The production helper still requires exact owner identity and authenticated release.
- No process is signaled from stale PID metadata alone.
- Behavioral output cannot leak owner proofs.
- Every success, failure, timeout, cancellation, and human-only boundary cleans up explicitly.
- Redaction-safe wording does not erase the exact production requirement documented in the skill/reference implementation contract.
