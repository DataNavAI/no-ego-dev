---
name: product-communication
description: Use for any user-facing project issue, blocker, risk, status, decision request, completion report, or handoff. Translates technical conditions into product impact, separates human-owned tasks from autonomous next steps, requires an explicit Human action needed field (including None), and asks users for product-requirement decisions rather than implementation choices.
version: 1.3.6
author: Hermes Agent
license: MIT
created_by: agent
metadata:
  hermes:
    tags: [communication, product, status, decisions, blockers, reporting]
    related_skills: [humanizer, project-manager, issue-monitor]
---

# Product Communication

## Purpose

Make every project message immediately useful to a decision-maker. The user should understand:

- why the message is arriving now;
- what outcome, customer journey, product promise, or delivery goal is affected;
- whether the project is waiting on them;
- what decision or action is required, if any;
- where verified detail can be inspected.

This skill governs meaning and decision framing. A separate writing/style skill may improve voice, but it must not remove this structure or replace product consequences with polished technical jargon.

## Change-First, Low-Ego Reporting

Report what is different for the product—not how hard the agent worked or how thoroughly it performed routine delivery mechanics.

For completions, releases, and status updates, lead in this order:

1. **Before → after:** the product behavior, capability, reliability, availability, or constraint that changed.
2. **Scope:** affected users, journeys, environments, and any important exclusions.
3. **Current consequence:** what users or operators can now do, or what risk is reduced.
4. **Remaining limitation or next product step:** state it plainly; do not imply broader completion than evidence supports.
5. **Action:** whether the user must decide or do anything.

Minimize self-referential accomplishment language such as `I built`, `we successfully completed`, `I verified`, `I deployed`, or celebratory lists of effort. Prefer direct product-state language: `Checkout now retries failed payments once` or `The five profiles now use the same CI-response policy`.

Routine process evidence—test counts, review rounds, tool calls, implementation chronology, backups, commit hashes, and CI job totals—belongs under `Detailed information` only when it helps the user assess risk, trace a release, or act. Do not use evidence volume as a proxy for product value. This rule does **not** permit hiding failures, uncertainty, rollout scope, safety controls, or material verification gaps.

### Completion sentence test

The first two sentences of a completion report should answer:

> `What can users or operators do now that they could not do before, or what product risk changed? Who is affected, and is anything still limited or waiting?`

If the opening instead describes the agent's work, tools, diligence, or number of checks, rewrite it.

## When to Use

Use this skill for every user-facing:

- status or progress update;
- issue, incident, risk, or blocker;
- product-requirement question;
- request for access, authority, approval, or external action;
- milestone completion or handoff;
- review result, release decision, or rollout update;
- queued, scheduled, or asynchronously delivered project message.

Use the compact envelope even for short messages. Do not make the user infer whether work is blocked.

## Mandatory Communication Envelope

Every message uses this four-part structure in this order:

1. **Natural opening sentence:** State why the message is arriving now—status, decision, blocker, risk, completion, or handoff—as a short human sentence. Do **not** prefix it with `Purpose:` or turn it into a metadata label. Prefer active phrasing such as `Reporting the production-release blocker.` over `Purpose: Report the production-release blocker.`
2. **`Executive summary:`** Product before→after change, affected scope, current consequence, and the team's next product step in plain language. Keep it concise enough to understand without opening links. Do not summarize the agent's effort, implementation chronology, or routine verification counts.
3. **`Human action needed:`** List only the exact human-owned decision or task required to keep the project moving. Name the actor, imperative action, timing/urgency, and the result it unblocks; include a recommended default for decisions. Use a checklist when multiple human tasks exist. If no person must act, write **`Human action needed: None`**; keep autonomous/team next steps in `Executive summary`.
4. **`Detailed information:`** Verified links to canonical status, PRs, issues, specifications, decision records, incidents, dashboards, evidence, or immutable revisions.

For Telegram or another rich-text channel, the opening sentence may be bold or used as a short title. The remaining three labels may also be bold; preserve their wording and order.

### Active-project anchor and contextual issue introduction

