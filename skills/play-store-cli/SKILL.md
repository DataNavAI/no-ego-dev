---
name: play-store-cli
description: "Use when automating Google Play Console access and Android publishing through CLI/API tools such as fastlane supply, EAS Submit, Gradle Play Publisher, or the Google Play Developer API."
version: 0.3.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, android, google-play, play-console, fastlane, supply, release-automation]
    related_skills: [play-store-publisher, devops, android-app-dev, react-native-app-dev, marketer, qa]
---

# Play Store CLI

## Overview

Automate Google Play publishing with CLI/API tools so NED does not have to fight the Play Console UI for repeat releases. Prefer CLI automation after the one-time Play Console/account setup exists: Play Console developer account, app record/package, Google Play Developer API access, service account, and appropriate app permissions.

This skill covers fastlane `supply` / `upload_to_play_store`, Expo EAS Submit, Gradle Play Publisher, and direct Google Play Developer API checks. It does **not** bypass Google account verification, payment, 2FA, policy declarations, app creation gaps, or missing permissions.

## When to Use

Use this skill when:

- A user asks for Play Store Console access via CLI/API.
- Play Console UI automation is flaky and repeatable CLI publishing is safer.
- A project needs `fastlane supply`, EAS Submit, Gradle Play Publisher, or Google Play Developer API configured.
- The team needs CI to upload AABs, promote tracks, stage rollouts, or manage Play listing metadata.
- A Google Play service account JSON exists or the user can create one.
- A previous release was uploaded manually and future releases should be automated.

Do not use this skill to create a brand-new Google Play developer account, pay fees, complete identity verification, answer policy declarations without product facts, or create final store listing copy. Hand those to the user, `play-store-publisher`, `product-manager`, or `marketer` as appropriate.

## Key Reality Check

A missing local environment variable, service-account file, or CLI login does not prove the release credentials are unavailable. Before asking for a new key:

1. Inspect the repository's publishing workflows and configuration to identify the expected secret and variable **names** and their consumers.
2. At an authorized hosted boundary, list only non-secret metadata such as GitHub secret names/timestamps or Expo environment-variable name, environment, type/visibility, and update metadata. Never retrieve, print, copy, or search logs/chat/session data for values.
3. Confirm `app.json`/`app.config.*`, `eas.json`, or the release lane actually consumes those names. A configured file variable is ineffective if app config still points to a local static file.
4. If CI/EAS holds the credential, keep it there and run the existing harmless authentication/preflight job as an actual CI preflight. Treat credentials as missing only after safe inventory plus an actual preflight/authentication failure.

CLI tools usually require one-time console setup first:

1. Google Play developer account exists and is verified.
2. App record exists in Play Console for the intended package name.
3. Google Play Developer API is enabled/linked for the Play account.
4. A Google Cloud service account exists.
5. The service account is invited in Play Console with app-level permissions.
6. The repo/CI has the service account JSON stored as a secret, not committed.

If any of these are missing, guide the user through the smallest one-time setup and then continue via CLI.

## Tool Choice

Prefer tools in this order:

1. **EAS Submit** for Expo apps already using EAS builds.
2. **fastlane supply** for general React Native, native Android, CI, metadata, track promotion, and repeatable release lanes.
3. **Gradle Play Publisher** for native Android/Gradle teams that want Play publishing embedded in Gradle tasks.
4. **Direct Google Play Developer API** only for custom checks/scripts when fastlane/GPP/EAS do not cover the need.

Use `play-store-publisher` for first-time app creation or UI-only blockers; use this skill for repeatable release automation.

## Service Account Setup

### User-facing setup request

Give this concise instruction instead of asking for passwords or raw Google credentials in chat:

