---
name: task-management
description: Use for every user development request to track durable NED goals, tasks, blockers, estimates and visible outputs through the Core-backed CLI, preserving ownership and verified completion.
---

# Task management

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

## Mandatory completion: merge and local deployment

For every task in this distribution, completion requires applicable checks and
manual acceptance, self-review, merge into remote `main`, and verified
deployment from that merged commit to the default local Hermes instance. The user
has authorized this normal merge/deployment flow; do not repeatedly request it.
Do not mark NED tasks/goals done or send a completion report while any gate remains
pending. A local implementation, draft PR, passing tests, or skills-only copy does
not establish full deployment.

Use an isolated checkout for the task; preserve unrelated working-tree changes.
Fetch main, resolve integration, run the repository's required automated/manual
checks, self-review the exact candidate and require green PR checks, merge, then read back
the remote merged SHA. Deploy only committed merged contents. For CLI/runtime
changes run the canonical checkout installer `bash scripts/install.sh` from the
merged checkout and verify installed commands and generation identity. Run
`node scripts/deploy-hermes-skills.mjs` for canonical skills. Install/update any
affected profile-local plugins, preserve existing user configuration/credentials,
enable only required plugin/toolset entries, and reload affected local Hermes/COM
processes when needed. Verify the running/local installed behavior at the merged
revision, then record merge/deployment evidence and complete the owned NED task.
Never use AWS or named-profile rollout as a substitute for this local target.
If deployment/checks/access fails, keep work open with the actual blocker and
continue safe recovery. Do not bypass hooks, CI, ownership or secret protections.


Use the NED CLI as the durable work tracker. A goal is a milestone with an observable outcome; a task is a small executable unit that may belong to a goal. Do not replace persisted work with chat checklists or a private queue. An explicit user choice of tracker takes precedence. GitHub issues and PRs may provide implementation evidence; do not assume synchronization with NED.

## Every development request: intake before execution

For every actionable user development request—including a feature, bug fix, refactor, test, deployment, or skill change—update the durable NED work graph before implementation. Do this even when the user does not mention tracking. Pure explanations and clarification-only messages do not create work. An explicit user choice of another tracker takes precedence.

1. Initialize the correct project idempotently, then inspect `ned tree`, typed `list`, and relevant `get`/`history` records. Match the request to existing work before creating anything. A follow-up, retry, or resumed conversation normally continues its existing task.
2. Reuse the milestone goal when the requested outcome belongs to it. For a new multi-task outcome, create one goal with small child tasks using `--goal`. A focused standalone request may be one task without a goal; do not invent a milestone for every message. Do not attach unrelated work to an existing milestone.
3. Persist the user's requested outcome, scope, acceptance checks and dependencies when creating work, then claim the task before executing it. Keep the returned project/goal/task IDs in the handoff. Do not rely on chat memory as the work record.
4. On scope changes, inspect the current task and record newly required work as a separate linked task under the existing unfinished goal when appropriate. The CLI has no generic title/description edit, reparent, reopen, or arbitrary status command: never invent those commands or edit SQLite directly. Preserve original records; create explicit follow-up work for completed tasks or goals. For an active task, finish only its original verified scope and separately track additions.
5. Keep blockers, ownership, dependencies and completion evidence current through the supported commands below. Read back persisted state after each mutation. Do not claim another actor's task or close a milestone merely because a response was sent. If tracking is unavailable, report the failure and keep completion unverified while repairing the CLI/setup; never claim a record was saved.

## Context and planning

### Runtime isolation

Keep the same runtime selection on CLI, COM and native secret-tool calls. Runtime
files live in `<agent-home>/.ned`, not a universal OS-user store. Selection is:
explicit absolute `NED_AGENT_HOME`; then active Hermes markers
`HERMES_SESSION_ID`/`HERMES_SESSION_KEY`/`HERMES_SESSION_PLATFORM` choose
`HERMES_HOME` or OS `~/.hermes`; then `CODEX_THREAD_ID`/`CODEX_SESSION_ID`
choose `CODEX_HOME` or OS `~/.codex`. Hermes outranks inherited Codex markers.
Without an active marker, one configured `HERMES_HOME`/`CODEX_HOME` selects it;
both configured requires explicit `NED_AGENT_HOME`. No agent context keeps
standalone `~/.ned`. Never infer selection from directory existence or CWD.
Empty, relative, URL, NUL-containing or symlink selected roots fail rather than
silently falling back. Missing selected directories are initialized privately.

Two agents on the same canonical project normally have different work graphs,
Hub logins, logs, telemetry consent and secret vaults. A missing record after a
runtime switch is not proof of deletion or synchronization. Inspect the intended
store before creating duplicates. Never copy/migrate old DB/auth/secrets
automatically; initialize the new store, reauthenticate and save needed secrets
explicitly. Only when deliberately requested, `NED_AGENT_HOME="$HOME"` reuses
legacy shared `~/.ned`. `--database` overrides `NED_DATABASE_URL` for the DB only;
it never switches vault, credentials, telemetry or logs. The native Hermes plugin
binds its CLI child to the actual Hermes profile unless the operator explicitly
sets `NED_AGENT_HOME`. Gateway settings still use the selected Hermes profile,
independent of Codex storage. CLI/Node installation, caches, project files and
default skills rollout keep their existing ownership; do not relocate them or
change production HOME to select storage. For synthetic evaluation, explicitly
bind `NED_AGENT_HOME` to a disposable absolute home on every subprocess.

Use the same canonical project root, database and stable actor on every call. Agents pass `--actor agent:<stable-id>`; labels record ownership, not authentication. Runtime data belongs outside the repository. Initialize idempotently:

```bash
ned task init --project /absolute/project --actor agent:planner --json
ned status --project /absolute/project --actor agent:planner --json
ned tree --project /absolute/project --actor agent:planner --json
```

Inspect existing items before creating new ones so resuming work does not duplicate it. Create outcome-based milestones and focused tasks. Describe acceptance checks and exclusions in the description. Use returned IDs literally:

```bash
ned goal create "Customers can sign in" --description "Verified sign-in and recovery" --project /absolute/project --actor agent:planner --json
ned task create "Implement callback" --goal <goal-id> --description "Acceptance: valid callback opens session; invalid state is rejected" --priority 1 --project /absolute/project --actor agent:planner --json
ned task create "Investigate standalone request" --project /absolute/project --actor agent:planner --json
```

A task can instead use `--parent <goal-or-subgoal-id>` for existing nested plans. Do not combine `--goal` and `--parent`. A subgoal requires `--parent`; it is optional decomposition, not an execution task. Parent membership does not create a dependency.

## Execute and recover

1. Read `ned ready`, then claim one task with `ned task start <id>`. Pass the same project/actor and `--json` as above. Check success before doing work; a competing claim can fail.
2. Record prerequisites with `ned task block <id> --on <prerequisite-id>`. Record an external condition using `--reason <text>` and optionally `--service <name>` instead. Store no credentials. Report the actual owner/action needed; do not invent access or bypass another actor's claim.
3. After an external condition resolves, use `ned task unblock <id>`; remaining dependencies still apply. Inspect `get`, `history`, `tree` and `ready` to resume after interruption. Give mutations a stable `--request-id <unique-operation-key>` when retry recovery matters. After an uncertain response, read back before retrying; replay only the identical command and input with the original key. A changed command under that key conflicts. Never blindly create a replacement or invent a new key to recover an uncertain mutation.
4. Verify the task's acceptance checks before `ned task done <id> --reason <evidence summary>`. The claiming actor completes it. Keep blocked or unverified work open.
5. Inspect milestone children and progress. Complete the goal explicitly with `ned goal done <id>` only after all children and its outcome are verified. Derived 100% progress does not close the stored goal.

For this no-ego-dev distribution, after each completed task run `node scripts/deploy-hermes-skills.mjs` from its checkout. The default local Hermes instance is staging. Check the deployment result before reporting staging updated; failures require remediation and truthful status. Do not deploy to named profiles or AWS through this command. Fresh Hermes sessions load the new skill files; existing sessions may retain earlier instructions.

## Core connection and recovery

Task commands use the authenticated NED Core HTTP API. By default the CLI starts
a temporary loopback backend for the selected runtime/database and closes it
after the command; no daemon, coordinator dispatch, model or gateway is required.
To share a running local COM/Core listener, set `NED_CORE_URL` or pass
`--api http://127.0.0.1:18791` on every command. Use the listener's actual loopback
URL, not a public tunnel/Hub URL. For a configured server the CLI reads its private
operator credential; standalone commands use a transient process-private bearer.
Never read, print or put either credential in arguments or task records.

The CLI verifies the server's runtime and database identity before sending task
arguments. `--database` selects the expected database, not a different server
database. A configured server failure, unauthorized response or context mismatch
must be repaired or truthfully reported; never silently unset the URL, switch
profiles, copy databases, or fall back to direct SQLite writes. Actor is an
ownership label, not authentication. Keep runtime, project, actor and database
consistent with the COM whose Goals & Tasks pane the user is viewing.

## Keep Goals & Tasks useful

Record a short product/business effect, a defensible remaining-time estimate
when known, and a visible output as work progresses. Unknown time stays null;
never fabricate a finish time, screenshot, effort or completed output. Tracked
time comes from working intervals in task history, not measured CPU time or
proof of labor. Update metadata without claiming a task done.

```bash
ned task delivery <task-id> --project /absolute/project --actor agent:planner --json
ned task delivery <task-id> --file /private/work/delivery.json --request-id <publish-key> --project /absolute/project --actor agent:planner --json
ned goal delivery <goal-id> --file /private/work/goal-delivery.json --project /absolute/project --actor agent:planner --json
ned task attempts <task-id> --project /absolute/project --actor agent:planner --json
```

The JSON file is a **complete replacement**, not a patch. Read the saved delivery
first, preserve every desired output, and write only the supported fields (omit
read-only `updatedAt`). Omitted impact, estimates and outputs reset. Example:

```json
{"impact":"Shoppers can complete checkout","remainingSeconds":null,"estimatedFinish":null,"outputs":[{"id":"verification","kind":"document","title":"Verification note","text":"Synthetic example only; replace with actual results."}]}
```

Impact is one line≤240characters; `remainingSeconds` is null or0–31,536,000;
`estimatedFinish` is null or canonical UTC ISO with milliseconds. Include≤3
outputs, unique ASCII IDs1–64characters, titles1–120characters. Documents use
`kind:"document"` and `text`≤16,384characters. Images use `kind:"image"` and an
actual PNG/JPEG base64 `image` data URI≤32,768characters; no paths, remote URLs,
SVG or HTML. Core validates/normalizes images; the complete HTTP body must fit
64KiB, so keep files smaller. Store temporary delivery files outside the repo;
exclude secrets, private logs and unapproved conversation content. Read back the
saved record after publication. Updating with a new request key intentionally
replaces the old record; do not reuse an old key for changed metadata.

`task attempts` returns at most20 newest attempt summaries and `nextCursor`.
Pass a non-null token unchanged with `--cursor <token>` on the same task/project
to continue. Retain task/attempt/session IDs literally; a session title is not a
mapping key. Queued is not running; awaiting_verification is not success. The
CLI command is inspection only: it never enrolls, launches, retries or stops a
worker. Use COM's task Details to inspect captured results and bound session
logs. Follow the existing orchestrator's verification/ownership flow for managed
work; never bypass `verification_required` or complete another actor's task.

## Reporting

Report actual persisted state, acceptance evidence and unresolved blockers. A task is not complete merely because an agent returned. Use JSON output and exit status as evidence. Failures exit nonzero; inspect state before retrying. The SQLite default is the selected runtime's `.ned/ned.sqlite` (standalone no-context: `~/.ned/ned.sqlite`); `--database` overrides `NED_DATABASE_URL` for the DB only. No remote tracker, model call or Hermes restart is required for task commands.

## Secret handoff during development

When work needs a password/token or the user wants to set one, choose a meaningful
key such as ADMIN_PASSWORD and call native `ned` with
`{action:"request_secret",key:"ADMIN_PASSWORD"}`. COM renders Enter secret from the
successful persisted tool result; the user supplies its value through that private
form. Never ask for a value in chat, accept a value/path parameter for this action,
construct a card in Markdown or claim the secret is saved just because the request
succeeded. A request only invites entry. Wait for the user to save and continue;
then check availability with CLI private-file retrieval. Do not automatically send
a chat message on submission. Requests expire in15minutes; request again when
unavailable. If native tooling/COM cards are unavailable, direct the user to
COM → Settings → Secrets and ask only for its key. Never put values in tasks,
issues, descriptions, logs or replies.
Verify that the installed CLI supports `ned secret --help`; from a trusted development checkout use `node bin/ned.js secret` if the installed release is older. Never pretend an unsupported command retrieved a value.
Retrieve it with `ned secret get ADMIN_PASSWORD --file`; this prints a private
path, not the value. Pass that file directly to the consuming tool's secret-file
option or a private process input. Do not cat/read the bytes into a tool transcript,
echo them, add them to command arguments, or include them in logs/final messages.
If the consumer needs an environment variable, load from the file inside the
process without shell tracing or printing its value. Raw `ned secret get KEY`
intentionally outputs plaintext and is unsuitable for chat-visible tool output.
If the key is missing, request it through the native card (Settings fallback);
never invent a value or report access succeeded. Vault scope is the selected agent/profile's NED home, shared across its projects;
`--database` does not choose a different vault. File exports are plaintext0600 and
persist until replacement/deletion; consumer copies are the caller's cleanup duty.

When the user asks to receive a saved password/token, prefer the native Hermes
`ned` tool with `action: secure_share_secret` and the private export `path`.
Obtain that path through CLI `secret get KEY --file` without reading the bytes.
The tool verifies a current managed export and returns only an expiring reference.
COM renders the successful tool result as a Secret ready card with explicit
Reveal secret. Do not paste the path, reference or value into assistant prose,
construct a card in Markdown, claim sharing succeeded after a failed tool result,
or share arbitrary files. If the tool/CLI is unavailable, explain the missing
installation and direct the user to Settings; do not fall back to echoing secrets.
Only canonical native tool history produces a card, after reply completion.
