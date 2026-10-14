# Feature: Daytona workspace access

Status: retired
Related issues: [#127](https://github.com/DataNavAI/no-ego-dev/issues/127), [#119](https://github.com/DataNavAI/no-ego-dev/pull/119)

## User outcome and scope
Daytona transport, existing-workspace chat/recovery, Telegram owner pairing, and CLI model credential synchronization are removed. NED now provides local shared-SQLite task management and Hermes profile distribution; Communicator and isolated staging retain their separate contracts. No replacement hosted-workspace flow is implemented.

Retirement does not contact providers, read/revoke credentials, or delete existing local ownership files, Secrets, Sandboxes or bots. Owners remain responsible for resources previously created outside the current CLI. Generic skills may still guide other projects using cloud providers.

## Historical requirements, journeys and cases
The previous implemented contract remains available in Git history before issue #127. Stable IDs are retained here for traceability and excluded from active coverage:

| IDs | Previous behavior | Disposition |
| --- | --- | --- |
| FR-001–FR-006 | Authenticated API/toolbox transport, command/binary transfer, bounded lifecycle, exact ownership/absence, clean dependency graph | Retired; provider clients removed |
| CUJ-001 | Resume saved workspace and run Hermes | Retired; commands reject locally |
| CUJ-002 | Verify ownership and clean up | Retired; no automatic cleanup |
| TC-001 | Authenticated command/binary transport | Discontinued, not run or claimed passed |
| TC-002 | Authorization, redirects, lifecycle failure/timeout | Discontinued, not run or claimed passed |
| TC-003 | Pagination, Secret operations and confirmed deletion | Discontinued, not run or claimed passed |

## Coverage and acceptance
Retirement behavior is executable under [task-management FR-013 / CUJ-008 / TC-009](../task-management/SPEC.md#tc-009-validate-cli-and-safe-dataoutput). Packaging independence is covered by TC-011, retained launcher/install checks and production dependency audit. Former transport test files are removed rather than counted as passing.

## Open questions and coverage gaps
None for retirement. Historical hosted-resource cleanup is intentionally outside this task; no live-provider acceptance is required for removing the integration.
