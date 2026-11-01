# Feature: Default Hermes skills staging

Status: implemented
Related issues: none; directly requested staging workflow.

## User outcome and scope

NED maintainers deploy canonical skills to the default local Hermes instance after each completed distribution task. The default staging home is `~/.hermes`, independently of `HERMES_HOME`. This is skills-only local deployment, separate from AWS and the native process controller. CLI installation, profile migration, credentials, configuration, sessions, named profiles, automatic process restart and hot reload are non-goals. Files updated in active sessions may require a fresh session.

## Requirements

- FR-005: Every distribution task remains incomplete until reviewed/tested, merged to remote main and deployed from that merged revision to default local Hermes. Skills copying covers skills only. CLI, plugins and running processes affected by the task require their own verified update without replacing user secrets/configuration. [Completion procedure](COMPLETION.md) and task-management EVAL define the manual gate.


- FR-001: `node scripts/deploy-hermes-skills.mjs` copies canonical skill directories including SKILL.md, EVAL.yaml and support files into the default Hermes skills directory. `--home <directory>` enables isolated verification. Invalid arguments exit 2.
- FR-002: Preserve unrelated skills and all other profile state. Replace only canonical skill names, removing stale contents within those names. Retain an external backup of replaced skills; never copy runtime cache/database files. Reject symlink skill trees and direct symlink targets.
- FR-003: Validate packages and stage all copies before replacement. Serialize deployments with an exclusive directory lock. On caught replacement failures restore touched skills. Exit 1 on failure and 0 with target/count/backup on success. A process kill during replacement is not transactional: inspect the backup and lock before restoring touched names and removing a stale lock. Do not blindly delete a live lock.
- FR-004: Project instructions require deployment after each completed task and truthful readback before claiming staging updated. No restart or model call is implied.

## Critical user journeys

### CUJ-001: Deploy and repeat safely

Actor: maintainer. Critical because new instructions must reach staging without overwriting profile identity. Start with a default Hermes home and canonical checkout; run the command, inspect copied files and retain backup. Repeat replaces canonical contents while preserving unrelated files. Failure stops completion claims and preserves or restores previous files. For interrupted replacement inspect the backup before retrying.

## Detailed test cases

### TC-001: Local deployment, repeat and failure isolation

- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-003, FR-004.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: Disposable home with `config.yaml=sentinel` and unrelated skill `SKILL.md=retain`; source checkout contains canonical packages.
- Given: Isolated profile with unrelated state.
- When: Run deployment twice with `--home`, introducing stale canonical contents between runs; then run with an existing lock and a symlink skill target.
- Then: Success exits 0 and copied task-management bytes match source. Unrelated config/skill bytes persist; conflicts exit 1 without touching symlink destination.
- Steps and assertions: Execute `node --test docs/features/hermes-skills-staging/tests/TC-001.test.js`. Inspect count/success output, canonical contents, preserved sentinels and both failure statuses.
- Variants / negative cases: Lock contention and symlink destination tested. Authentication/network are inapplicable. Interrupted process replacement and filesystem write failure rollback require manual recovery evidence and are not fully automated.
- Cleanup: Remove only disposable profile via test teardown. Real deployment retains backups outside checkout.
- Pass evidence: Named test passes. Real staging deployment additionally requires command exit 0 and file-byte comparison; this does not prove cached sessions reloaded.

## Coverage and acceptance

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001–FR-004 | CUJ-001 | TC-001 | Integration test plus real staging byte readback |

Acceptance: repeat deployment matches canonical skills and preserves unrelated profile state; failures are explicit.

## Open questions and coverage gaps

Hard-kill recovery and injected filesystem-failure rollback lack automated coverage. Stale lock recovery requires confirming no deploy process is active. Deployment is atomic per skill rename, not across the entire set. Fresh-session model behavior is covered separately by skill evaluations; a filesystem deployment is not a behavioral evaluation pass.

### TC-002: Completion requires merge and deployed revision readback

- Journey / requirements: CUJ-001 / FR-005.
- Level / automation: manual; [task-management EVAL](../../../skills/task-management/EVAL.yaml), completion gate fixture.
- Preconditions / fixtures: Synthetic task/PR with passing tests, draft PR and old local runtime revision; isolated home. No real credentials or external writes.
- Given: Work is implemented but not merged/deployed.
- When: Agent is asked whether it is done, then receives simulated merged and stale deployment readbacks, then matching readbacks.
- Then: Only final matching merged/deployed evidence permits done; earlier states remain open with concrete autonomous next steps. Skills-only copy cannot claim CLI/plugin installation.
- Steps and assertions: Execute the fixture in a fresh agent with the updated task-management/coder/project-manager instructions; retain decisions and commands separately from runtime state.
- Variants / negative cases: Failed CI/review, deployment failure, stale revision, named-profile/AWS confusion, unrelated user config; all retain incomplete work. Live provider access is inapplicable to this synthetic case.
- Cleanup: Remove only disposable home/work; no real process restarts or merges.
- Pass evidence: Fresh agent response and independent assessment; YAML parsing is not a pass.
