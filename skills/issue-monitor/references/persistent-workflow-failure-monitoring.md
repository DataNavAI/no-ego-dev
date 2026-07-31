# Persistent Repository Workflow Failure Monitoring

Use this companion pattern when the issue monitor should also receive repair tasks generated from CI/CD, security, scheduled, release, or deployment workflow failures.

## Discovery, lanes, and cadence

- Inventory every active workflow by stable provider ID plus canonical path; display names are not stable identities.
- Read each active workflow definition from the authoritative ref and derive every relevant **workflow × event × branch/ref lane**. Include default/protected/release branches, open PR heads, scheduled/default-branch lanes, security jobs, and documented deploy lanes.
- Paginate each lane until the latest two completed attempts plus the preceding success are known, or the API is exhausted within the documented retention window. A global or per-workflow-only run limit can hide infrequent scheduled/release/deploy runs behind busy PR/push traffic.
- Track run ID **and attempt**. For GitHub, include `attempt` in run-list/view output and use `gh run view <id> --attempt <n>` when inspecting jobs.
- Prefer workflow-run events for fast detection, plus a reconciliation poll at least every 15 minutes. Polling alone is a valid least-privilege fallback when event-hook administration is unavailable.
- Treat webhook payloads as hints. Before every candidate/persistent/recovery transition, task upsert, or alert, fetch and sort authoritative remote lane state by completion time, run ID, and attempt. Reject stale, duplicated, or out-of-order events at or behind the lane cursor unless they add missing evidence.
- Track runtime state outside the repository and write it atomically. On restart, reconcile remote runs and open tasks before alerting.
- Fail closed on missing auth, truncated inventory, incomplete trigger/lane enumeration or pagination, exhausted evidence, unreadable runs/jobs, missing required-check visibility, or unexplained workflow disappearance.

## Permissions and readiness

For GitHub, verify the capabilities actually used:

- repository metadata/contents read for workflow definitions;
- Actions read for workflow/run/job evidence;
- branch-protection or rulesets read when required checks are monitored;
- Issues write when GitHub Issues is the repair-task tracker;
- repository-hook administration/write only for webhook mode.

Verify each capability with harmless read/list calls and a dry-run/test issue path before declaring the monitor ready. Do not request hook-administration scope when polling is sufficient.

## “Continues to fail” gate

A first failure is a candidate, not automatically a repair issue. Create/update a durable repair task when any condition holds:

1. The latest two completed attempts for the same stable workflow and relevant branch/event fail with the **same normalized signature** and no intervening success.
2. The latest three completed attempts on the lane are continuously red with no intervening success, even when signatures differ; use a reserved `mixed-signature` lane task so changing errors cannot evade tracking.
3. A safe, explicitly authorized rerun attempt fails with the same normalized signature.
4. A required default/protected/release/deploy workflow remains red and blocking for 30 minutes.
5. A scheduled workflow fails on two consecutive scheduled executions.

Historical failures followed by a current success do not trip the gate. Do not blindly rerun deployment, migration, billing, destructive, or non-idempotent workflows.

Treat `failure`, `timed_out`, `startup_failure`, and `action_required` as failures. Investigate repeated cancellations that block required CI, but do not call intentional cancellation a code failure. Required checks that become skipped/neutral, disabled, removed, or `continue-on-error` need an explicit decision; those changes are not proof of recovery.

## Idempotent repair-task upsert

Use one open task per:

`repository + stable workflow ID/path + branch/event + normalized redacted signature`

Use reserved signature `mixed-signature` for the continuously-red mixed-failure lane gate. Store the key in task metadata/body or a stable label. Search again immediately before create, use an atomic lock/idempotent upsert, and update the existing task with new runs instead of creating one task per poll. Write state atomically. This prevents duplicate tasks from concurrent webhook/poll workers.

Minimum task evidence:

- repository and workflow stable ID/name/path/URL;
- affected run IDs/URLs, attempts, SHAs, branches, and events;
- failed jobs/steps and concise redacted evidence;
- first/last seen and consecutive count;
- normalized signature or `mixed-signature` lane evidence;
- impact/severity and owner;
- evidence-grounded suspected cause or `unknown`;
- acceptance: fix merged, original scenario passes, required check is green, and two consecutive normal runs succeed without weakening the workflow.

If the repo uses GitHub Issues, create the task there so the main issue monitor can claim it. Otherwise use the configured tracker or a durable repo-local project issue path. Verify the returned task ID/URL before reporting creation.

Apply the same dedupe discipline to missing-visibility/access work: maintain one open setup task per `repository + missing capability/scope`, update it only when evidence materially changes, and suppress unchanged visibility alerts. If the tracker cannot be written, atomically persist one pending upsert, send one actionable blocker alert, and retry; never claim a task exists without a verified ID/URL.

## Recovery and lifecycle

- One green run does not erase intermittent-failure history. Record recovery evidence and require the acceptance gate before closure.
- Reconcile workflow renames using stable ID/path history.
- Prune state for removed/disabled workflows only after a linked intentional-retirement decision; otherwise create/keep a visibility task.
- Alert only for a new candidate, persistent transition/task creation, materially changed failure, deduplicated missing-visibility transition, or verified recovery. Deduplicate unchanged red-state and visibility alerts.
- Redact tokens, environment values, and sensitive log payloads before persisting evidence.

## Verification matrix

Exercise behavioral scenarios—not only prose substring tests—before enabling autonomous operation:

- all-green run is silent;
- first failure records a candidate but creates no repair task;
- second matching attempt creates exactly one signature-specific task;
- three continuously red mixed-signature attempts create one lane task;
- repeated/concurrent event and poll handling updates rather than duplicates;
- a busy PR lane cannot hide an infrequent scheduled/release/deploy run;
- rerun attempts remain distinct;
- stale/out-of-order events cannot regress state or replay alerts;
- historical failures followed by a current success do not trip the gate;
- missing/truncated/malformed evidence fails closed and creates one deduplicated visibility task/alert;
- tracker write failure remains pending and is not reported as created;
- default/protected, pull-request, scheduled, release, security, and deploy workflows are all represented;
- recovery evidence is added without premature closure;
- rename/removal/disabled-object behavior is explicit;
- disabling/skipping/weakening a workflow does not count as a fix.

After local validation, require an independent review of the exact revision. Ask the reviewer to attack lane coverage, pagination, run-attempt identity, signature changes, task races, missing permissions, missing-visibility dedupe, and out-of-order events. Remediate blockers and re-review before publishing or profile deployment.