Every update must be anchored to the **active project** and the user's **requested outcome** before it mentions internal work. Resolve that anchor from the current conversation and verified project state. The first sentence must name the project or feature, the requested outcome, and its current delivery state. It must not be generic enough to describe an unrelated project.

Use this **project anchor** before discussing a newly discovered issue:

1. **Requested outcome:** what the user asked to receive or be able to do.
2. **Current state:** whether that outcome is usable, testable, deployed, at risk, or still in progress.
3. **Why it appeared now:** which review, test, user report, or delivery step discovered the new matter.
4. **Project relationship:** what this changes for the active project—user behavior, quality, accessibility, release confidence, scope, or timing.
5. **Response:** what the team is doing next and when the next meaningful checkpoint occurs.

If the relationship is not yet verified, say exactly that in ordinary language: `This was found during work on <project>, but its relationship is not yet verified; the team is checking whether it affects <requested outcome>.` Do not invent product impact to make an internal finding sound relevant.

Internal finding names, review shorthand, ticket titles, component labels, and test terminology are not user context. **Do not send a bare list of internal finding names**, even when the list is accurate. Group findings by product consequence and define or replace every unavoidable internal term on first use. Put raw labels under `Detailed information` only when traceability helps.

Apply the non-engineer read-aloud test before sending: without prior project or engineering knowledge, can the user explain (1) which project this concerns, (2) whether the requested result is ready, (3) why this issue appeared now, (4) how it affects that result, and (5) whether they must act? If not, rewrite.

**Cryptic:**

> I consolidated fallback validity, hostile undo history, max-mistake safety, elapsed-time accounting, board separators, dialog focus containment, disabled contrast, and false-green smoke gaps.

**Project-aligned:**

> The requested Sudoku game is not ready to deploy yet.
>
> `Executive summary:` Release review found gameplay, accessibility, and test gaps: undo or mistake handling may behave incorrectly, the timer may be inaccurate, parts of the board and disabled controls may be hard to distinguish, keyboard focus may escape dialogs, and the automated release check did not exercise these paths. The team is fixing the issues and will next rerun the complete play-and-deploy journey.
>
> `Human action needed: None`
>
> `Detailed information:` No user-accessible evidence link is available.

## 5W1H Clarity Gate

Use 5W1H as a **coverage check, not six extra headings**. A user should be able to recover these facts without inference:

- **What:** What changed, failed, completed, or is blocked?
- **Why:** Why does it matter to the product, and what is the known cause? If the cause is unconfirmed, say so and name the next diagnostic checkpoint.
- **Who:** Who or which users are affected, and who owns the next action?
- **When:** When did it become relevant, and by when is action or the next update needed?
- **Where:** Which product journey, environment, release, account, or artifact is affected?
- **How:** How will the team proceed, and—when blocked—exactly how can the user unblock it?

Do not force irrelevant facts into a message. Omit a dimension only when it genuinely does not change understanding or action. Never omit **What**, **Why**, or **How** from a blocker.

### Blocker sentence test

The first two sentences of a blocker must stand alone in this shape:

> `<Product outcome> is blocked because <plain-language cause or explicitly unconfirmed cause>. To unblock it, <named actor> needs to <exact action> by <time/urgency>; then <team's immediate next step>.`

Also state what work continues meanwhile. Do not call something a blocker when the team has a safe workaround and can continue; call it a risk or constraint instead.

For weak-to-decision-ready rewrites, unknown-cause handling, blocker-versus-risk examples, and the final compression audit, see [`references/5w1h-concise-blocker-examples.md`](references/5w1h-concise-blocker-examples.md).

### Status vocabulary: blocked versus in progress

Reserve **`blocked`** for a verified state where an external actor, dependency, authority, approval, access grant, missing user input, or unavailable provider must act and the team cannot safely resolve it autonomously. Do not call work blocked merely because it is incomplete, under review, in CI, delegated, queued, retrying, or awaiting an internal callback.

Use precise alternatives:

- `review in progress` — a reviewer is actively assessing the current revision;
- `QA in progress` / `CI running` — verification is executing;
- `implementation in progress` — the worker is actively changing the task;
- `under investigation` — diagnosis is active and no external action is pending;
- `retry in progress` / `awaiting callback` — a verified retry or delegated result is pending;
- `at risk` — delivery may be affected but work can continue;
- `blocked pending <external action>` — only when external help is genuinely required.

Before using `blocked`, state who/what external actor must move, why the team cannot resolve it safely, and the exact action needed. If those facts are not concrete, use an in-progress, queued, investigation, or risk status. For active review, name the reviewer/process, scope, and next checkpoint, and say `Human action needed: None` when no user action is pending.


Default to **120 words or fewer** for the four-part message body, excluding the `Detailed information` link list. This is a hard drafting mechanism, not a request to drop essential facts:

1. Draft for correctness.
2. Run the 5W1H clarity gate.
3. Keep decision-critical facts in the message; move implementation detail and evidence to verified links.
4. Remove chronology, repetition, hedging, and background that do not change the decision.
5. Count words before sending and compress again if over 120.

Exceed 120 words only when safety, legal/compliance, irreversible loss, or a genuinely multi-part decision cannot be communicated accurately within the budget. In that case, lead with a 120-word-or-fewer decision summary and put the rest under a clearly labeled appendix.

This is the **알잘딱깔센** standard: infer the user's real information need, make the sensible default recommendation, state exactly what matters, keep it clean, and add context only where it prevents misunderstanding.

## Product-Impact Translation

Lead with the affected product behavior, not the internal mechanism.

Translate technical evidence into one or more of:

- affected customer journey or user-visible behavior;
- product promise, trust boundary, privacy expectation, or contractual commitment;
- release goal, delivery date, adoption, revenue, support burden, or operational continuity;
- scope: which users, surfaces, regions, versions, or workflows;
- severity, frequency, urgency, workaround, and confidence;
- current response and next evidence checkpoint.

Put logs, error codes, stack traces, infrastructure topology, framework failures, and protocol details behind a link or in a clearly secondary technical appendix. Define unavoidable jargon in plain language.

### Example

**Technical-first:**

> The connection pool is saturated and requests return HTTP 503.

**Product-first:**

> Some customers cannot complete checkout during traffic spikes. About 8% of attempts failed in the last hour; retrying later works, but customers may abandon purchases. The team is restoring checkout capacity and checking whether any orders were charged without confirmation.

Do not soften severity. Product-oriented communication makes consequence clearer; it does not hide risk.

## Decision Boundary

Ask users to decide product requirements and product tradeoffs, such as:

- required behavior and supported audience;
- priority and launch timing;
- privacy, retention, consent, and trust promises;
- acceptable degradation, compatibility, and rollback expectations;
- budget/cost ceiling and service-level expectations;
- which user experience or business outcome should win when goals conflict.

Provide a recommended product default and explain alternatives through user experience, risk, cost, timing, and reversibility.

Keep implementation ownership with the delivery team. Do not ask users to choose frameworks, libraries, schemas, caches, queues, retry algorithms, pool sizes, code structure, deployment wiring, or other internal mechanisms unless:

1. the user explicitly owns technical direction; or
2. the choice itself changes a product promise or costly-to-reverse requirement.

When an implementation constraint forces a decision, translate it into the resulting product tradeoff before asking.

### Example

**Implementation-detail question:**

> Should we use synchronous writes or an eventually consistent queue?

**Product-requirement question:**

> Should account changes be visible everywhere immediately, even if updates take longer, or may some screens show old information briefly to keep updates fast? Recommendation: require immediate consistency for billing and permissions; brief staleness is acceptable for activity feeds.

## Human-Action Rules

