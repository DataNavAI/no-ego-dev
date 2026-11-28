# Self-review development workflow

Status: implemented; distribution/runtime checks and local staging readback required for delivery.
Related issue: DataNavAI/no-ego-dev#165. Users: NED agents implementing ordinary product, architecture, coding, integration and deployment work.

## Outcome and scope

Ordinary work completes through author self-review, appropriate checks and already-authorized delivery. A separate reviewer is not an automatic phase. This policy applies to canonical skills, their discovery metadata, evaluation expectations and linked historical review recipes. Existing user authorization, secret protection, source/artifact identity and actual provider verification stay in force. Dedicated review skills remain available when requested. This change does not alter application runtime, cloud infrastructure or user/project-specific branch protection.

## Requirements

- FR-001: Ordinary implementation must not dispatch a reviewer, wait for independent approval, or create review rounds/lineage/approval receipts as a completion gate.
- FR-002: The author self-reviews the governing contract, changed behavior, relevant consumers and material risks, runs appropriate required checks, corrects defects and reports actual limitations.
- FR-003: A separate review runs only on an explicit user request. Formal rounds and receipt protocols require an additional explicit request, rather than being inferred from review alone.
- FR-004: Missing authorization, failed tests, unresolved material defects, unknown provider state and unavailable required verification remain blockers; absence of a reviewer never makes them pass.
- FR-005: Skill callers, discovery descriptions, references and evaluations must agree with the default. Existing review recipes are optional and scoped, not silently inherited gates.
- FR-006: Deploy canonical skills from merged main to the default local Hermes instance and verify source/target equality, preserving unrelated skills and profile/configuration/credential data.
- FR-007: After a NED feature merge, update/restart the owned local NED container on latest verified remote main using the maintained updater, preserve persistent state and credentials, and verify running revision, generation, health and configured Hub connectivity before completion. Deferred/busy/unverified delivery remains pending. Native service restart or skills-only staging is insufficient; unrelated projects are outside this rule.

## Critical journeys and manual cases

### TC-001: Ordinary implementation

- Journey / requirements: CUJ-001

- Level / automation: manual; use coder and immutable-candidate-verification EVAL.yaml. Given an actionable development request with existing authority, implement it, self-review the complete diff and run applicable checks. Then merge/deploy as authorized without reviewer dispatch, a review-pending hold or approval paperwork. Record source, checks and actual delivery. The issue165 skill update itself exercises this path.

### TC-002: Orchestrated issue execution

- Journey / requirements: CUJ-002

- Level / automation: manual; use subagent-driven-development and issue-monitor EVAL.yaml. Given one owned issue and permitted implementation delegation, inspect delivered source/checks, correct material defects and deliver under the existing concurrency limit. Do not create a reviewer leaf, review round or separate merge-only approval executor by default. Existing worker liveness/ownership and uncertain-mutation checks still apply.

### TC-003: A real check fails

- Journey / requirements: CUJ-003

- Level / automation: manual; use coder EVAL.yaml. Given a failing required check, investigate and correct the failure or report the actual blocker; do not waive it and do not substitute reviewer approval. Run the corrected check and relevant regressions before delivery. Use synthetic/local resources only.

### TC-004: Requested review

- Journey / requirements: CUJ-004

- Level / automation: manual; use spec-compliance-review EVAL.yaml. Given an explicit review request, inspect the supplied contract/candidate and report concrete material findings or no material findings with limitations. Do not demand a lineage packet or add a reviewer chain. A request specifically for an independent actor must not be mislabeled as author self-review; disclose unavailable independence instead.

## Coverage and acceptance

### TC-005: Merged NED feature reaches the local container

- Journey / requirements: CUJ-005 / FR-004, FR-006, FR-007. Actor: NED feature implementer; critical because a merged feature must be available in the user's container.
- Level / automation: manual; behavioral evaluation using [coder scenarios](../../../skills/coder/evaldata/local-container-after-merge.md) and [EVAL.yaml](../../../skills/coder/EVAL.yaml).
- Preconditions / fixtures: synthetic merged feature, newer verified main and an owned older container; no real credentials or provider calls.
- Given: a NED feature is merged and the local container still runs an older revision.
- When: the agent completes delivery with the coder skill.
- Then: it uses the maintained updater, preserves state, verifies the new running generation and latest verified main revision, healthy UI/API and configured Hub connectivity, and only then completes.
- Steps and assertions: execute scenario 1, then scenario 2 with pending CI and with a zero-exit deferred busy result; verify no premature success, forced restart or destructive state changes. Execute scenario 3 and verify no NED-container action for the unrelated app.
- Negative / boundary cases: missing ownership or failed health blocks completion; interrupted promotion retains the updater's recovery/rollback state; no substitute native restart, old-image restart or skills-only copy. Concurrent work is protected by the existing maintenance lease, not terminated.
- Cleanup: discard synthetic observations; any actual staging uses the maintained updater and preserves its rollback resources.
- Pass evidence: record agent decisions and observed tool calls for all three scenarios separately from repository code tests; no behavioral pass is implied by parsing YAML.

| Requirement | Journey | Cases / evidence |
| --- | --- | --- |
| FR-001/002 | CUJ-001 | TC-001; coder and immutable-candidate-verification evals; issue165 delivery |
| FR-003 | CUJ-004 | TC-004; requested-review eval |
| FR-004 | CUJ-003 | TC-003; actual required checks, failures remain failures |
| FR-005 | CUJ-001/002 | TC-001/002; caller/reference/evaluation consistency inspection |
| FR-006 | CUJ-001 | TC-001; merged-source local skills staging and readback |
| FR-007 | CUJ-005 | TC-005; coder local-container-after-merge behavioral scenarios |

Skill behavior is evaluated through real/manual agent tasks, not code tests matching instruction wording. YAML/schema checks and repository tests verify package/runtime integrity only. Report manual cases actually exercised separately from unexecuted scenarios; no claim of statistical skill quality follows from parsing files or green runtime tests.

## Docker-only local NED (#316)
- FR-008: Docker is the sole default local NED web runtime on this host. Retire the owned native COM service and its automatic launcher; do not start a native COM service to satisfy delivery. Preserve saved profiles, credentials, sessions, project data and administrative CLI tools. Unrelated Hermes profiles and project servers are outside this retirement.
- FR-009: Retiring duplicate launchers requires exact owner/label/path verification, private backups, persistent launchd disable and unload readback, and graceful termination of the receipt-bound native COM PID. Archive only the allowlisted retired NED launch files and obsolete native COM receipt after revalidation; no broad process matching, forced kill, profile deletion or volume deletion. The Docker instance, image, work and storage remain unchanged during native retirement.
- FR-010: Future local feature delivery uses only the maintained Docker updater and its ownership/CI/maintenance gates. A user-deferred update stays deferred; neither a native restart nor a fresh native installation is fallback delivery. Canonical skills staging to ~/.hermes remains file-only and does not authorize any native service start. Local administrative CLI maintenance is not a second running NED service.

### CUJ-006: Retire the duplicate native service and keep Docker
Actor: local NED operator. Critical because parallel versions give conflicting UI and delivery results. Starting with an owned native COM listener and a healthy Docker NED, record ownership and launch state, disable/archive only retired NED launch jobs, stop the verified native PID gracefully, preserve data and verify the Docker runtime and Hub remain available. Unknown ownership or unsuccessful shutdown stops the operation with the actual blocker; do not kill an unrelated process or update a busy container.

### TC-006: Docker-only retirement and future delivery
- Journey / requirements: CUJ-006 / FR-008–010.
- Level / automation: manual; operational readback plus [coder EVAL](../../../skills/coder/EVAL.yaml) / [Docker-only scenarios](../../../skills/coder/evaldata/docker-only-host.md). No code tests of skill wording.
- Preconditions: exact native receipt/PID/UID/command and launchd label/path ownership, Docker container identity/context and healthy state; private external backup directory. Synthetic agent evaluation uses those facts without actual mutation.
- Given: native COM and Docker coexist, and Docker updates are explicitly deferred while project work runs.
- When: retire the native service and evaluate subsequent ordinary feature completion and skills-only staging.
- Then: no owned installed native COM listener/process remains; its launch job and obsolete native bridge/retired duplicate staging launchers are disabled/unloaded and privately archived. Docker ID/image/start time, healthy state and Hub availability are preserved. No task claims or project servers change. Later feature delivery never starts native COM; deferred Docker updates remain pending and are not forced. Skills-only instruction updates synchronize canonical files without a service start or image rollout.
- Steps: inventory the exact plist labels, process receipt, listener, container image/start time; validate owner/non-symlink paths; back up and disable/unload only allowlisted retired jobs; TERM only the revalidated native COM PID, wait boundedly for exit; archive unchanged receipt; verify disabled jobs/unloaded state, no50090 listener, unchanged Docker identity/health and latest Hub state. Run paired old/new skill simulations and inspect actual output decisions separately from operational proof.
- Negative/boundary cases: unknown/live foreign owner, changed receipt/plist/PID, failed graceful stop or unhealthy Docker blocks further mutation; no SIGKILL, data deletion or work-state reset. Repetition recognizes disabled/absent launchers and stopped native service without creating a replacement. No credentials required beyond local owner access; no production/provider changes.
- Cleanup: retain private backups and the sole Docker runtime. Recovery requires explicit native re-enable authority; never automatically restore a second NED service. Runtime receipts/backups stay outside Git.
- Pass evidence: redacted owner-bound shutdown/launch readback, unchanged Docker ID/image/start-time/health and Hub state; synthetic skill outputs graded separately.

Coverage: FR-008–010 → CUJ-006 → TC-006. This replaces the older default-native-COM completion wording; user-specific runtime and deferral choices remain authoritative.
