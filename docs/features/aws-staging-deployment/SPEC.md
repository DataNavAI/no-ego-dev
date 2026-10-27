# Feature: AWS staging deployment

Status: implemented
Related issues: none; operator-requested repeatable deployment of the existing Lightsail staging instance.

## User outcome and scope
Operators deploy an explicit immutable NED commit to an already provisioned, dedicated Linux Lightsail staging host. Data and existing HTTPS/password configuration survive updates. Provisioning, DNS, password rotation, production, automatic main promotion, model calls, database migrations and Kubernetes are non-goals. The standalone image contract remains in [standalone-container](../standalone-container/SPEC.md). Existing host layout is required: `/opt/ned-staging/runtime.env`, `com-password.env`, Docker/Buildx, Caddy, container `ned-staging` and its three named volumes. Operator must quiesce agent work before applying an update. AWS credentials and pinned SSH host keys stay outside source control.

## Requirements
- FR-001: Require an explicit 40-character commit, expected AWS account, region, instance and private SSH key/known-hosts files. Verify STS account, running Lightsail instance with `environment=staging`, SSH target and exact supported container mounts. Reject invalid input and wrong targets before mutation. Default is read-only planning; only `--apply` changes the host. No AWS resource creation or firewall/DNS changes.
- FR-002: Archive only the requested local Git commit and build it remotely with BuildKit and a revision label before stopping the active container. Never upload the working tree, credentials, Git history or host profile. Healthy repeated deployment of the same revision is unchanged unless `--force` is explicit. Keep existing runtime secrets and Caddy configuration unchanged.
- FR-003: Serialize updates with a host lock; before replacement stop the old container and make consistent private backups of all three exclusive volumes. Retain the original container/configuration until the new container passes Docker health, both internal service identities, dashboard unauthenticated denial and public HTTPS password/Origin gates. A failed rollout restores all three volumes and the original container; rollback failure must report recovery required and preserve evidence/backups.
- FR-004: Write an atomic durable transaction journal before stopping services. SIGINT/SIGTERM trigger rollback; a hard interruption leaves a journal that blocks another deployment until explicit `--recover`. Recovery validates ownership, stops/removes only its own candidate, restores completed backups when needed, and revalidates old health. Never prune volumes or delete unrelated containers. Unrelated volume users block destructive recovery. Keep successful backups privately for operator-controlled retention.
- FR-005: Emit nonsecret JSON status and nonzero errors with no command output, environment values, passwords, auth headers or provider payloads. Bound SSH/build/readiness operations. SSH host verification is mandatory. Document deployment, dry run, source review/CI prerequisites, downtime, backup scope, failure recovery, limitations and costs in the runbook and AGENTS.md.

## Critical user journeys
### CUJ-001: Plan and deploy an approved revision
Actor: staging operator. Critical because the public staging instance must preserve owner data and authentication. Start with a running dedicated staging host, reviewed commit with passing applicable CI, pinned known-hosts entry, AWS CLI authorization and independent runtime credentials. Run plan, inspect target/revision, quiesce work, run `--apply`. Success: JSON deployed/unchanged, exact image revision, retained profile/database/projects and authenticated public COM. Failures before replacement leave old service untouched; readiness failure rolls back the full stopped snapshot.

### CUJ-002: Recover a failed or interrupted update
Actor: operator. Critical to avoid mixed image/database state. Start with a failed or hard-interrupted journal and private snapshots. Run the same target arguments with `--recover`. Success: old container and all snapshotted data restored and verified, journal completed. Busy lock, unknown ownership, missing snapshot or unrelated volume user fails closed; preserve runtime journal and backups for investigation. Cleanup never destroys data automatically.