```text
I can automate Google Play releases from CLI if you create a Play Console service account.

Please do this once:
1. Open Play Console → Setup → API access.
2. Link/select the Google Cloud project for this Play account.
3. Create or choose a service account.
4. Create a JSON key for that service account.
5. In Play Console → Users and permissions, invite/grant the service account access to this app.
6. Grant only the needed app permissions: view app information, view financial data only if needed, manage store presence if metadata uploads are needed, and manage releases for testing/production tracks that NED should publish to.
7. Store the JSON as a local file outside git or as a CI secret named `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
8. Tell me the package name and which tracks I may publish to: internal, closed, open, or production.
```

For local work, prefer a path such as:

```bash
mkdir -p ~/.config/noegodev/google-play
chmod 700 ~/.config/noegodev ~/.config/noegodev/google-play
# Save key as: ~/.config/noegodev/google-play/<project>-play-service-account.json
chmod 600 ~/.config/noegodev/google-play/<project>-play-service-account.json
```

Never commit the JSON key. Add/verify ignores:

```gitignore
*.json
!package.json
!app.json
!google-services.json
fastlane/play-store-credentials.json
.google-play/
```

If the repo genuinely needs `google-services.json` for Firebase, do not blanket-ignore it without checking existing conventions.

## Verify Access Before Publishing

For fastlane:

```bash
bundle exec fastlane run validate_play_store_json_key \
  json_key:/absolute/path/to/play-service-account.json
```

Also run a harmless read when possible:

```bash
bundle exec fastlane supply \
  --json_key /absolute/path/to/play-service-account.json \
  --package_name app.example.app \
  --track internal \
  --skip_upload_apk true \
  --skip_upload_aab true \
  --skip_upload_metadata true \
  --skip_upload_images true \
  --skip_upload_screenshots true
```

If this fails with permission errors, fix Play Console **Users and permissions** for the service account. If it fails with package/app not found, confirm the app record and package name in Play Console.

## fastlane supply Setup

### Install fastlane safely

Prefer a Gemfile so CI and local runs use the same version:

```bash
bundle init
bundle add fastlane
bundle exec fastlane --version
```

For existing projects, preserve the existing Gemfile and lockfile.

### Minimal Appfile

Create `fastlane/Appfile` without secrets:

```ruby
json_key_file(ENV.fetch("GOOGLE_PLAY_JSON_KEY_FILE"))
package_name(ENV.fetch("ANDROID_PACKAGE_NAME"))
```

Local shell example:

```bash
export GOOGLE_PLAY_JSON_KEY_FILE="$HOME/.config/noegodev/google-play/myapp-play-service-account.json"
export ANDROID_PACKAGE_NAME="app.example.app"
```

### Minimal Fastfile lanes

Create `fastlane/Fastfile`:

```ruby
def play_json_key_file
  ENV.fetch("GOOGLE_PLAY_JSON_KEY_FILE")
end

def android_package_name
  ENV.fetch("ANDROID_PACKAGE_NAME")
end

