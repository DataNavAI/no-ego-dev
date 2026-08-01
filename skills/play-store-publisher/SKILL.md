---
name: play-store-publisher
description: "Publish Android apps to Google Play, including daily change detection, mandatory versionCode updates, closed-testing uploads, and Play Console UI fallback."
version: 0.3.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, android, google-play, play-console, app-store, release]
    related_skills: [project-manager, product-manager, marketer, play-store-cli, android-app-dev, react-native-app-dev, devops, qa]
---

# Play Store Publisher

## Overview

Own the operational path from a release-ready Android build to a published Google Play testing or production track using the Google Play Console UI. This skill is for the human/account-bound parts of Play publishing: console setup, app creation, app signing declarations, tester lists, AAB upload, release notes, review/rollout screens, policy setup gates, and confirming the opt-in or store link.

Use build/development skills for creating the app binary; use this skill when the task moves into Play Console. The console is account-bound and may require login, payment, organization verification, 2FA, policy declarations, or permissions that NED cannot bypass.

## When to Use

Use this skill when:

- A user asks to upload or publish an Android app to Google Play.
- A release-ready `.aab` exists and needs to be uploaded through Play Console UI.
- EAS Submit, fastlane, or API upload is blocked by missing Google Play service account JSON or permissions.
- A Play Console app, testing track, tester list, or production rollout needs to be created or checked.
- Browser automation is being used against `play.google.com/console`.
- Internal, closed, open, or production testing setup is blocking launch.
- A mobile app needs a daily monitor that uploads each new releasable revision to its configured closed-testing track.

Do not use this skill for writing the app code, fixing Android build failures, writing store listing copy, or planning ad/user acquisition except to hand off blockers to `android-app-dev`, `react-native-app-dev`, `marketer`, `devops`, `qa`, or `product-manager`.

## Required Inputs

Before touching Play Console, collect or derive:

- Google Play Console developer account access and the selected developer account.
- App name, default language, app/game choice, free/paid choice, and package/application ID.
- Final Android package ID. Treat package ID changes as irreversible once uploaded to Play.
- Release artifact path or URL: `.aab`, not `.apk`, for Play Store release tracks.
- Version name and `versionCode`.
- Build provenance: commit/PR, CI/EAS/Gradle build ID, and artifact checksum when practical.
- Target track: internal testing, closed testing, open testing, or production.
- Tester list name and tester emails for internal/closed testing.
- Release notes, localized if needed. Minimal valid notes can be:
  ```text
  <en-US>
  Initial release.
  </en-US>
  ```
- Store listing assets/status: app icon, feature graphic, screenshots, short/full descriptions, category, contact email, privacy policy URL.
- Play policy setup status: Data safety, content rating, target audience, ads declaration, app access/demo credentials, government apps/news/health/financial declarations when relevant.
- Whether automated submission is expected. If yes, confirm Google Play service account JSON and Play Console API access; otherwise use UI.

## Release-Readiness Gate

Do not start uploading random artifacts. First verify:

1. **Package ID is final.** For example, a project-branded ID such as `app.datanav.news` is preferable to stale scaffolding like `com.example.*` or a previous working title. If wrong, stop and rebuild before upload.
2. **VersionCode increments.** Before every upload, query the latest uploaded Play versionCode and update the authoritative project configuration to `max(local versionCode, latest uploaded Play versionCode) + 1`. Rebuild after the update and verify the processed AAB contains that exact value. Never reuse an earlier code or rely only on a local increment.
3. **AAB is release-signed.** Expo/EAS production profiles or Gradle release builds should use the intended signing key and Play App Signing expectations.
4. **Artifact opens structurally.** At minimum, inspect it as a zip and confirm `base/manifest/AndroidManifest.xml` exists.
5. **Local sanity checks passed.** Run the repo's typecheck/tests/export/build checks or link to CI.
6. **Privacy/policy claims are truthful.** Do not guess Data safety, ads, location, account deletion, or content rating answers.
7. **Testing track has testers.** Internal testing release publication is not useful until at least one tester list is saved and selected.

## Daily Closed-Testing Release Loop

