# Staff workflow discovery for a human-handoff MVP

Use this only when staff receiving, following up on, and converting inbound work materially gates a selected MVP critical user journey. The first staff session is not broad system discovery and does not belong in a self-service MVP by default. Its purpose is to obtain the minimum operating decisions needed for a safe, measurable pilot.

## First-session format: 60–75 minutes

Use a timed, decision-gated agenda:

1. **Routing (0–10 min):** named queue and owner, fallback, operating-hours behavior, failed-alert escalation, and emergency or out-of-scope boundary.
2. **Minimum capture and contact policy (10–25 min):** required fields, prohibited data, permission for phone/SMS/email or other channels separately from channel preference, consent evidence, opt-out/suppression authority, and fallback when no permitted channel remains.
3. **Work lifecycle (25–40 min):** one authoritative system per state, state-update owner, required evidence, duplicate/reconciliation rule, dashboard role (queue, mirror, or temporary source), and next action/due time/attempt count/overdue escalation for active items.
4. **Current high-value inbound sources (40–55 min):** cover the highest-volume owned source, highest-volume social/referral source, and at most two other material sources. For each, record the arrival system, first-response owner, after-hours path, escalation, duplicate rule, and attribution.
5. **Safe pilot (55–70 min):** environment, synthetic test identity, controlled alert queue, outbound-message containment, approval authority, pass/fail evidence, rollback, cleanup, and reporting exclusion. A financial or otherwise irreversible transaction test requires an approved sandbox or controlled test action plus a documented reversal procedure.
6. **Close (70–75 min):** log every unresolved decision with its owner, evidence required, and due date.

## State-authority table

Require a table for the workflow's equivalents of `received`, `assigned`, `contacted`, `awaiting_requester`, `follow_up_due`, `qualified`, `conversion_started`, `converted`, `closed_lost`, and `reassigned`.

For each state capture the authoritative system, update owner, evidence/reference, dashboard role, and reconciliation/duplicate behavior. This prevents a new MVP dashboard from becoming an unmanaged competing inbox.

## Active-item controls

An active item is not managed merely because it is marked `contacted`. Require an accountable owner, next action, due date/time, attempt number, last outreach channel/result, overdue trigger, reassignment/escalation owner, and closure reason.

## Measurement discipline

For each conversion rate, record the reporting period, denominator, report owner, and availability status (`available`, `manually reconcilable`, or `deferred`). Define each meaningful lifecycle outcome separately. Never infer a completed or paid outcome from a click, message sent, or conversion-start event.

## Question-bank discipline

Keep one policy authority for contact consent, one for lifecycle/measurement, one for the conversion or transaction workflow, and one for pilot go/no-go. Put detailed vendor/API, webhook, full-source inventory, and historical-analytics questions into prework or follow-up unless they block the pilot.

## When only 30 minutes are available

Do not squeeze the full question bank into the meeting. Run a **20-minute decision core** and reserve ten minutes for introductions, concrete examples, and unresolved-owner assignment. Decide only:

1. The highest-volume inbound paths and their after-hours owner/fallback.
2. Routing by applicable location/service/team, alert channel, and the operating-hours map.
3. One redacted inbound-to-outcome walkthrough, including the intended end state, authoritative completion evidence, and confirmation/follow-up owner.
4. Follow-up for self-service starts that still require staff intervention.
5. Owner, next action/channel/due time, closure/reactivation rule, and contact-policy owner for active but unconverted work.
6. Owner and due date for redacted evidence and a non-production, contained pilot plan.

Where routing varies, distinguish office or operating hours, response coverage, service availability, holiday exceptions, and the exact after-hours escalation start. Generic “business hours” are insufficient.

## Safety and authorization boundary

Ask staff to describe the current conversion and transaction flow; never infer it. Never accept, collect, or store raw authentication, financial, or other regulated credentials. A discovery session cannot authorize sensitive-data access, direct commitments or transactions, automated outreach, or a production test. Obtain the applicable owner, privacy, security, legal, financial, and operational approvals first.