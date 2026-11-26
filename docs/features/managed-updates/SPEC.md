# Feature: Managed instance idle maintenance

Status: implemented
Related: [Native224](https://github.com/DataNavAI/no-ego-dev/issues/224), [Hub182](https://github.com/DataNavAI/ned-hub/issues/182), [Hub179](https://github.com/DataNavAI/ned-hub/issues/179), [IaC33](https://github.com/DataNavAI/ned-iac/issues/33).

## User outcome and scope

A hosted NED instance may update automatically after five quiet minutes, without interrupting accepted work. Hub owns release qualification, default-on owner preference, scheduling and Kubernetes replacement. Core owns work admission, idle truth and atomic quiescence; COM adapts the authenticated generation-bound Native tunnel. This adds no public privileged HTTP namespace or provider OAuth scope. Standalone instances remain unaffected, and unsupported/unknown/busy instances defer rather than being forced to restart.

## Requirements

- FR-001: Idle requires five minutes since meaningful activity/work completion, no active chat/tool/task/command/upload/document/provider login, and known-safe managed process state. Polling, health, SSE and preview delivery heartbeats do not constitute user activity. Unknown state is never idle; long-running work has no forced timeout.
- FR-002: Prepare is advisory, request/instance/generation/target-bound, idempotent and expires after60seconds. New work or interaction invalidates it. Commit rechecks idle atomically with new work admission and durably blocks new work before acknowledgement. Exactly one of racing work admission and commit may win.
- FR-003: A committed barrier never expires into new work while deletion may still occur. Same-generation process restart retains it. Authenticated Native release of the exact intent (only after Hub proves no accepted destructive intent) or a trusted higher instance generation clears it; foreign runtime/target/request and stale generations cannot change it.
- FR-004: Persistent state is non-secret metadata in the selected runtime's SQLite database. Active scopes cover background chat after202 and transient CLI/Core task execution. Unknown/orphaned work prevents auto-update, without fabricating completion. No credentials, commands, provider payloads or conversation content appear in idle reports.
- FR-005: The Native maintenance protocol runs only on its authenticated managed control connection, binds identity/generation, bounds pending requests/responses, rejects malformed/stale inputs and loses authority on reconnect. It uses Core's internal service API; browser tunnel paths do not gain maintenance authority.
- FR-006: Authenticated meaningful UI pointer/keyboard activity is rate-bounded, content-free and updates the quiet clock. Ordinary API work is rejected with retryable503 while committed; reads/health/recovery remain available. Existing auth/Origin/profile isolation and model setup behavior remain enforced.

## Critical user journeys

### CUJ-001: Busy to prepared to safely committed

Actor: platform scheduler through authenticated Native adapter. Starting state: current hosted generation, recent or active work, no lease. It checks readiness, waits until five quiet minutes and no work/unknown process, prepares exact intent, then atomically commits. New work before commit cancels preparation; after commit it is rejected before side effects. This prevents update interruption races.

### CUJ-002: Retry, cancellation and replacement recovery

Actor: scheduler/operator. It retries the same intent after lost responses, cancels only that intent before destructive acceptance, or observes a higher-generation replacement. Same-generation restart must not reopen work under an outstanding committed update. Foreign/stale commands cannot release a barrier. Unknown outcomes defer and retain state.

### CUJ-003: Real API/background work and authenticated transport

Actor: user and Native connector. A background chat, Core attempt, command, upload or provider login remains busy after its initial acknowledgement. Background polling does not extend inactivity. Meaningful user activity cancels an uncommitted preparation. Authenticated Native RPC reports only fixed metadata, stays scoped across disconnect/reconnect and cannot be invoked from a public browser path.

## Detailed test cases

### TC-001: Durable atomic work/maintenance admission

- Journey / requirements: CUJ-001, CUJ-002 / FR-001–004.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: temporary real SQLite database, two guard connections, fixed synthetic instance/generation/target and injectable monotonic test clock/process inventory.
- Given: recent/active work, later a full quiet window.
- When: prepare/commit races work admission, then retry/expiry/restart/release/higher-generation bootstrap.
- Then: busy/recent/unknown never commit; exactly one competing admission wins; committed work is rejected without side effects; idempotent replies preserve identity; prepared expiry is safe; committed barrier persists and only legitimate recovery clears it.
- Variants / negative cases: foreign identity/generation/request/target, malformed state, unfinished Core attempts/working tasks/provider sources, orphaned scopes, empty unmanaged database and same-generation restart.
- Cleanup: close every guard/database and remove only fixture directories.
- Pass evidence: named assertions and reopened persisted-state checks; no live AWS/provider inference is claimed.

### TC-002: API, background scope and Native protocol boundaries

- Journey / requirements: CUJ-003 / FR-004–006.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: real temporary Core/COM listener and authenticated local WebSocket Hub fixture; controlled synthetic work/provider boundary, no real model keys.
- Given: valid current adapter, user activity/background work and a pending intent.
- When: work continues past202, activity/polling occurs, or invalid/replayed/disconnected RPC attempts mutation.
- Then: real work remains busy, polling is quiet, interaction invalidates prepare, committed HTTP work gets503, foreign/Origin/unauthenticated calls remain denied, protocol reports bounded fixed metadata and closes stale authority.
- Variants / negative cases: device login is shared with model setup TC-003; mutations including document parsing share the outer API scope, background chat is held through stream completion, and TC-001 covers separate SQLite actors and standalone CLI barrier admission. Unsupported and disconnected controls cannot commit.
- Cleanup: close listeners/sockets/children and fixture databases; remove fixture state only.
- Pass evidence: HTTP/WS responses and side-effect/persistence assertions. Published Linux process qualification and staged busy→idle auto-update are separate Hub182 release gates.

## Coverage and acceptance

| Requirement | Journeys | Tests |
| --- | --- | --- |
| FR-001–004 | CUJ-001/002 | TC-001 |
| FR-004–006 | CUJ-003 | TC-002 |

Source implementation and automated cases are present. Device-login lifecycle coverage is shared with [model setup TC-003](../model-setup/tests/TC-003.test.js). TC-002 includes an actual Core listener, long-lived synthetic chat provider stream, Native WebSocket control connection and served Chromium keyboard interaction. Linux inventory cases use a synthetic process filesystem; real managed-container qualification, merged local installation and Hub test/staging automatic-update acceptance remain separate release gates and are not established by these fixtures.