Use this loop when the user wants ongoing mobile builds delivered to closed testing. It is an unattended release path, so configure it only after the repository, package ID, authoritative version file, signed-build command, exact closed testing track, tester group, and verification method are known. Use a **dedicated app-scoped service account without production-release permission**; also remove permissions for open/internal tracks, promotion, metadata, and unrelated apps when Play IAM supports that split. A browser-only login or broadly privileged publisher credential is not sufficient for safe daily automation; report the setup blocker instead of pretending the monitor can upload.

### 1. Schedule and serialize the monitor

- Run once per day through Hermes cron or the project's CI scheduler, with a self-contained prompt and the mobile repository as `workdir`.
- Use `play-store-cli` only to provision and verify the constrained release identity. The scheduled job receives a fixed uploader interface, not the general-purpose Play CLI surface.
- Use a package-scoped lock outside the repository so two runs cannot build or upload the same revision concurrently.
- Persist release state outside git, including the last successful source commit, release commit, artifact checksum, uploaded versionCode, closed track, Play release ID/status, and verification timestamp.
- Keep Play **credentials unavailable** during checkout, dependency installation, repository scripts, static analysis, tests, emulator QA, and AAB build. Inject the constrained credential only into the fixed upload/read-back process after the candidate and gates are frozen.

### 2. Detect a new releasable revision before bumping

- Fetch the configured default/release branch and identify the **source commit before the release-only version bump**.
- Compare it with the source commit from the last verified closed-testing upload. Treat a commit generated only by this loop's prior version bump or publishing log as release bookkeeping, not a new app change; otherwise the monitor will release itself every day.
- A new app source, resource, dependency, native, manifest, build-configuration, or product-config revision is releasable. Repository-only documentation or release-bookkeeping changes may be recorded without producing a binary.
- If there are **No releasable changes**, do not bump, build, or upload. Leave durable state unchanged and keep a healthy scheduled run silent.

### 3. Always allocate and persist a fresh versionCode

For every release candidate that will be uploaded:

1. Read the authoritative local `versionCode` from Gradle, Expo app config, or the project's declared version source.
2. Query Google Play for the highest versionCode already uploaded to any track for this package.
3. Set the next value to **`max(local versionCode, latest uploaded Play versionCode) + 1`**.
4. Update the authoritative source file and any generated configuration through the framework's supported tooling. Never hand-edit two competing sources of truth.
5. Commit the version update on the authorized release branch when repository policy permits, and record both source and release commits. Do not advance the successful-release baseline yet.
6. Build the signed AAB from that exact candidate and inspect its manifest/bundle metadata to prove the package ID, version name, and versionCode match.

### 4. Gate, build, and upload only to closed testing

- Read `.projects/<project>/product/supported-device-interfaces.yaml`, identify every supported Android interface and target required by its verification tier, and require current `PASS` evidence against the **exact release candidate**. A missing/stale registry, undecided support, missing case, or stale/failed/blocked required target blocks upload.
- Run the repository's static analysis, tests, release build, and registry-required emulator/device QA before upload. A failed gate blocks the release and does not consume the source revision.
- Generate release notes from changes since the prior successful source commit.
- Upload through a **fixed-argument uploader** whose executable/configuration lives outside the repository and accepts only the frozen AAB path/checksum, configured package ID, and exact closed-track identifier. Reject repository-controlled arguments, environment overrides, track override, `production`, `open`, `internal`, promotion, staged rollout, and metadata operations before credential injection.
- Upload through the constrained service-account/API path to the exact **closed testing track** and tester group. **Never upload this daily build to production**, open testing, or internal testing as a fallback.
- If the configured track cannot be proven to be closed testing, fail closed without uploading.
- Use the track's normal completed/in-review state when eligible. For a Play app that is still globally draft or blocked by policy setup, preserve a draft and report the exact blocker rather than claiming rollout.

### 5. Verify and commit the release receipt

- Read back Play state through the API or refreshed Console and verify package ID, target closed track, versionCode, artifact processing, tester availability, and release status.
- Persist the successful source commit, release commit, AAB checksum, versionCode, track, Play release/status, and evidence URL or API response identifier only after verification.
- On failure, preserve logs/artifacts, leave the last-successful baseline unchanged for retry, and avoid duplicate upload if Play already accepted the versionCode; reconcile Play state before rebuilding.
- Alert only on a new release, a state transition, or a blocker requiring action. Healthy no-change runs should emit `[SILENT]`.

