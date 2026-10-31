---
name: task-management
description: Use for every user development request, including features, bugs, refactors, tests, deployment, and skill changes, to create or update durable NED goals and tasks before execution and maintain their state through completion.
---

# Task management

## Mandatory completion: merge and local deployment

For every task in this distribution, completion requires applicable checks and
manual acceptance, independent review, merge into remote `main`, and verified
deployment from that merged commit to the default local Hermes instance. The user
has authorized this normal merge/deployment flow; do not repeatedly request it.
Do not mark NED tasks/goals done or send a completion report while any gate remains
pending. A local implementation, draft PR, passing tests, or skills-only copy does
not establish full deployment.

Use an isolated checkout for the task; preserve unrelated working-tree changes.
Fetch main, resolve integration, run the repository's required automated/manual
checks, obtain exact-candidate review and green PR checks, merge, then read back
the remote merged SHA. Deploy only committed merged contents. For CLI/runtime
changes run the canonical checkout installer `bash scripts/install.sh` from the
merged checkout and verify installed commands and generation identity. Run
`node scripts/deploy-hermes-skills.mjs` for canonical skills. Install/update any
affected profile-local plugins, preserve existing user configuration/credentials,
enable only required plugin/toolset entries, and reload affected local Hermes/COM
processes when needed. Verify the running/local installed behavior at the merged
revision, then record merge/deployment evidence and complete the owned NED task.
Never use AWS or named-profile rollout as a substitute for this local target.
If deployment/review/access fails, keep work open with the actual blocker and
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
3. After an external condition resolves, use `ned task unblock <id>`; remaining dependencies still apply. Inspect `get`, `history`, `tree` and `ready` to resume after interruption. After an uncertain create response, inspect before retrying because create has no idempotency key.
4. Verify the task's acceptance checks before `ned task done <id> --reason <evidence summary>`. The claiming actor completes it. Keep blocked or unverified work open.
5. Inspect milestone children and progress. Complete the goal explicitly with `ned goal done <id>` only after all children and its outcome are verified. Derived 100% progress does not close the stored goal.

For this no-ego-dev distribution, after each completed task run `node scripts/deploy-hermes-skills.mjs` from its checkout. The default local Hermes instance is staging. Check the deployment result before reporting staging updated; failures require remediation and truthful status. Do not deploy to named profiles or AWS through this command. Fresh Hermes sessions load the new skill files; existing sessions may retain earlier instructions.

## Reporting

Report actual persisted state, acceptance evidence and unresolved blockers. A task is not complete merely because an agent returned. Use JSON output and exit status as evidence. Failures exit nonzero; inspect state before retrying. The shared SQLite default is `~/.ned/ned.sqlite`; `--database` overrides `NED_DATABASE_URL`. No remote tracker, model call or Hermes restart is required for task commands.

## Secret handoff during development

When work needs a password/token, ask the user to open COM → Settings → Secrets,
save it under a key such as ADMIN_PASSWORD, and tell NED only that key. Do not ask
them to paste credentials into chat or put values in tasks/issues/descriptions.
Verify that the installed CLI supports `ned secret --help`; from a trusted development checkout use `node bin/ned.js secret` if the installed release is older. Never pretend an unsupported command retrieved a value.
Retrieve it with `ned secret get ADMIN_PASSWORD --file`; this prints a private
path, not the value. Pass that file directly to the consuming tool's secret-file
option or a private process input. Do not cat/read the bytes into a tool transcript,
echo them, add them to command arguments, or include them in logs/final messages.
If the consumer needs an environment variable, load from the file inside the
process without shell tracing or printing its value. Raw `ned secret get KEY`
intentionally outputs plaintext and is unsuitable for chat-visible tool output.
If the key is missing, direct the user to Settings; never invent a value or report
access succeeded. Vault scope is the local NED home, shared across projects;
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
