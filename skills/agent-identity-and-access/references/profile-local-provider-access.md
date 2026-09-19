# Profile-local provider access

## Evidence record

Record the active profile, provider, intended account/owner, approved scope, `GH_CONFIG_DIR` or equivalent profile-local credential home, harmless read probe, reversible write probe when needed, verification timestamp, and revocation/rotation owner. Never record credential bytes.

## Sanitized blocker

A blocker may contain provider, non-secret account label, denied operation, safe error class, owner action, and a readback command. It must omit tokens, one-time codes, cookies, raw auth files, secret-bearing URLs, and copied provider responses that may contain credentials.

## Stages

1. Guarded IFA status/request/verification when supported.
2. Non-secret inventory and exact account readback.
3. Least-privilege role or OAuth consent.
4. Harmless read, then reversible write probe if required.
5. Production operation enablement.
6. Rotate/revoke any one-time bootstrap secret after durable access works.
