---
name: communication-evaluator
description: Use when independently evaluating a NED message before or after it is sent to a user. Scores product framing, human-action clarity, evidence, brevity, and especially whether a person without a software-engineering background can understand the message after one read; returns an approval verdict, material findings, and a plain-language rewrite without inventing facts.
version: 1.0.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [communication, evaluation, plain-language, accessibility, product, review]
    related_skills: [product-communication, project-manager, issue-monitor]
---

# Communication Evaluator

## Overview

Use this skill as an independent quality gate for messages NED sends to users: status updates, blockers, decision requests, incident notices, review outcomes, completion reports, release updates, and handoffs.

Evaluate the message from the recipient's point of view, not the author's. The default recipient is an intelligent product owner or operator who has **no software-engineering background** and should not need to understand source control, CI, infrastructure, model orchestration, or implementation jargon to know what happened and what to do.

The governing behavioral source is `product-communication`. This evaluator adds a stricter comprehension test: after one read, a non-engineer must be able to explain the product state, impact, action boundary, and next step accurately.

This is a material-quality review, not copyediting. Ignore reversible wording preferences that do not change understanding, decision quality, trust, or actionability.

## When to Use

Use this skill:

- before a high-impact NED message is sent;
- as a delegated reviewer for cron, issue-monitor, project-manager, release, or incident output;
- after a user says a message was confusing, too technical, too long, or unclear about required action;
- when reviewing templates or EVAL outputs that govern future user messages;
- when comparing two candidate messages for clarity.

Do not use it to:

- verify whether code, CI, deployment, or product claims are technically true when no evidence is available;
- invent missing product facts;
- replace legal, security, accessibility, or incident-response review;
- reward polished prose that hides severity or uncertainty.

## Required Inputs

Evaluate the exact message bytes whenever possible. Also accept:

1. intended recipient or audience, if narrower than the default non-engineer;
2. message type: status, blocker, decision, incident, completion, release, or handoff;
3. known product context and verified evidence;
4. channel and practical length constraints.

If audience or context is omitted, use the default non-engineer recipient and evaluate only what the message itself establishes. Do not assume unstated facts. Mark a claim `not verifiable from supplied evidence` rather than calling it false.

## Evaluation Procedure

### 1. Freeze the candidate

Quote or hash the exact candidate under review. Do not silently improve it before scoring. If multiple messages are supplied, evaluate each independently before comparing them.

### 2. Identify the message contract

Determine:

- why the message is arriving now;
- the affected product behavior, user journey, promise, release, or operating condition;
- whether a person must act;
- what evidence or links the message claims;
- what happens next.

Do not infer these from private conversation context if the future recipient will not have it.

### 3. Run the non-engineer one-read test

Read the message once as a person without a software engineering base. Without opening `Detailed information`, answer in everyday language:

1. **What changed, failed, completed, or is waiting?**
2. **Who is affected?**
3. **Why it matters to them or to the product?**
4. **What a person must do, if anything?**
5. **What happens next?**

This is the **one-read test**. Record the answers under `Non-engineer readback:`. If an answer depends on guessing, write `Missing or unclear` and score the relevant dimension down.

A message fails this test when a reader must understand terms such as `SHA`, `PR`, `CI`, `CD`, `HTTP 503`, `schema`, `migration`, `queue`, `worker`, `gateway`, `cardinality`, `telemetry exporter`, or `rollback` to recover the product meaning. Technical terms may appear in `Detailed information`; in the summary, define any unavoidable jargon immediately in ordinary words.

### 4. Apply hard-fail gates

Evaluate hard gates before calculating the score. A hard fail always yields `CHANGES_REQUIRED` regardless of points.

### 5. Score the weighted rubric

Score each dimension using evidence from the exact message. Do not give credit for facts available only in external context unless the intended recipient will receive that context too.

### 6. Return only material findings

A finding is material when it changes comprehension, actionability, product truth, safety, privacy, severity, or trust. Do not report stylistic nits, synonym preferences, or optional polish.

### 7. Suggest a fact-preserving rewrite

For `CHANGES_REQUIRED`, provide one concise rewrite that fixes all material findings. Preserve verified severity, uncertainty, scope, and limitations. Use placeholders such as `<affected users>` when facts are missing; never invent numbers, dates, owners, causes, links, or successful outcomes.

## Weighted Rubric