platform :android do
  desc "Validate Google Play API access without publishing"
  lane :play_validate do
    validate_play_store_json_key(json_key: play_json_key_file)
  end

  desc "Upload an AAB to internal testing as a draft"
  lane :play_internal_draft do |options|
    upload_to_play_store(
      json_key: play_json_key_file,
      package_name: android_package_name,
      aab: options[:aab] || ENV.fetch("ANDROID_AAB_PATH"),
      track: "internal",
      release_status: "draft",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Upload an AAB to internal testing and complete rollout"
  lane :play_internal do |options|
    upload_to_play_store(
      json_key: play_json_key_file,
      package_name: android_package_name,
      aab: options[:aab] || ENV.fetch("ANDROID_AAB_PATH"),
      track: "internal",
      release_status: "completed",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Promote a tested release to production staged rollout"
  lane :play_promote_production do |options|
    upload_to_play_store(
      json_key: play_json_key_file,
      package_name: android_package_name,
      track: options[:from] || "internal",
      track_promote_to: "production",
      release_status: "inProgress",
      rollout: options[:rollout] || "0.1",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
```

Run lanes:

```bash
bundle exec fastlane android play_validate
bundle exec fastlane android play_internal_draft aab:/absolute/path/app-release.aab
bundle exec fastlane android play_internal aab:/absolute/path/app-release.aab
bundle exec fastlane android play_promote_production from:internal rollout:0.1
```

### One-off supply commands

Use these when adding a Fastfile is overkill:

```bash
# Validate only; should not publish changes
bundle exec fastlane supply \
  --json_key "$GOOGLE_PLAY_JSON_KEY_FILE" \
  --package_name "$ANDROID_PACKAGE_NAME" \
  --aab /absolute/path/app-release.aab \
  --track internal \
  --release_status draft \
  --validate_only true \
  --skip_upload_metadata true \
  --skip_upload_images true \
  --skip_upload_screenshots true

# Upload to internal testing as draft
bundle exec fastlane supply \
  --json_key "$GOOGLE_PLAY_JSON_KEY_FILE" \
  --package_name "$ANDROID_PACKAGE_NAME" \
  --aab /absolute/path/app-release.aab \
  --track internal \
  --release_status draft \
  --skip_upload_metadata true \
  --skip_upload_images true \
  --skip_upload_screenshots true
```

Use `--validate_only true` before any new lane or unfamiliar account. Use `release_status: draft` for the first automated run unless the user explicitly approves a completed rollout.

## Expo EAS Submit

For Expo projects already building with EAS:

```bash
npx eas-cli submit -p android --profile production --latest --non-interactive
```

Do not use the moving `--latest` selector for a release whose identity has already been frozen. Capture the intended EAS build ID, source commit, package, version name/code, and download URL; download that exact AAB, record its SHA-256, and inspect its manifest before submitting it explicitly. Source config or a build request is not evidence about the resulting bytes.

If no service account is configured, use EAS setup or provide the JSON path:

```bash
npx eas-cli submit -p android \
  --latest \
  --service-account-key-path "$GOOGLE_PLAY_JSON_KEY_FILE"
```

Record in the project runbook whether EAS stores submit credentials remotely or whether CI supplies the JSON key at runtime. Do not upload service account JSON into source control.

For the complete version-bump, exact-artifact QA, Android Publisher edit/readback, review-state, and internal-testing bootstrap flow, follow [`references/expo-versioned-release-api.md`](references/expo-versioned-release-api.md). The internal-track exception is narrow: when no suitable device is available, an owner may authorize internal-only upload to obtain the exact signed artifact for QA, but no closed/open/production promotion is allowed until that same artifact passes the required device journey and fresh readback proves wider tracks were unchanged.

### Analytics-version allowlist synchronization

When release analytics, rollout monitoring, or post-release queries use a version allowlist, update that allowlist from the **exact release version** frozen for the submitted AAB. Treat the release tuple and analytics filter as one reviewed change: package, `versionName`, `versionCode`, source commit, build ID, and AAB SHA-256 must agree with the newly allowed analytics version. Never broaden the filter to an unbounded version family or infer it from `--latest`.

Add a RED regression before changing the allowlist: the new exact version must initially be rejected while the previous approved versions remain accepted. Then update the allowlist and prove the new version is accepted, an adjacent/unreleased version is rejected, and historical approved versions still work. Run this focused regression before upload and again in the release workflow when analytics configuration ships with the app or backend.

## Gradle Play Publisher Option

For native Android projects that prefer Gradle-integrated publishing, use Gradle Play Publisher (GPP):

```kotlin
plugins {
    id("com.github.triplet.play") version "<current-version>"
}

play {
    serviceAccountCredentials.set(file(System.getenv("GOOGLE_PLAY_JSON_KEY_FILE")))
    defaultToAppBundles.set(true)
    track.set("internal")
    releaseStatus.set(com.github.triplet.gradle.androidpublisher.ReleaseStatus.DRAFT)
}
```

Typical commands:

```bash
./gradlew publishBundle --validate-only
./gradlew publishBundle
./gradlew promoteArtifact --from-track internal --promote-track production --release-status inProgress --user-fraction .1
```

Confirm exact plugin version and task names from the repo's Gradle setup before committing changes.

## Metadata Management

fastlane `supply init` can fetch current metadata into `fastlane/metadata/android`. Use it only after access validates and the app exists:

```bash
bundle exec fastlane supply init \
  --json_key "$GOOGLE_PLAY_JSON_KEY_FILE" \
  --package_name "$ANDROID_PACKAGE_NAME"
```

Rules:

- Store metadata text/assets in git only if the team wants listing changes reviewed like code.
- Do not overwrite Play listing copy accidentally. For binary-only release lanes, set `skip_upload_metadata`, `skip_upload_images`, and `skip_upload_screenshots` to `true`.
- Coordinate listing changes with `marketer` and policy/product claims with `product-manager`.

## CI Secret Pattern

For GitHub Actions, store the whole JSON as a secret named `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, then materialize it into a temp file:

```yaml
- name: Write Google Play service account
  run: |
    mkdir -p "$RUNNER_TEMP/google-play"
    printf '%s' '${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}' > "$RUNNER_TEMP/google-play/service-account.json"
    chmod 600 "$RUNNER_TEMP/google-play/service-account.json"
    echo "GOOGLE_PLAY_JSON_KEY_FILE=$RUNNER_TEMP/google-play/service-account.json" >> "$GITHUB_ENV"
    echo "ANDROID_PACKAGE_NAME=app.example.app" >> "$GITHUB_ENV"

- name: Validate Play access
  run: bundle exec fastlane android play_validate

- name: Upload internal draft
  run: bundle exec fastlane android play_internal_draft aab:path/to/app-release.aab
```

Never print the JSON. Mask any derived values if needed. Clean up temp files at job end if the runner is not ephemeral.

## Publishing Report

After any CLI operation, write/update:

- `.projects/<project>/runbooks/google-play-cli.md`
- `.projects/<project>/release/google-play-publishing-log.md`

Report shape:

```text
Google Play CLI report — <project> — <date/time + timezone>
- Tool: <fastlane supply | EAS Submit | Gradle Play Publisher | API script>
- Package ID:
- Developer account / Play app:
- Service account identity: <email only, no private key>
- Secret location: <local path or CI secret name, no value>
- Track/action:
- Artifact/versionCode:
- Exact identity: <package, versionName, versionCode, source commit, build ID, AAB SHA-256>
- Command run:
- validate_only/draft/completed/staged rollout:
- Result/status:
- Review state: <uploaded | committed | ready to send | sent | in review | approved/live>
- Play Console URL:
- Follow-ups:
```

## Troubleshooting

- **`Google Api Error: Invalid request - Only releases with status draft may be created on draft app`**: the app is still draft/new; upload as `release_status: draft`, complete required Play setup, then publish/roll out through approved flow.
- **Permission denied / caller does not have permission**: invite the service account in Play Console Users and permissions and grant app-level release permissions for the needed track.
- **Package not found**: wrong `ANDROID_PACKAGE_NAME` or app record/package does not exist in Play Console.
- **Version code already used**: increment `versionCode` and rebuild the AAB.
- **Metadata overwritten unexpectedly**: use `skip_upload_metadata/images/screenshots` for binary-only lanes; review metadata diffs before upload.
- **`supply init` fails before first upload**: create the app and, if needed, perform the first minimal upload through Play Console UI, then switch to CLI automation.
- **JSON key exposed**: revoke/delete the service account key in Google Cloud, remove it from logs/history/secrets, create a new key, and rotate CI/local references.

## Verification Checklist

- [ ] Play app exists for the intended package ID.
- [ ] Google Play Developer API access is enabled/linked.
- [ ] Service account JSON is stored outside git or in CI secrets only.
- [ ] Service account is invited to Play Console with minimum required app permissions.
- [ ] `validate_play_store_json_key` or equivalent read-only validation passes.
- [ ] Package ID and versionCode match the release artifact.
- [ ] Exact AAB identity, build provenance, checksum, and manifest metadata match one another.
- [ ] Any analytics-version allowlist was changed from the exact frozen release identity and passed RED-then-green acceptance, adjacent-version rejection, and historical-version regression checks.
- [ ] First risky run uses `validate_only` or `release_status: draft` unless explicitly approved.
- [ ] Binary-only lanes skip metadata/images/screenshots unless listing changes are intended.
- [ ] CLI result is verified in Play Console or through a follow-up API read.
- [ ] Fresh readback verifies the target track/review state and proves non-target tracks were unchanged.
- [ ] Publishing report/runbook records tool, command, track, artifact, secret location, and current status.
