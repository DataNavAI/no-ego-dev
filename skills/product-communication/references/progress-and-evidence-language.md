# Progress and Evidence Language

Use this reference when an update combines delivery motion, approval or configuration state, source authority, security risk, or access setup. Report only the furthest state proved by current evidence.

## Running, queued, and unchanged work

Distinguish **verified running work** from intended work.

- Use `Running now:` only after confirming a live worker or process and name its product task.
- Use `Queued—not started:` for eligible successors, including work waiting on a dependency or capacity.
- If no product worker is active, say so and name the exact start condition. A scheduler tick, tracker status, or intention to retry is not execution.
- If dispatch fails, state whether a repair worker actually started or recovery remains not started.
- List at most three concrete items in dependency order and translate each into a product outcome.
- A completion update still names the next product checkpoint.

For scheduled work, read the **canonical task/run record** and latest outcome before naming a state. Verify that any claimed process belongs to the task, and verify the external product outcome separately. A cron `ok` proves only that the scheduler command exited successfully; it does not prove a task became eligible, a worker started, or the product outcome completed. If the scheduler says no work is ready, inspect dependency, project binding, and claim-rejection state before calling the queue healthy.

**Unchanged-worker silence rule:** When a previously reported worker is still verified running and no lifecycle, task, issue, review, release, or human-action state changed, return exactly `[SILENT]` if the delivery channel allows silence. A periodic liveness check is not a product update.

## Approval, policy, and documentation reconciliation

Before escalating a decision or external blocker, re-read the latest owner direction and the canonical policy, requirement, issue, and runtime state available to the workflow.

Separate these states:

1. approval still required;
2. approval granted but not yet applied;
3. configuration present but runtime adoption unverified;
4. approval cleared while internal review, CI, or implementation remains;
5. stale documentation contradicting current authority.

Documentation drift is not a fresh approval gate. Correct the durable record when authorized and say: `You do not need to approve this again; the internal document is out of date and is being aligned.` Never imply that an approved infrastructure change enables a user-facing feature when later product gates remain.

## Source authority

Classify evidence before turning it into a product claim:

- **Direct authoritative evidence:** current official documentation, verified system readback, or a named owner speaking about their owned workflow.
- **Owner-confirmed:** a named accountable owner explicitly confirms the relevant fact.
- **Internal planning or post-meeting interpretation:** useful for hypotheses, prototypes, sequencing, and interview questions; not proof of an external commitment.
- **Candidate artifact:** intended or upload-ready content; not proof of production attachment, publication, or availability.

Call the section or report `Source authority` when the distinction matters. Do not call an internal planning transcript a stakeholder decision. Ask for the smallest matching confirmation and do not make a user re-upload material when a concise owner statement is enough.

## Delivery-state ladder

For planned or operational behavior, separate the user-visible lifecycle:

| State | Meaning | Required boundary |
|---|---|---|
| **Spec / design complete** | Intended behavior is documented; code and live delivery may be unchanged. | Say what users experience now and what must happen before implementation. |
| **Implemented** | Code and targeted tests are complete; the runtime path may still be disabled or unexercised. | Say that the code is ready but users do not receive it yet. |
| **Enabled / live** | Required configuration and the complete delivery path were exercised successfully. | State the authoritative live readback, scope, and remaining propagation limits. |

Apply the same ladder to publication and interactive journeys. Local packaging proves candidate compatibility, not registry availability. CI, staging, promotion, or production-like checks prove only their named boundary, not live behavior. Before saying a release is live, read the public surface and verify the expected status, content, or revision. Before saying an **interactive flow** is ready, exercise submission through validation and the intended next state or a visible redacted failure; an input-capture probe, dry run, mock, or process that needed killing is insufficient.

When linking a multi-file product artifact, verify the canonical manifest or index and the published branch. Do not call a short rule file, archive member, derivative export, or recovered reconstruction the full source. If source recovery is incomplete, say so and link only verified components.

## Common-language security vocabulary

Lead with what could happen to a person, account, or private data. Put the mechanism in parentheses only when traceability changes a decision.

| Preferred product phrase | Typical internal mechanisms |
|---|---|
| **wrong account or wrong destination** | redirect, issuer, audience, or sign-in configuration errors |
| **someone could use or recover the wrong account data** | ownership, authorization, record substitution, or session binding |
| **a request could be reused after it should have expired** | replay, duplicate use, expiry races, or idempotency errors |
| **protected recovery data could be read or changed incorrectly** | encryption, signing, key-version, or integrity failures |
| **private details could appear in a message or log** | token, provider-error, secret, or sensitive-data exposure |
| **the system accepted an unexpected input shape** | malformed-input, accessor, proxy, or schema-validation failures |

State severity and exposure separately. `Could affect account ownership` is materially different from pre-release malformed-input hardening. Say whether the path is live: `not user-reachable while the feature is off` does not mean `safe to enable`.

## Authentication state

A browser session, OAuth client registration, granted API scopes, locally stored credentials, a **refreshable token**, and a successful end-to-end operation are different authentication states. In an access or recovery update, name the furthest verified authentication state and the next readback. Do not say sending, publishing, or delivery is restored until the real operation succeeds and authoritative state is read back.

## Reader-clarity complaint correction

Treat a **reader-clarity complaint** as a communication defect, not merely a request to shorten one reply.

1. Restate the active project and real product outcome in ordinary language.
2. Move internal identifiers and delivery mechanics to `Detailed information`.
3. Name the current user-visible limit; do not present groundwork as a finished capability.
4. State the next product checkpoint, not an internal ticket or worker event.
5. Apply the same correction to the durable template, skill, or automation prompt that produced the confusing update when authorized.

Before sending again, confirm a non-engineering reader can answer: `Can I use this now? If not, what is being made safe first, what happens next, and do I need to act?`
