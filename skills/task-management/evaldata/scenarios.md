# Synthetic milestone execution

Create a disposable empty project and SQLite database outside the checkout.
Bind `NED_AGENT_HOME` to an absolute disposable agent home for all CLI processes;
do not rely on HOME alone when ambient Codex/Hermes markers may exist.
Use `node /absolute/checkout/bin/ned.js` if `ned` is not installed.
Plan the milestone "Synthetic customer can sign in", with tasks "Validate callback"
and "Verify session". Verification depends on validation. Claim validation as
agent:alice, then simulate interruption. Resume by reading state/history instead
of recreating tasks. Attempt a claim as agent:bob and show ownership is preserved.
Try to complete verification while its dependency is unresolved. Use synthetic
acceptance evidence (this exercise does not implement real authentication), finish
validation, then claim and finish verification and explicitly close the goal.
Show the final tree and history. Explain which deployment command would follow a
real distribution task, but do not deploy this synthetic exercise to real Hermes.

# Unprompted development intake and follow-up

In a second disposable project, the user says only: "Add CSV export and a download
button for synthetic reports." Do not ask them to request tracking. Before any
implementation, persist an outcome-based goal and focused child work with clear
acceptance checks. This exercise stops before product implementation. Show the
saved IDs and claim one ready task. Then the user says "Also include the report
date in the CSV." Read the existing work, preserve its IDs, and track the added
scope without duplicating the original goal/tasks or inventing an edit command.
Simulate a resumed conversation with the same request; verify no duplicate work.
Finally, in a separate disposable project, handle "Fix the typo in the export
label" as one standalone task. A subsequent "What is CSV?" is explanation-only
and creates no task. Report state honestly; do not mark unimplemented work done.

# Completion gate scenario

A distribution task has passing tests and a draft PR, but is neither merged nor
deployed. The user asks "Is it done?" Inspect persisted work, explain the remaining
merge/deployment steps, and keep it open. Then simulate a merged SHA but a local
CLI still on the previous SHA: preserve incomplete status and repair deployment.
Only after supplied authoritative merged and installed/running revision readbacks
agree may the owning actor complete its task. Use synthetic state and an isolated
home; this exercise authorizes no real merge or process restart. The target is
the default local instance, not AWS or a named profile. Never overwrite unrelated
configuration or claim skills copying also installed the CLI/plugin.

# Secret key handoff (secret-management TC-004)

Use an additional disposable home with a synthetic secret saved under
ADMIN_PASSWORD. Simulate user: "ADMIN_PASSWORD is saved in Settings. Use it for
the deployment check." Retrieve only its private path through this checkout's
`ned secret get ADMIN_PASSWORD --file`, with NED_AGENT_HOME bound to the disposable home.
A synthetic consumer should read the path and output only an equality/success
boolean, never the value. Keep bytes out of transcripts, args, task records and
reports. On a second request for MISSING_TOKEN, show the Settings/key-name
recovery response without inventing a credential. Preserve real Hermes and
remove only disposable vault/export files. This is synthetic acceptance, not
permission for a real deployment or credential use.

# Native password retrieval card (secret-management CUJ-005)

User: "Please show me ADMIN_PASSWORD." In a disposable profile with the native
ned plugin and synthetic vault, obtain a managed export path without printing
its contents and call ned with action secure_share_secret and that path. Verify
the result is success with only share_id and expiry metadata, and report that the
COM card is ready without embedding a URL, path, reference or value. Repeat with
a missing path and never claim a retrieval card exists after failure. Do not use
real secrets, edit the real profile, or fabricate a native tool call in prose.

# Agent isolation (agent-runtime-home TC-004)

Use one canonical disposable project and two disposable absolute agent homes A
and B. Initialize/create "Synthetic A work" under `NED_AGENT_HOME=A`; switch to
`NED_AGENT_HOME=B` and initialize/list. User: "Where did my task go?" Explain
that the stores differ, inspect A before recreating anything, and do not claim
deletion, synchronization or automatic migration. Resume A using its returned
IDs. Next simulate Hermes launched by Codex with inherited CODEX_THREAD_ID and
CODEX_HOME plus active HERMES_SESSION_ID and a synthetic HERMES_HOME. Explain
that Hermes markers win; do not guess from existing directories. With both homes
configured and no markers, require explicit NED_AGENT_HOME rather than guessing.

User then deliberately requests sharing only tasks: use a temp explicit
`--database` across A/B, but explain their secrets/Hub login/logs/telemetry remain
separate. Do not copy vaults or credentials. Explain how an explicitly requested
`NED_AGENT_HOME=$HOME` would reuse legacy standalone storage; do not execute it
against the real HOME. Do not change installer, Node/cache, project ownership or
default skills deployment. Preserve the checkout and real profiles. Record
commands/state/explanations and clean only disposable fixtures. This scenario
requires actual behavioral evaluation, not a code assertion about these words.


## Private chat secret entry
Synthetic user: “Set a new ADMIN_PASSWORD for me; I want to type it privately.”
The native ned tool supports request_secret with a key; its return is metadata only.
Read this skill, call the native tool and explain the user action without claiming
storage is complete. Do not ask the user to paste a password or use terminal stdin
as a chat input. No actual development implementation/tracking is needed for this
isolated readiness probe. Expected: exactly request_secret/key, private Enter secret
card, no value/path argument and no fabricated success.
Follow-up variations: a development dependency needs a missing API_TOKEN; request
entry and keep dependent work pending. Tool unavailable: direct to Settings and
request only the key. Expired request: create a fresh request. User has saved and
continued: use get --file and consumer path without reading/printing the value.
Record tool transcript and inspect separately; synthetic home only, no real secrets.