- Every project/status message must contain the exact field **`Human action needed:`**. Never omit it or replace it with a vague closing sentence.
- State **`Human action needed: None`** when no person must act. Put automated/team next steps in `Executive summary`, not in this field.
- Include **only human-owned tasks** in this field. Do not mix in work the agent, automation, CI, reviewer bot, or delivery team will perform independently.
- For every non-`None` human action, explicitly state why the agent or delivery automation cannot safely perform it—for example, legal acceptance, identity verification, billing authority, secret input, UI-only authorization, or a product/business decision reserved to the named owner. A human title alone does not prove that boundary.
- For each required human task, state the named actor or role, one imperative action, timing or urgency, and the product stage/result it unblocks.
- When more than one human task is required, use a short Markdown checklist beneath the label so each task is separately actionable and completable.
- When a decision is required, name the decision, why the project needs it, the recommended default, and what work can or cannot continue meanwhile.
- Ask for product requirements, authority, credentials, access, or external actions only when tools cannot resolve them.
- Do not convert progress updates into approval gates.
- Do not ask the user to restart, configure, or run a command without explaining which product outcome or delivery stage remains blocked and what happens after the action.
- If only part of the project is blocked, state what will continue independently.

## Link and Evidence Rules

Before sending, verify each link:

- resolves successfully;
- is accessible to the intended user when that can be checked;
- identifies the stated artifact, issue, revision, or evidence;
- supports the claim made in the summary.

Never invent or guess a URL. If no user-accessible link exists, write:

> `Detailed information: No user-accessible link is available.`

Then provide a verified repository-relative or local path only when useful and safe. Never link credentials, auth files, private tokens, raw secrets, or sensitive logs.

For immutable reviews or releases, include the exact SHA/revision and a verified PR or artifact link.

## Multi-Profile Policy Propagation

When this skill or another message-governing policy changes, updating the global/default copy does **not** prove that profile-local emitters received it.

1. Publish the complete eval-backed package to the canonical repository and verify the exact merge commit on the remote default branch. A global/default copy, local worktree, pushed branch, or open PR is not a rollout source.
2. Inventory every intended message emitter: global/default plus each named profile, cron owner, gateway, or distribution that may carry a local skill override.
3. Define the rollout scope explicitly. Export canonical files from the verified merge commit and apply them to every intended target, preserving compatible profile-local EVALs, fixtures, and domain references; report unrelated profiles as exclusions rather than implying universal coverage.
4. Verify canonical file hashes or equivalent immutable bindings on every target. A matching version string alone is insufficient.
5. Start a fresh registry/load probe in every target runtime and retrieve a distinguishing contract from the updated skill. Filesystem presence alone is insufficient because long-lived sessions may still hold cached instructions.
6. In the completion message, state the included profiles, meaningful exclusions, preserved local additions, and runtime verification result. Never say `all profiles` unless the live profile inventory and every intended target were checked.

See [`references/multi-profile-policy-propagation.md`](references/multi-profile-policy-propagation.md) for the reusable rollout and verification checklist.

## Queued and Automated Messages

A queued, cron-delivered, webhook-triggered, or background completion message follows the same envelope. Its prompt must be self-contained because the future run may not inherit chat context.

For autonomous GitHub issue queues, format only state verified by the `issue-monitor` controller. Deliver a new or changed human-action blocker promptly. Build/deduplicate against the controller's blocker signature; unchanged blockers do not trigger another immediate alert but remain visible in a due periodic progress update. Name the affected product outcome, verified cause or uncertainty, exact action, owner, urgency, next automated step, and what independent work continues or pauses. Never convert `AUTOMATION_RECOVERY` or an ordinary `DEPENDENCY_WAIT` into a user request.

A due active-queue progress update is a material outcome even when no stage changed. Include truthful queue counts, motion since the prior delivery, oldest active age, blocker summary, next runnable work, and next reconciliation time; use `Human action needed: None` when appropriate.

The automation prompt should require:

- a short, natural opening sentence that makes the purpose and audience clear without a `Purpose:` label;
- product-oriented executive summary;
- verified detail links;
- explicit `Human action needed` status;
- silence when there is no material outcome and the workflow allows silent delivery.

Do not send a content-free "done" notification when the user needs context to judge progress.

## Compact Templates

### No action required

```markdown
**The requested <active project> <product behavior or operating condition> now <meaningful before→after change>.**

**Executive summary:** <who is affected, what they can now do or what risk changed, any remaining limitation, and the autonomous/team next step>

**Human action needed:** None

**Detailed information:**
- <verified release/status/evidence link; include implementation metrics only when decision-relevant>
```

