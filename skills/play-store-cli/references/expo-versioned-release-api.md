# Expo versioned release through EAS and Android Publisher API

Use this only for a repeat release where Expo/EAS builds the AAB and an authorized CI, EAS, or external broker holds Play credentials.

## Select one automation owner

Inspect mobile-triggered workflows and their individual job conclusions before building. Choose either the repository workflow or one deliberate manual EAS/API path; do not let one version bump create two builds/uploads. A green preflight with skipped release jobs is not upload evidence.

Inspect only workflow/configuration, secret names/timestamps, and Expo variable metadata. Never retrieve values. If the existing holder passes its actual authentication preflight, reuse it in place; do not move credential material into the repository or agent environment.

## Freeze a valid release identity

1. Read all relevant Play tracks and the current authoritative local versionCode.
2. Allocate `max(local, latest uploaded Play) + 1` only if the result is an integer in `1..2100000000`; otherwise stop. Never wrap, reuse, clamp, or use `YYYYMMDDNN`.
3. Update the one authoritative Expo/Gradle version source and all required semantic-version files.
4. Resolve Expo config and assert package, versionName, and versionCode.
5. Commit the release version before build so provenance points to a durable source commit.
6. Capture the EAS build ID and source commit. Download that exact build rather than relying on a moving `--latest` selector.

Bind all later actions to:

```text
(package, versionName, versionCode, source commit, EAS build ID, AAB SHA-256)
```

## Verify the exact AAB

Store the download outside the repository. Compute SHA-256, test ZIP integrity, and use Bundletool or equivalent to read package, versionName, and versionCode from the built manifest. Require every field to match the frozen identity; source config and a successful build request do not prove artifact bytes.

Derive installable APKs from this AAB and exercise the required device/emulator journey. Record package-manager version readback, cold launch, changed/policy-sensitive screens, recovery behavior, and absence of fatal exceptions.

## Synchronize release analytics filters

If analytics ingestion, dashboards, alerts, or release monitoring use a version allowlist, derive the new entry from the exact frozen `versionName`/`versionCode`; do not use a moving build selector or wildcard family. Write a RED regression first that proves the new exact release version is rejected. After updating the allowlist, prove the exact version is accepted, one adjacent or unreleased version remains rejected, and previously approved versions are unchanged. Keep this test in the same release workflow so publishing cannot silently outrun analytics attribution.

### Internal-track QA bootstrap exception

If no suitable device is locally available, an owner may authorize uploading the exact signed AAB to **internal testing only** so it can be installed for physical-device QA. This is QA distribution, not broader release approval. Keep closed/open/production promotion blocked until the same identity passes required device QA. Fresh readback must prove only internal changed and every wider track remained unchanged.

## Android Publisher transaction and readback

1. Create one edit and upload the exact AAB.
2. Require the returned versionCode to equal the manifest-verified code.
3. Update only explicitly authorized tracks with the intended status and release notes.
4. Commit. If Play requires `changesNotSentForReview=true`, recreate/apply the edit with that mode and record that review submission remains pending.
5. Open a fresh read edit. Verify target track release name/status/versionCode, bundle presence, and every non-target track's unchanged state.
6. Delete abandoned or read-only edits.

Track state and review state are independent. Never infer `sent`, `in review`, `approved`, or `live` from upload success, edit commit, or track status `completed`. Verify Publishing overview separately when review submission is relevant.

## Durable evidence

Record the full identity tuple, allocation inputs, workflow owner, validation/QA evidence, exact target tracks, fresh API/Console readback, non-target-track proof, and one of: uploaded, committed, ready to send, sent, in review, approved/live. Record credential location only as a holder and non-secret name—never as a value.
