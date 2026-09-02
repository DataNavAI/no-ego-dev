# Owner-only manual live QA

This document is the authoritative boundary for a separately authorized, manual live `ned create` acceptance run. It is not credential-free CI and must not be run automatically.

## Approved credential boundary

- The only approved QA root is `/Users/moonk/.config/no-ego-dev/secrets`. The directory must be a regular owner-only directory with mode `0700`.
- The required credential is the regular file `/Users/moonk/.config/no-ego-dev/secrets/daytona_api_key`, with mode `0600`.
- Do not inspect, enumerate, copy, print, log, report, screenshot, or persist its value. Do not probe Keychain, environment fallbacks, installer locations, `$HERMES_HOME`, profile directories, or any alternate secret location.
- NED consumes the credential only through its secure runtime injection channel. It must never be placed in argv, an environment visible to child processes, files, URLs, logs, source, screenshots, or reports.
- A missing or unsafe approved root/file is `INCOMPLETE`; do not search elsewhere.

## Required acceptance procedure

1. Verify the exact candidate identity before the run and record only its SHA in redacted evidence.
2. Use a fresh isolated `HOME` and the approved computer-use flow to drive a real, non-dry-run `ned create` journey.
3. If a login, password, permission, 2FA, payment, or other external-authority prompt appears, stop and record `INCOMPLETE`; do not attempt to satisfy it.
4. Exercise the approved safe lifecycle cleanup and recovery path. Preserve non-secret evidence and require direct cleanup/recovery readback before calling the run complete.
5. Record only the candidate SHA, PASS/FAIL/INCOMPLETE status, redacted evidence location, created lifecycle handle status, and provider/local cleanup readback.