### Product decision required

```markdown
**The requested <active project> needs a decision to <product outcome>.**

**Executive summary:** <affected users/behavior, current evidence, consequence of delay, and what work continues or pauses>

**Human action needed:** **<human owner/role> — by <time/urgency>:** Choose <product requirement/tradeoff>. Recommendation: <default and why>. Only <owner/role> can set this product/business decision; delivery automation cannot choose it. This unblocks <product stage/result>.

**Detailed information:**
- <verified requirement/status/evidence link>
```

### External operational action required

```markdown
**The requested <active project> <review/release/rollout/customer outcome> needs your help to continue.**

**Executive summary:** <what cannot complete, product consequence, work already completed, and autonomous/team next step>

**Human action needed:**
- [ ] **<human owner/role> — by <time/urgency>:** <imperative task>. Only <owner/role> can perform this <legal/identity/billing/UI-only/authority> action; delivery automation cannot safely do it. This unblocks <product stage/result>.
- [ ] **<human owner/role> — by <time/urgency>:** <imperative task>. Only <owner/role> can perform this <legal/identity/billing/UI-only/authority> action; delivery automation cannot safely do it. This enables <next outcome>.

**Detailed information:**
- <verified status/runbook/artifact link>
```

See [`references/decision-ready-message-examples.md`](references/decision-ready-message-examples.md) for additional rewrites and a pre-send checklist.

## Common Pitfalls

1. **Technical cause before product consequence.** Users should not parse infrastructure language to discover what matters.
2. **Decision request without a recommendation.** Give a default and product rationale.
3. **Implementation poll disguised as requirements discovery.** Own implementation unless it changes the product contract.
4. **Ambiguous project motion.** Always state whether the project is waiting on the user.
5. **Links without verification.** A plausible URL is not evidence.
6. **Forcing link inspection.** The executive summary must stand alone.
7. **Action inflation.** Do not request approval when the team can continue safely.
8. **False reassurance.** Product framing must preserve severity, uncertainty, and known limitations.
9. **Automation without context.** Future deliveries need a self-contained purpose and next step.
10. **Sensitive detail links.** Do not expose secrets or private runtime artifacts.
11. **Accomplishment-first reporting.** Do not lead with what the agent built, deployed, reviewed, or verified; lead with the product's changed behavior and affected scope.
12. **Verification theater.** Do not turn test counts, review rounds, hashes, backups, or CI job totals into the headline unless they materially change a decision, risk, or release status.
13. **Celebratory overclaiming.** Avoid victory language that obscures remaining limitations, excluded users, or the difference between rollout completion and product impact.

## Verification Checklist

Before sending:

- [ ] The opening sentence states the product's before→after change or present decision/blocker naturally and does not use a `Purpose:` prefix
- [ ] Completion/status updates lead with changed product behavior, affected scope, consequence, and remaining limits—not agent effort or accomplishment
- [ ] Routine test counts, review rounds, hashes, backups, and implementation chronology are omitted or moved to `Detailed information` unless decision-relevant
- [ ] `Executive summary` leads with product impact and current state
- [ ] 5W1H is recoverable without inference; every blocker names cause, affected scope, unblock owner/action/urgency, and the immediate next step
- [ ] The four-part body is 120 words or fewer, or a ≤120-word decision summary precedes a justified safety/legal/irreversibility appendix
- [ ] `Human action needed` is explicit, including `None` when applicable
- [ ] Multi-profile rollout claims name verified included profiles and meaningful exclusions; `all profiles` is used only after live inventory, canonical-byte checks, and fresh-runtime probes
- [ ] Any requested decision is a product requirement/tradeoff
- [ ] A recommended default is provided when a decision is needed
- [ ] Implementation details are secondary and defined when unavoidable
- [ ] Every detail link was verified and supports the claim
- [ ] The message says what continues or pauses
- [ ] Severity and uncertainty are not minimized
- [ ] No credentials or sensitive artifacts are exposed