| Dimension | Weight | Full-credit standard |
|---|---:|---|
| Product and outcome framing | 15 | Leads with before→after behavior or current product state, affected scope, consequence, and remaining limit—not agent effort or implementation chronology. |
| Non-engineer comprehension | 25 | Passes the one-read test; ordinary words carry the core meaning; every unavoidable technical term or acronym is immediately explained. |
| Human decision and action clarity | 15 | Uses `Human action needed:` correctly; says exactly `None` when no person must act; otherwise names the human actor, imperative action, timing, result unblocked, recommendation when relevant, and why automation cannot safely do it. |
| 5W1H context and next state | 10 | What, why, who, when, where, and how are recoverable where decision-relevant; every blocker states cause or uncertainty, what continues, and the next checkpoint. |
| Structure and status semantics | 10 | Natural opening, then `Executive summary:`, `Human action needed:`, and `Detailed information:`; blocked/risk/in-progress terms match the actual state. |
| Brevity and cognitive load | 10 | Core body is normally no more than 120 words, uses short sentences and scannable chunks, avoids dense nesting, repetition, and evidence dumps. |
| Evidence, honesty, and safety | 10 | Claims stay within supplied evidence; uncertainty and exclusions are explicit; links are not invented; no credentials, secrets, or sensitive runtime data appear. |
| Respectful accessible tone | 5 | Calm, direct, non-condescending, low-ego, and culturally neutral; neither alarmist nor falsely reassuring. |

**Total: 100 points.**

### Scoring anchors

For each dimension:

- **100% of weight:** complete and independently understandable;
- **75% of weight:** understandable with one minor gap that does not change action or trust;
- **50% of weight:** material ambiguity, jargon, or missing context forces inference;
- **25% of weight:** the dimension is mostly absent or misleading;
- **0:** unusable, unsafe, or directly contradictory.

Use whole-number points. Explain every deduction that contributes to a material finding. Do not deduct twice for the same defect unless it independently harms two dimensions—for example, an unexplained acronym may reduce both comprehension and action clarity only when it obscures both.

## Hard-fail Gates

Any of the following requires `CHANGES_REQUIRED`:

1. **Misleading product state:** claims success, rollout, safety, recovery, review approval, or user impact not supported by supplied evidence.
2. **Core meaning inaccessible:** a non-engineer cannot determine what changed, who is affected, why it matters, or what happens next without understanding unexplained jargon or an acronym.
3. **Missing or wrong action boundary:** omits `Human action needed:`, hides a required human task, puts autonomous team/agent work in that field, or asks the user to choose implementation details instead of a product requirement.
4. **Unsafe or incomplete blocker request:** asks for credentials, access, approval, restart, payment, publication, or another consequential action without actor, imperative task, urgency, result unblocked, and why automation cannot safely perform it.
5. **Sensitive-data exposure:** includes passwords, tokens, credential contents, private auth paths, private customer data, or unnecessary sensitive logs.
6. **Severity distortion:** minimizes material risk, presents ordinary in-progress work as blocked, or uses alarmist language unsupported by impact.
7. **Fabricated or unusable evidence:** invents links, cites evidence that does not support the summary, or forces the user to open technical artifacts to discover the basic product consequence.

A command that returned without an error proves only that narrow fact. Do not rewrite it as `uploaded`, `published`, `deployed`, `live`, or `available` without authoritative readback. Prefer: `The upload command returned without an error, but availability has not been verified.`

## Plain-Language Checks

### Jargon and acronym check

Flag unexplained words that a general product user may not know. Common examples:

- `CI failed` → `the automated release checks failed`;
- `PR is waiting for review` → `the proposed product change is being reviewed`;
- `rollback` → `restore the previous working version`;
- `HTTP 503` → `the service was temporarily unavailable`;
- `telemetry exporter dropped samples` → `the monitoring system stopped recording some service measurements`;
- `high-cardinality labels` → `too many unique tracking labels overloaded the monitoring path`.

A parenthetical definition is enough when the technical term is useful for traceability. Do not ban technical detail from `Detailed information`.

### Cognitive load check

Reduce the score when the reader must:

- decode several nouns chained together;
- hold more than one timeline or candidate state in working memory;
- compare hashes, build numbers, or review rounds to understand the headline;
- search for the action inside a long paragraph;
- infer whether `we`, `they`, `the team`, or `you` owns the next step;
- interpret percentages or counts without a denominator, baseline, or consequence.

### Non-condescension check

Plain language is not childish language. Preserve accurate concepts and meaningful uncertainty. Do not use `simply`, `obviously`, `just`, or patronizing explanations. A reader without engineering experience may still be an expert in the product, customers, operations, finance, or policy.