## Detailed test cases
### TC-001: Validate immutable source and target before mutation
- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-005
- Level / automation: integration; [tests/TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: synthetic CLI arguments, fake AWS responses and temporary Git repository/credential path metadata; no real AWS calls or secrets.
- Given: a source SHA and existing staging identity.
- When: validate plan, mismatched account/tag/state, malformed source/SSH arguments and working-tree changes.
- Then: valid plan binds exact commit; invalid inputs fail before upload or remote mutation. Archive contains committed bytes only.
- Steps and assertions: run named Python unittest cases through the Node case; inspect archive bytes and fake-call history, asserting no credential values in errors.
- Variants / negative cases: absent dependencies/key, symlink credential paths, invalid account/region/name, wrong account, non-staging tag, stopped instance, unknown commit. Provider/model auth and persisted app state are inapplicable to the synthetic target check.
- Cleanup: temporary directory teardown; no cloud resources.
- Pass evidence: named assertions with zero skips.

### TC-002: Transaction preserves data and recovers failures
- Journey / requirements: CUJ-001, CUJ-002 / FR-002, FR-003, FR-004, FR-005
- Level / automation: integration; [tests/TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: real temporary journal/lock directory and in-memory Docker-boundary fixture with old image, three distinct data sentinels and unchanged authentication marker.
- Given: healthy original container.
- When: deploy successfully, repeat same revision, inject build/backup/readiness/restore failures, interrupt after replacement, and invoke recovery.
- Then: build failure never stops old service; success preserves all data/auth, repeated revision is unchanged; readiness failure restores all three original values; incomplete backup never restores partial state; recovery rejects foreign candidate/volume users and missing snapshots; lock contention cannot mutate. Failed rollback preserves journal and reports recovery required.
- Steps and assertions: execute the real transaction controller with the boundary fixture, inspect durable journal and independent state values after each injected failure. Recovery uses a new controller instance, simulating process loss.
- Variants / negative cases: SIGTERM-equivalent exception, explicit hard interruption, foreign ownership, missing backups, concurrent lock, missing-container diagnostics with uppercase/lowercase Docker variants; daemon failures must still block; repeated builds use distinct retained tags and journal-pinned helper digests for snapshot/restore. Network/real credential details remain TC-003.
- Cleanup: temporary fixture roots only.
- Pass evidence: named assertions, not source-text checks.

### TC-003: Existing AWS staging rollout and rollback
- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-005
- Level / automation: manual; executable [runbook procedure](RUNBOOK.md#acceptance).
- Preconditions / fixtures: explicit staging authorization, reviewed immutable source, working AWS/SSH access, healthy current staging, quiesced owner work, private runtime secrets and sufficient disk for source/image plus full volume snapshots. No new paid resources.
- Given: a real Lightsail Docker host and persistent profile/database/project sentinels.
- When: run plan, apply a known compatible commit, repeat it, force a bounded readiness failure and recover; repeat accepted rollout after the code commit.
- Then: exact target/revision, successful authenticated HTTPS, unchanged Caddy/secret bytes and data; repeated deploy unchanged; failed rollout nonzero with full old state restored; no unintended AWS resources or volume deletion.
- Steps and assertions: follow runbook commands, record only sanitized JSON and privately compared hashes; require Docker health and both service identities, anonymous401, authorized200 and foreign Origin403. Record snapshot location and ownership without publishing archive contents.
- Variants / negative cases: missing AWS/SSH permissions block, not pass; host outage retains journal for recovery. Paid model calls and cross-region provisioning are inapplicable.
- Cleanup: remove only synthetic sentinels after readback; preserve production-like volumes, credentials, old image and private snapshots. No automatic deletion of backup data.
- Pass evidence: immutable source/candidate identity, redacted command outcomes, rollback/data/auth assertions; not merely a written procedure.

## Coverage and acceptance
| Requirement | Journey | Cases | Evidence |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001, TC-003 | target checks / actual AWS readback |
| FR-002 | CUJ-001 | TC-001, TC-002, TC-003 | archive / unchanged / build-before-stop |
| FR-003 | CUJ-001, CUJ-002 | TC-002, TC-003 | full snapshot and rollback |
| FR-004 | CUJ-002 | TC-002, TC-003 | journal / lock / ownership / recovery |
| FR-005 | CUJ-001, CUJ-002 | TC-001, TC-002, TC-003 | redaction / strict SSH / runbook |

## Open questions and coverage gaps
Actual AWS rollout, unchanged repeat, forced readiness-failure rollback and terminal recovery passed on 2026-10-27 UTC using application commit `950afcf17de99dd54cedcee1e769631654ef715c`. Final commit-bound evidence belongs in [the manual acceptance receipt](../../../.github/manual-test-result.json); this written case alone is not a pass. A stopped-volume snapshot cannot protect external services or undo third-party side effects; migration compatibility remains an operator review obligation. Local volumes are not an off-host disaster-recovery backup. No automatic handling of live agent work or model credential refresh is promised.
