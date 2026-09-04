# QA Runbook

This runbook governs manual live-provider QA. It is separate from credential-free CI and must never cause credentials or user-owned Telegram tokens to enter source control, logs, command arguments, URLs, or chat.

## Preconditions

- Run from an installed NED candidate or an explicit candidate checkout.
- On the configured macOS QA host, load Daytona authorization only from `/Users/moonk/.config/no-ego-dev/secrets/daytona_api_key` (directory `0700`, file `0600`). Do not search Keychain, profile directories, environment fallbacks, or other secret stores.
- Keep the Telegram bot token on NED's hidden TTY/Keychain path. It must not be passed through the shell environment or a QA command.
- Record the candidate revision and the exact command results in the QA report, with credentials redacted.

## Mandatory credential-validity preflight

**Before cleanup or any live QA lifecycle action, prove the current credentials are accepted without creating, changing, or deleting a Daytona resource.** Token age is not evidence of validity; a `401` may instead indicate revocation, the wrong account or environment, or an authorization boundary.

1. Use the approved candidate/QA runner's redacted Daytona authentication probe with only `/Users/moonk/.config/no-ego-dev/secrets/daytona_api_key`. Record only `accepted`, `401`, `403`, or transport failure; never record the key, request headers, URLs, or provider body.
2. If Daytona returns `401` or `403`, mark the run **BLOCKED** and stop before cleanup, token prompting, or resource mutation. Record the response class and account/environment selection, then obtain the owner-approved credential/account correction.
3. Through NED's hidden TTY/Keychain handoff—not a shell command, environment variable, or QA report—validate the Telegram bot token with Telegram `getMe`. Record only `accepted` and the verified `@username`, or `rejected`; never record the token or token-bearing URL.
4. If Telegram rejects the token, mark the run **BLOCKED**. Revoke/regenerate only the disposable test bot through BotFather, then repeat this preflight before any QA lifecycle action.
5. A run may continue only when both probes are accepted. Preserve the redacted result as preflight evidence; do not infer validity from issuance date.

## Mandatory Daytona cleanup preflight

**Before every live QA run, clean up NED-managed Daytona sandboxes and prove the result before starting the candidate.** This prevents an old sandbox, gateway, or model secret from masking a first-run, repair, or cleanup result.

1. If the local NED ownership state exists, run `ned destroy --yes`. It is the primary cleanup path because it deletes the exact recorded sandbox and model secret and reads both back for absence.
2. Directly enumerate Daytona resources using the configured QA credential. Limit reconciliation to resources with both labels `app=ned` and `managedBy=ned-cli`; never delete unlabeled or non-NED resources.
3. Delete every verified NED-managed sandbox still found, then re-list until the managed-sandbox count is exactly `0`. Delete only model secrets that are proven installation-owned by the same QA run; never delete unrelated Daytona secrets.
4. If a resource cannot be proven NED-owned, cleanup is **BLOCKED**. Stop the QA run, preserve non-secret identity/status evidence, and request an owner decision. Do not start QA against a dirty Daytona account.
5. Capture the preflight command, managed-resource count, and final zero-resource readback in the QA report. Do not record API keys, secret IDs, bot tokens, or model credentials.

A missing local ownership state does not authorize broad deletion. It means `ned repair` cannot safely identify a runtime; use the label-limited zero-resource reconciliation above, then start a fresh isolated QA lifecycle when authorized.

## Live lifecycle

1. After a successful zero-resource preflight, run the candidate's live acceptance runner.
2. Verify its create, gateway readiness, first response, `ned repair`, second response, and final `ned destroy --yes` path.
3. Treat any failed cleanup readback, extra NED-managed sandbox, credential disclosure, gateway failure, or missing second response as a release blocker.
4. The runner's `finally` cleanup is required but does not replace the preflight cleanup.

## Reporting

Each manual live QA report must include:

- candidate revision and host/interface;
- preflight managed-sandbox count and final zero-resource readback;
- create, repair, and destroy outcomes;
- the separate user-visible response evidence for both pre-repair and post-repair markers;
- cleanup result and any remaining blocker.

Credential-free CI remains the automated release gate. Live QA is evidence of the real provider lifecycle and must be reported separately.
