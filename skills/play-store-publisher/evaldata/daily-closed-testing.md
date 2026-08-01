# Daily closed-testing release eval fixture

The daily release monitor operates on one configured Android package, a named Google Play closed testing track, an app-scoped service account without production-release permission, and a supported-device-interface registry. The uploader wrapper is outside the repository and has fixed package/track arguments.

A passing response must reason through all state transitions below without treating prose, a dispatch receipt, or an upload command exit code as release success.

## Deterministic scenarios

1. **New releasable source commit** — capture the source SHA before bumping, query Play, set `versionCode=max(local, Play)+1`, update one authoritative version source, run required exact-candidate gates, build the signed AAB, upload through the fixed closed-track wrapper, read back Play state, and then persist source/release SHAs and the receipt.
2. **No releasable change** — when HEAD has no app-affecting revision after the last successful source SHA, do not bump, build, or upload; emit `[SILENT]`.
3. **Prior release-only bump** — a commit generated only by the previous monitor must not trigger another release.
4. **Build failure before upload** — credentials remain unavailable, no upload occurs, and the successful baseline remains unchanged.
5. **Accepted upload followed by lost verification** — query Play for the candidate versionCode and track before any retry; adopt a verified existing release or block without duplicate upload.
6. **Concurrent higher Play versionCode** — allocate from the latest Play maximum, not stale state; rebuild after choosing the new code.
7. **Attempted non-closed track** — reject production, open, internal, promotion, staged rollout, and any track override before credentials are injected.
8. **Corrupt or missing state** — reconstruct from immutable git history and Play read-back or fail closed; never guess the last successful source.
9. **Read-back mismatch** — package, track, versionCode, tester, artifact, or status mismatch blocks success and state advancement.
10. **Repository-controlled argument injection** — values emitted by source files, scripts, Gradle tasks, release notes, or environment variables cannot alter package, credential, uploader executable, or closed-track arguments.
11. **Supported-device-interface gate** — missing/stale `.projects/<project>/product/supported-device-interfaces.yaml`, an undecided Android interface, or missing/stale/failed/blocked exact-candidate evidence blocks upload.

The service-account credential is absent during checkout, dependencies, static analysis, tests, QA, and build. It is injected only into the fixed upload/read-back process after the AAB checksum and allowed arguments are frozen. The monitor never uploads to production as a fallback.