## Verdict Rules

Return:

- **`APPROVED`** — score is at least 85, no hard-fail gate applies, and the one-read test answers all five questions accurately enough to act.
- **`CHANGES_REQUIRED`** — any hard-fail gate applies, score is below 85, or one-read comprehension is materially incomplete.

Do not create `APPROVED_WITH_NOTES`, `MINOR`, or stylistic follow-up categories. If only optional polish remains, approve and omit it.

## Required Output Schema

```markdown
Verdict: <APPROVED | CHANGES_REQUIRED>
Score: <0-100>/100
Hard-fail gates: <None | numbered gate names>

Non-engineer readback:
- What changed: <plain-language answer | Missing or unclear>
- Who is affected: <answer | Missing or unclear>
- Why it matters: <answer | Missing or unclear>
- What a person must do: <answer | None | Missing or unclear>
- What happens next: <answer | Missing or unclear>

Rubric:
- Product and outcome framing: <points>/15 — <evidence>
- Non-engineer comprehension: <points>/25 — <evidence>
- Human decision and action clarity: <points>/15 — <evidence>
- 5W1H context and next state: <points>/10 — <evidence>
- Structure and status semantics: <points>/10 — <evidence>
- Brevity and cognitive load: <points>/10 — <evidence>
- Evidence, honesty, and safety: <points>/10 — <evidence>
- Respectful accessible tone: <points>/5 — <evidence>

Material findings:
1. <problem → recipient consequence → exact correction>

Suggested rewrite:
<fact-preserving message, or "Not required" when approved>
```

The rubric points must add up to `Score`. If context is insufficient to verify truth, distinguish `not verifiable` from `incorrect`.

Use `scripts/score_evaluation.py` to total dimension scores and apply the 85-point, hard-fail, and one-read gates deterministically. `evaldata/cases.yaml` freezes exact A–D score/verdict oracles for regression testing; prose review still supplies the evidence-based dimension scores.

## Review Examples

### Opaque technical status

> The canary is blocked because the OTel exporter exceeded cardinality limits. CI is green but the promotion job is paused pending schema remediation.

Material problem: a non-engineer cannot tell which product capability or users are affected. A better summary is:

> The release is paused because the monitoring system cannot reliably record whether the service is healthy. Customers are still using the current version; no user action is needed while the team repairs the measurements and reruns the release checks.

### Clear completion

> Checkout now keeps a customer's basket when a payment attempt fails. This affects web checkout in the US; mobile checkout is unchanged. The team will watch failed-payment recovery for 24 hours.
>
> `Human action needed: None`

This is understandable without knowing the implementation and accurately limits scope.

### Wrong action boundary

> Human action needed: The team will update the database migration and rerun CI.

This fails because it labels autonomous technical work as human action. The field must be `None`; the team step belongs in the executive summary.

## Common Pitfalls

1. **Scoring grammar instead of understanding.** Polished writing can remain unusable to a non-engineer.
2. **Assuming the recipient knows the thread.** Scheduled and forwarded messages must stand alone.
3. **Banning all technical terms.** Keep useful traceability in details; explain only what the summary needs.
4. **Rewriting with invented certainty.** Use placeholders or explicit uncertainty.
5. **Treating length as the only clarity metric.** A short acronym-filled message may be harder than a slightly longer plain-language explanation.
6. **Rewarding evidence volume.** Test counts and hashes do not replace product consequence.
7. **Reporting nits.** Only material comprehension, action, truth, safety, or trust issues belong in findings.
8. **Confusing user sophistication with engineering knowledge.** Explain software mechanisms without talking down to the reader.
9. **Promoting typography to a material finding.** Capitalization, punctuation, label styling, and synonym choices are not findings unless they materially distort severity, comprehension, action, safety, or trust.

## Verification Checklist

Before returning the evaluation:

- [ ] Exact candidate and intended audience are identified
- [ ] Default non-engineer audience was used when audience was unspecified
- [ ] All five one-read questions are answered or marked missing
- [ ] Hard-fail gates were evaluated before scoring
- [ ] Eight rubric dimensions add to exactly 100 available points
- [ ] Rubric points add to the reported score
- [ ] Verdict follows the 85-point threshold and hard gates
- [ ] Findings are material and cite exact message evidence
- [ ] Suggested rewrite preserves facts, uncertainty, severity, scope, and limitations
- [ ] No links, owners, dates, causes, numbers, or outcomes were invented
- [ ] Optional stylistic nits were omitted
