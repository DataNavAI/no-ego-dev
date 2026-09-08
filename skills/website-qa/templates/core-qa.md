# Core QA: <product>

Recommended canonical path: `.projects/<project>/qa/core-qa.md`

> Adapt this template to the product and any stronger existing convention. Keep the information that makes coverage, execution, and evidence useful; the headings and layout are suggestions.

## Product and build scope

- Product/contract:
- Canonical QA owner:
- Current exact build/release candidate:
- Environments and URLs:
- Supported browsers and versions:
- Supported viewports/devices:
- Supported interfaces (responsive web/PWA/embed/admin/etc.):
- Locales, feature flags, accounts, and data assumptions:
- Scheduled full-QA cadence:
- Next full-QA due or trigger:

## CUJ index

| CUJ ID | Descriptive name | Persona / starting state | Value and end state | Lifecycle | Test cases |
|---|---|---|---|---|---|
| CUJ-1 | <journey name> | <persona/state> | <user value and observable end state> | Active | TC-1.1 |

> Preserve IDs and gaps. Retire or supersede obsolete entries with rationale rather than renumbering or reusing IDs.

## Critical user journeys

### CUJ-1 — <descriptive journey name>

- **Lifecycle:** Active / Retired / Superseded by CUJ-N
- **Persona / starting state:**
- **Value and end state:**
- **Contract/source links:**
- **Risks and dependencies:**

#### TC-1.1 — <executable case name>

- **Lifecycle:** Active / Retired / Superseded by TC-N.N
- **Criticality:** P0 / P1 / P2
- **Criticality rationale:**
- **Applicability:** environments, browsers, viewports, interfaces, flags, roles
- **Preconditions and test data:**
- **Reset/cleanup:**
- **Actions:**
  1. <action>
  2. <action>
- **Expected results:**
  1. <observable checkpoint aligned to action>
  2. <observable end state>
- **Evidence needed:** screenshots/video plus URL, timestamp, browser, viewport, and exact build; console/network/accessibility evidence where useful
- **Linked bugs/incidents:**
- **Latest outcome:** PASS / FAIL / BLOCKED / NOT RUN

## Coverage overview

| Case ID | CUJ | Criticality | Browser / viewport / interface | Environment | Latest exact build | Latest outcome | Evidence |
|---|---|---|---|---|---|---|---|
| TC-1.1 | CUJ-1 | P0 | <supported combination> | <environment> | <immutable ID> | NOT RUN | <link> |

## Release QA decision and scope

- **Release/exact build:**
- **Environment:**
- **Run type:** SMOKE / FOCUSED REGRESSION / FULL QA
- **Why full QA was or was not run:**
- **Included case IDs:**
- **Excluded/non-applicable case IDs and reasons:**
- **Supported matrix selected:**
- **Smoke outcome guidance:** FAIL when an applicable P0 was executed and failed, even if another is blocked; otherwise BLOCKED when an applicable active P0 is blocked, unrunnable, or not run; PASS only when every applicable active P0 passed. With no applicable active P0, report BLOCKED and a coverage gap rather than PASS.
- **Residual risk/acceptance owner:**
- **Next full-QA due or trigger:**

## Recent run evidence

| Run date/time | Run type | Exact build | Environment | Browser / viewport / interface | Cases | Outcome | Report/evidence |
|---|---|---|---|---|---|---|---|
| <ISO timestamp> | <type> | <immutable ID> | <environment> | <combination> | <IDs> | PASS / FAIL / BLOCKED | <links> |

## Known gaps

| Gap | Affected CUJ/cases | Risk | Reason | Owner/follow-up | Due/trigger |
|---|---|---|---|---|---|
| <gap> | <IDs> | <risk> | <reason> | <owner/action> | <date/event> |

## Maintenance history

| Date | Exact change/source | CUJs/cases affected | Action and rationale | Author |
|---|---|---|---|---|
| <date> | <PRD/PR/bug/incident/analytics/feedback/release> | <IDs> | <added/updated/retired/superseded/reprioritized/deduplicated> | <name> |