**Daily release alert envelope:** every non-silent release, blocker, or state-transition alert must lead with product/tester impact and use:

```text
Purpose: <why this closed-testing update is being sent and which tester/release outcome it affects>
Executive summary: <verified release/blocker state, user-visible impact, and what happens next>
Action needed: <None and the monitor's next action, or one exact product/release decision with timing>
Detailed information: <source/release SHAs, versionCode, AAB checksum, exact closed track, gate evidence, Play receipt/status, and verified links>
```

## Google Play Console UI Workflow

### 1. Open the correct console and account

- Navigate to `https://play.google.com/console`.
- Select the correct developer account if multiple accounts are visible.
- If the account is not verified, payment/identity/organization verification may block app creation or publication. Report the blocker and ask the user to complete account-bound steps.

### 2. Create the app

From **All apps**:

1. Click **Create app**.
2. Fill:
   - App name.
   - Default language.
   - App or game.
   - Free or paid.
3. Accept required declarations only if they are true and the user/project agrees:
   - Developer Program Policies.
   - Play App Signing Terms.
   - US export laws.
4. Create the app and record:
   - App name.
   - Package name once associated.
   - Play Console app URL/app ID if visible.

### 3. Prefer internal testing first

For first release, use **Test and release → Testing → Internal testing** unless the user explicitly requests another track.

Internal testing is best for confirming install flow, Play App Signing, package name, opt-in link, and review blockers without a public launch. It supports up to 100 joined internal testers; more can be listed, but only the first 100 to join count.

### 4. Create or select testers before final rollout

On **Internal testing → Testers**:

1. Click **Create email list** or select an existing list.
2. Use a clear name such as `Internal testers`.
3. Add tester emails; press **Enter** after typing each email so it appears in the added-email table.
4. Click **Save changes** in the dialog.
5. Back on the Testers tab, ensure the list is selected.
6. Click the main **Save** button.
7. Verify the page no longer says the release will be unavailable because no testers are specified.

Known UI pitfall: Play Console can show an enabled **Save changes** button but browser automation clicks may not actuate it. If this happens, use a visible Chrome/CDP session, refresh once, reopen the dialog, press Enter after the email, and use a real mouse/keyboard if needed. Do not claim testers were saved unless the dialog closes and the Testers tab reflects the saved list after refresh.

### 5. Create the release and upload AAB

On **Internal testing → Releases**:

1. Click **Create new release**.
2. Confirm Play App Signing setup/declarations if prompted.
3. Upload the `.aab` using the file picker/drop zone.
4. Wait for Play to process/optimize the bundle.
5. Confirm the processed bundle shows the expected:
   - Package ID.
   - Version name.
   - Version code.
   - Install/download size.
6. Add release notes.
7. Save the draft.

If Google flags missing deobfuscation or native debug symbols, classify it correctly:

- Missing deobfuscation file is usually non-blocking for a first/minified-off release but should become a follow-up for crash readability if R8/ProGuard/minification is enabled.
- Package name, signing, version code reuse, policy, or target SDK failures are blockers.

### 6. Preview, confirm, and publish/roll out

1. Open the draft release.
2. Click **Preview and confirm the release**.
3. Read warnings. Do not blindly ignore:
   - **No testers specified** blocks useful internal testing; fix Testers first.
   - Policy/data-safety/content-rating/app-access warnings may block review or production.
4. Click **Save and publish**, **Start rollout**, or the current track's equivalent final button.
5. If a confirmation dialog appears, confirm only when the track, artifact, package, and testers are correct.
6. Verify final state:
   - Internal testing status is active/in review as shown by Play.
   - Opt-in link is present and copyable.
   - Release appears under the intended track.

### 7. Record a publishing report

Add or update a project-local runbook/status file, for example:

- `.projects/<project>/runbooks/google-play-release-prep.md`
- `.projects/<project>/release/google-play-publishing-log.md`

Use this report shape:

```text
Google Play publishing report — <project> — <date/time + timezone>
Purpose: <why this publishing report exists and which tester/release outcome it supports>
Executive summary: <verified current Play status, tester impact, largest blocker/risk, and next state>
Action needed: <None and the team's next action, or one exact product/release decision with timing>
Detailed information:
- App name / Package ID / Developer account:
- Track / tester group / opt-in link:
- Release / versionCode / current Play status:
- Artifact path / URL / checksum:
- Build source commit / PR:
- Store listing / policy setup status:
- Actions completed / blockers / follow-up issues:
- Evidence: <verified URLs, screenshots, console text, build logs>
```

## EAS / Expo Notes

For Expo projects:

- Build a production Play artifact with a production AAB profile, commonly:
  ```bash
  npx eas-cli build -p android --profile production
  ```
- Submit can be automated only after Google Play service account JSON and API access are configured:
  ```bash
  npx eas-cli submit -p android --profile production --latest --non-interactive
  ```
- If submit fails because no service account JSON is configured, fall back to the UI workflow and report that future automation needs service-account setup.
- Keep `android.package` and `android.versionCode` in `app.json` / `app.config.*` final before the first upload.
- Download the final AAB artifact locally when using UI upload and preserve its path in the publishing log.

## Browser Automation Guidance

Play Console is a complex web app. Use these habits:

- Prefer the user's visible, logged-in Chrome via CDP when account session matters.
- Use snapshots/vision to verify the actual screen text after each major click.
- For file uploads, use CDP `DOM.setFileInputFiles` on the actual file input when drag/drop is unreliable.
- Wait for AAB processing to finish before entering final release notes or navigating away.
- After clicking save/publish buttons, verify state by reloading or reading the page text; do not trust the click.
- If accessibility refs disappear or only “Loading Google Play Console” appears, wait/refresh and inspect `document.body.innerText` through CDP.
- If UI actions stall repeatedly, produce exact manual steps rather than burning tool loops.

## Handoffs

- `android-app-dev` / `react-native-app-dev`: build failures, package ID fixes, versionCode changes, signing config, AAB generation.
- `play-store-cli`: service account setup, fastlane supply/EAS Submit/Gradle Play Publisher, CLI/API validation, CI release automation.
- `devops`: CI release build, secrets/service-account storage, monitoring, and broader deployment operations.
- `marketer`: store listing copy, screenshots positioning, launch/ad plan, country localization, Google App Campaigns.
- `product-manager`: target audience, pricing/free-vs-paid, launch readiness, app access requirements, success metrics.
- `qa`: install testing, smoke tests, opt-in link verification, device compatibility, regression checks.

## Common Pitfalls

1. **Uploading with the wrong package ID.** Once Play accepts a package, you cannot rename it for that app. Stop and rebuild if the ID is stale.
2. **Confusing APK and AAB.** Play release tracks need Android App Bundles for normal publishing; APKs are only for direct sideload/internal sharing contexts.
3. **Skipping tester setup.** Internal testing can have a valid draft release but still be unavailable because no tester list is saved/selected.
4. **Trusting an enabled button.** Play Console may show enabled Save buttons that automation cannot actuate. Verify persistence after refresh.
5. **Guessing policy declarations.** Data safety, ads, app access, and content rating must reflect the app. If unknown, create a blocker.
6. **Reusing versionCode.** Every uploaded release for a package must have a new integer versionCode.
7. **Claiming publication too early.** “AAB uploaded” is not “published.” “Release draft saved” is not “rolled out.” State the exact Play status.
8. **Ignoring account permissions.** Missing permission text such as “You need permission to edit testing releases” is an account/admin blocker, not a code bug.

## Verification Checklist

- [ ] Correct developer account and app selected.
- [ ] App name, default language, free/paid choice, and package ID recorded.
- [ ] Package ID and versionCode verified against the artifact/app config.
- [ ] Release `.aab` uploaded and processed successfully.
- [ ] Release notes entered.
- [ ] Tester list saved and selected for testing tracks.
- [ ] Preview/confirm screen reviewed for blockers.
- [ ] Final publish/rollout action completed or exact blocker documented.
- [ ] Opt-in/store link captured when available.
- [ ] Project publishing report/runbook updated with evidence and follow-ups.
