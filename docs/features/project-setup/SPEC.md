# Feature: Project setup

Status: implemented (skill candidate)
Related issue: [#268](https://github.com/DataNavAI/no-ego-dev/issues/268)

## User outcome and scope

A NED operator can onboard an existing or new project from chat. NED records context and required resources in the persistent projects volume and registers the folder with the same Core database used by Goals. External access is requested through the applicable provider flow. Creating external resources, changing permissions, and performing development work require separate operator intent.

## Requirements

- FR-001. Collect the project name, purpose, intended admin/development work, and essential resource identifiers or public links. Ask for missing information and confirm the project when ambiguous.
- FR-002. Create or reuse a safe project directory under the persistent projects root, retain existing notes, and use the authenticated Core-backed CLI to register and verify the same folder. Retry registration without duplicate projects.
- FR-003. Request only missing access required for intended work, distinguish pending from verified access, and document only non-secret resource metadata.

## Critical user journey

### CUJ-001: Onboard a project

The operator identifies a project and its essential services. NED collects missing details, creates and registers its folder, and asks for narrowly scoped access. The operator sees what was registered and which services still need consent. On retry NED reconciles existing notes and registration.

## Detailed test case

### TC-001: Register and resume a synthetic project

- Journey / requirements: CUJ-001 / FR-001–FR-003.
- Level / automation: manual; [skill eval](../../../skills/project-setup/EVAL.yaml).
- Preconditions: disposable profile, synthetic workspace root, working local Core-backed CLI, empty database.
- Given: a synthetic project with a repository and AWS service, with read access still pending.
- When: follow the fixture and repeat the request.
- Then: the agent requests missing details and scoped access, creates one persistent project folder, registers it through Core, verifies readback, preserves existing notes, and reports the pending grant.
- Variants: unknown resource or unsupported auth remains pending. Reject paths outside the projects root and avoid credentials in notes, chat or task metadata.
- Cleanup: remove only the disposable root and database.
- Pass evidence: actual CLI registration and status, sanitized notes and an assumption-free report.

## Coverage and acceptance

| Requirement | Journey | Test case |
| --- | --- | --- |
| FR-001–FR-003 | CUJ-001 | TC-001 |

## Coverage gaps

Real provider consent is outside the synthetic eval. The existing registration API and provider UI retain independent integration coverage.
