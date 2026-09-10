# Human-handoff workflow discovery

Use this when an MVP depends on staff receiving, following up, and converting inbound work. The first session obtains only the operating decisions needed for a safe, measurable pilot; it does not authorize broad automation.

## Decision-gated session

For a 60–75 minute session:

1. **Routing:** named queue/owner, fallback, operating-hours behavior, failed-alert escalation, and emergency/out-of-scope boundary.
2. **Minimum capture/contact policy:** required fields, prohibited data, permission separately for each channel, consent evidence, opt-out/suppression owner, and fallback when no channel is permitted.
3. **Lifecycle authority:** one authoritative system and update owner for each state, required evidence, duplicate/reconciliation rule, dashboard role, next action/due time/attempt count, and overdue escalation.
4. **High-value inbound sources:** cover the highest-volume owned and social/referral sources; record arrival system, first-response owner, after-hours path, duplicate rule, and attribution.
5. **Contained pilot:** environment, synthetic identity, controlled queue, outbound-message containment, approval authority, pass/fail evidence, rollback, cleanup, and reporting exclusion.
6. **Close:** unresolved decisions each receive an owner, required evidence, and due date.

When only 30 minutes are available, run a 20-minute decision core and reserve ten minutes for examples and unresolved-owner assignment. Do not compress the entire question bank. The core decides major inbound paths, location/service routing, channel and hours, one redacted end-to-end walkthrough, follow-up policy, and ownership of evidence plus a non-production pilot.

## State and warm-item controls

Create a state-authority table covering the workflow's equivalent of received, assigned, contacted, awaiting requester, follow-up due, qualified, conversion started, converted, closed/lost, and reassigned. For each state record authoritative system, update owner, evidence, dashboard role, and duplicate/reconciliation behavior.

A warm item is not managed merely because it is marked contacted. Require accountable owner, next action, due time, attempt number, last channel/result, overdue trigger, reassignment/escalation owner, and closure reason.

## Measurement

For each conversion rate, define reporting period, denominator, report owner, and whether data is available, manually reconcilable, or deferred. Distinguish each meaningful funnel state; never infer a completed or paid outcome from a click or started event.

## Safety and ownership

- Keep one policy authority for contact consent, one for lifecycle/measurement, one for conversion/payment workflow, and one for pilot go/no-go.
- Detailed vendor/API, webhook, full-source inventory, and historical-analytics questions belong in prework/follow-up unless they block the pilot.
- Distinguish operating hours, response coverage, service availability, holiday exceptions, and the exact after-hours escalation start where routing varies.
- Ask staff to describe the existing conversion/payment flow; never infer it.
- Never accept or store raw payment credentials. Payment tests require an approved sandbox or controlled transaction plus cancellation/refund procedure.
- A discovery session alone never authorizes sensitive-data access, direct booking/payment, automated outreach, or a production test. Obtain the applicable owner, privacy, security, legal, and operational approvals first.
