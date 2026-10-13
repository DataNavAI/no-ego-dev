# QA Runbook

This runbook governs manual live-provider QA. It is separate from credential-free CI and must never cause credentials or user-owned Telegram tokens to enter source control, logs, command arguments, URLs, or chat.

## Code tests and skill evaluation

Run `npm test`, `npm run check`, and `python -m pytest` for NED runtime, packaging and evaluation-engine changes. Code tests do not evaluate NED skills, their wording, historical versions, or bundled helpers. Evaluate skills with their EVAL.yaml and synthetic evaldata scenarios, recording actual agent outcomes and material failures separately. The spec runner lists declared manual skill cases as NOT RUN; a green code suite does not imply they passed.

Read [test-writing](skills/test-writing/SKILL.md) before adding or pruning tests. Prefer one strong contract check per distinct risk, retaining unique assertions when consolidating. The distribution packaging contract is covered by task-management TC-011; launcher behavior is covered by process tests rather than source phrase checks.

## Preconditions

- Run from an installed NED candidate or an explicit candidate checkout.
- On the configured macOS QA host, load Daytona authorization only from `/Users/moonk/.config/no-ego-dev/secrets/daytona_api_key` (directory `0700`, file `0600`). Do not search Keychain, profile directories, environment fallbacks, or other secret stores.
- Keep the Telegram bot token on NED's hidden TTY/Keychain path. It must not be passed through the shell environment or a QA command.
- Record the candidate revision and the exact command results in the QA report, with credentials redacted.

## Existing-workspace QA preflight

Live recovery QA requires an explicitly owner-authorized disposable existing workspace, its saved ownership state, and a disposable Telegram bot. The CLI and installer cannot provision a replacement. If no such fixture is available, report BLOCKED and run only credential-free checks.

1. Verify that the saved workspace ID, model Secret and Telegram bot belong to this QA fixture. Inspect the ownership state and Daytona readback without exposing credentials. Uncertain ownership blocks the run.
2. Isolate the fixture's local state from user installations. Record its initial workspace/gateway status and any unrelated resources; never delete an account's workspaces merely to obtain a zero-resource baseline.
3. Preserve the fixture through chat and repair. Do not destroy it as a preflight or routine token-recovery step.
4. Agree whether the fixture may be permanently destroyed after verification. Teardown is opt-in and limited to the exact fixture; otherwise retain it and record that choice.

## Live recovery procedure

1. Run `ned doctor` against the authorized saved fixture. Resolve credential failures through the documented hidden-input flow without deleting the workspace.
2. Send a unique synthetic marker through `ned chat` or the paired disposable Telegram bot and verify the first response.
3. Run `ned repair`, verify gateway readiness with `ned doctor`, send a second marker and verify the second response. Preserve workspace identity and owner pairing throughout.
4. If permanent fixture teardown was explicitly authorized, run `ned destroy --yes` only after recovery evidence is captured. Prove the exact workspace and model Secret absent; local ownership state may clear only after that proof. Otherwise retain the fixture.
5. Failed cleanup readback, credential disclosure, unexpected workspace replacement or missing second response fails acceptance. Preserve non-secret ownership evidence for recovery; do not clear state manually or delete unrelated resources.

The obsolete create-based acceptance controller has been removed. Record manual command results for the existing-workspace procedure rather than claiming a removed automated lifecycle ran.

## Reporting

Each manual live QA report must include:

- candidate revision and host/interface;
- initial fixture identity/status and final retained state or authorized absence readback;
- repair outcome and teardown authorization/outcome, if applicable;
- the separate user-visible response evidence for both pre-repair and post-repair markers;
- cleanup result and any remaining blocker.

Credential-free CI remains the automated release gate. Live QA is evidence of the real provider lifecycle and must be reported separately.
