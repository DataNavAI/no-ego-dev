# MVP Plan: <project>

Status: DRAFT | READY FOR USER APPROVAL | APPROVED | BLOCKED
Owner:
Last updated:
Related request/research:
Related PRD: <existing link or planned durable path + owner>
Related CUJ artifact: <existing link or planned durable path + owner>
Related UI brief: <existing link or planned durable path + owner>
Related tech spec: <existing link or planned durable path + owner>
Related task plan: <existing link or planned durable path + owner>
Related QA plan: <existing link or planned durable path + owner>

## 1. Key User Problem

```text
For <specific target user in context>, the MVP solves <single painful problem> so they can <valuable outcome>.
```

- Evidence:
- Assumptions to validate:
- Why now:
- Non-users:
- Non-problems:

## 2. MVP Scope Contract

- Product stage: MVP
- Primary user:
- Supported interfaces:
- Planned/intentionally unsupported interfaces:
- Real deployment/release target:
- Core value moment:

### Selected Critical User Journeys

| Priority | CUJ ID and name | User/context | Need | Value moment | Success signal |
|---|---|---|---|---|---|
| Primary | CUJ-01 | | | | |
| Supporting | CUJ-02, if necessary | | | | |
| Supporting | CUJ-03, if necessary | | | | |

### CUJ Details

#### CUJ-01 — <name>

- Entry:
- Shortest happy path:
  1.
  2.
- User-visible action count:
- Essential failures/recovery:
- Acceptance criteria:
- Success signal:

## 3. Scope Decisions

### Must Ship

| Capability | Required CUJ/step | What breaks without it | Simplest implementation |
|---|---|---|---|
| | | | |

### Manual/Internal for MVP

| Operation | Owner | User impact | Safety/reliability guardrail | Automation trigger |
|---|---|---|---|---|
| | | | | |

### Not in MVP / Parking Lot

| Idea | Cut rationale | Evidence needed to reconsider |
|---|---|---|
| | | |

## 4. MVP UX

### Shortest Path Summary

- Entry:
- Value moment:
- Total user-visible actions:
- Decisions/fields removed:
- Defaults used:
- Advanced choices deferred:

### Screen and State Map

| Screen/state | CUJ and step | Primary job/action | Why required | Simpler alternative considered | Keep/cut |
|---|---|---|---|---|---|
| | | | | | |

### Required UX Guardrails

- Accessibility:
- Loading/empty/error/success:
- Permission/auth/privacy/trust:
- Recovery/offline/network:
- Responsive/device behavior:
- Minimum-text copy decisions:

### Design Artifacts

- UI guideline:
- UI brief/mockups:
- UI review:
- Copy review:

## 5. Simplest Serviceable Architecture

- Existing stack reused:
- Essential components/data:
- Persistence/integrity:
- Security/privacy:
- Monitoring/logging:
- Support/feedback:
- Backup/recovery/rollback:
- Explicitly rejected complexity:
- Tech spec:

## 6. CUJ QA and Test Traceability

| CUJ | Acceptance criteria | Automated coverage | Manual/release QA | Supported interfaces | Evidence |
|---|---|---|---|---|---|
| CUJ-01 | | | | | |

### Automation Priority

1. Primary CUJ happy path:
2. Critical data/security/payment/auth/recovery failures:
3. Supporting CUJs:
4. High-risk integrations:

### Manual Smoke Gate

- Environment/release candidate:
- Test account/data:
- Reset/cleanup:
- Zero-context steps:
- Expected checkpoints:
- Evidence:
- PASS/FAIL/BLOCKED owner:

### Launch Blockers

- Missing/stale/failed/blocked CUJ coverage:
- Critical/high defects:
- Unsupported or undecided interfaces:
- Deployment/monitoring/rollback/support blockers:
- Missing/stale/failed metric-collection regression evidence:

### Release-Blocking Metric-Collection Regression Task

- Exact production service and metric contract:
- Emission assertion:
- Transport/retry assertion:
- Collector/ingestion assertion:
- Storage and aggregation/query assertion:
- Destination/dashboard/reporting readback assertion:
- Missing/malformed-signal self-check or alert assertion:
- Duplicate-signal assertion:
- Delayed-signal assertion:
- Wrong-attribution assertion:
- Deterministic CI harness:
- Production-like staging readback gate:
- Owner, command, evidence, and release-blocking condition:

## 7. Vertical Delivery Plan

| Order | Vertical slice | CUJ value delivered | Owner | Tests/evidence | Dependencies |
|---|---|---|---|---|---|
| 1 | | | | | |

- Project tasks:
- Architecture plan:
- QA plan:
- Release plan:

## 8. Measurement and Learning

### Measurement posture
- Decision (`not required yet` / `minimal measurement` / `growing-product controls`):
- Product-contract or learning-decision reason:
- Smallest evidence needed for the next release decision:

This posture governs optional product analytics breadth only. It never waives the mandatory operational metric-collection regression task for a production service.

### Conditional structured product health (complete only when required)
- DAU and qualifying activity:
- Daily new users and activation/cohort event:
- Daily newly churned users and inactivity window:
- D1/D7 new-user cohort retention (W1/W4 when meaningful):
- Identity/anonymous merge, timezone, cohort denominator, late-event, incomplete-window, reactivation, deletion, and bot/internal-user rules:
- Internal dashboard/report, owner, cadence, and verification:

### Secondary diagnostics
- Primary CUJ completion and time-to-value/drop-off:
- Funnel/acquisition/conversion/revenue/errors/feedback signals needed to explain primary-metric movement:
- Feedback path and owner:
- Decision threshold for iteration:

## 9. Scope Change Control

Any new feature, screen, platform, integration, or service must state:

1. Selected CUJ it enables or protects.
2. Exact step/failure/trust requirement that breaks without it.
3. Simpler alternative considered.
4. User approval when it changes the MVP scope contract.

## 10. Approval

- Product-manager review:
- UI simplicity review:
- Architect simplicity review:
- QA/test coverage review:
- User decision:
- Open blockers:
