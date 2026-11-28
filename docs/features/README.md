# Feature specification inventory

Canonical location: `docs/features/<stable-feature-name>/SPEC.md`. Follow [AGENTS.md](../../AGENTS.md) for format, lifecycle, and traceability.

This baseline inventories capabilities found in the current source, tests, profile skills, and documented plans. Task management, the spec test runner and test-writing guidance have canonical feature specs. All other entries explicitly remain coverage gaps; this inventory does not claim complete specification coverage or identify every possible future feature. Add newly discovered capabilities and their specs as the product evolves.

`implemented` means source or a profile capability is present, not that it is shipped or has passed acceptance. `draft` distinguishes partial implementations or discussion from accepted release scope. Planned/parked entries reflect documented future intent, not scheduling or deployment authorization. Retired entries are excluded from active coverage. No planned feature should be implemented merely because it appears here.

## Product and infrastructure capabilities

| Feature | Status | Canonical spec | Current evidence / supporting material |
| --- | --- | --- | --- |
| Product dashboards | implemented | [SPEC.md](product-dashboards/SPEC.md) | #289; project-owned apps, independent API/CLI publication, private Dashboard frame and dev/evaluator skills; synthetic live-agent acceptance passed; live product/hosted Hub acceptance separate. |
| Contributor test suites | implemented | [SPEC.md](test-suites/SPEC.md) | Four dependency/effect buckets; default small + medium includes Python and real Hermes/aimock; Docker-first credential-path eval and independent CLI workflow verification; [contributor guide](../../TESTING.md). |
| App project roots | implemented | [SPEC.md](app-layout/SPEC.md) | #164; `apps/core`, `apps/cli` and `apps/com`, shared lockfile and compatible public entrypoints; executable app/CLI/COM/package case. |
| Running software identity | implemented candidate | [FR-086 / TC-001](communicator/SPEC.md#running-version-in-the-brand-234) | #253; shared CLI/UI `0.3.0+SHA`, with source identity retained in archives, npm packages, native installs and Docker builds; deployment checks pending. |
| Managed idle maintenance | implemented | [SPEC.md](managed-updates/SPEC.md) | Native224 / Hub182; atomic idle/quiesce and authenticated Native transport; source present; deployed container/Hub rollout pending. |
| NED API v1 | implemented (source candidate) | [SPEC.md](ned-api/SPEC.md) | One authenticated Core-owned `/api/v1` contract for CLI/COM; persistent injectable instance token, direct UI sign-in and authenticated streaming; [API](../api.md), [architecture](../architecture.md); release verification pending. |
| Web app previews | implemented candidate; rollout pending | [SPEC](web-app-previews/SPEC.md) | Singleton API/CLI, skill and isolated private HTTP/WS delivery (#157/Hub #81). Hosted rollout requires separate evidence. |
| Agent-isolated runtime home | implemented (uncommitted source candidate) | [SPEC.md](agent-runtime-home/SPEC.md) | #150; resolver, runtime stores and native subprocess isolation; lint/test:all passed; parent owns evaluation/review/delivery |
| Secret management | implemented (source candidate) | [SPEC.md](secret-management/SPEC.md) | Encrypted local vault, CLI/private Secrets dialog and native retrieval/entry cards (#152); [acceptance](secret-management/ACCEPTANCE.md); entry candidate verification and rollout tracked in #152 |
| Standalone NED container | implemented | [SPEC.md](standalone-container/SPEC.md) | Complete profile + CLI, real Hermes dashboard and COM; [acceptance](standalone-container/ACCEPTANCE.md); native AMD64/ARM64 image tests and [offline tool inventory](standalone-container/TOOLS.md) / TC-009; default/custom-port health and first-login landing regressions (#132/#133); live-model checks separate |
| AWS staging deployment | implemented | [SPEC.md](aws-staging-deployment/SPEC.md) | Immutable existing-host deployment, private snapshots, health gates and interrupted rollout recovery. |
| Local commit checks | implemented | [SPEC.md](commit-checks/SPEC.md) | `.githooks/pre-commit`; `npm run hooks:install`; lint and full local suites |
| Spec test runner | implemented | [SPEC.md](spec-test-runner/SPEC.md) | `scripts/run-spec-tests.mjs`; colocated cases and npm commit gate |
| Model setup | implemented source; release pending | [SPEC.md](model-setup/SPEC.md) | Provider prompt, private local authentication and scoped Hub account inheritance; hosted acceptance separate. |
| NED chat video review | implemented (live acceptance pending) | [SPEC.md](ned-chat-video-review/SPEC.md) | Desktop and mobile recordings, timestamped findings and Meta Muse comparison. |
| NED Communicator | draft (partial implementation) | [SPEC.md](communicator/SPEC.md) | Muse-inspired desktop rail/chat/project pane (TC-052), illustrated mobile organization with grouped identity, direct Project, contextual authorization and pinned composer (TC-053; provider TC-006/007); local Hermes chat, running version beside the logo (TC-001), project Dashboard beside Preview (TC-041), functional chat checks, weighted video review and chat palette (TC-044–046), mobile navigation and persisted emoji reactions (TC-048), attachment integration with a mocked model (TC-049), automatic reconnection (TC-050), live-following and mobile-keyboard geometry (TC-051), agent-selected project and chat-only left pane (TC-043), compact Base-aligned Goals & Tasks with outputs/attempt/session drill-down (TC-042, verification pending); legacy artifact journeys and live-provider/hosted acceptance remain separate gaps. |
| Isolated main-tracking NED staging | implemented | [SPEC.md](ned-staging/SPEC.md) | [#123](https://github.com/DataNavAI/no-ego-dev/issues/123); isolated owner profile/CLI and active 15-minute Codex heartbeat verified; [acceptance](ned-staging/ACCEPTANCE.md); actual main promotion/rollback/data retention PASS, live model login separate; scheduled execution not yet observed |
| Self-review development workflow | implemented (delivery checks pending) | [SPEC.md](development-workflow/SPEC.md) | #165; self-review/checks by default, separate review only on request; canonical skill evals and local staging readback; latest verified local container required after NED feature merges (#248, TC-005) |
| Default Hermes skills staging | implemented | [SPEC.md](hermes-skills-staging/SPEC.md) | Local canonical skills deployment; recovery gaps documented |
| Provider identity | implemented | [SPEC.md](provider-identity/SPEC.md) | Private connections and chat authorization for GitHub, AWS, and GoDaddy. |
| Task management | implemented | [SPEC.md](task-management/SPEC.md) | [CLI guide](../tasks.md); Core-backed CLI transport/delivery/attempts TC-013; agent workflow TC-012 |
| CLI installation and direct local launcher | implemented | Missing — coverage gap | `scripts/install.sh`, `src/launcher.js`; [install guide](../cli/INSTALL.md) |
| Hermes profile installation/distribution | implemented | Missing — coverage gap | `distribution.yaml`, `config.yaml`, `src/profile-archive.js`; root README |
| Hosted workspace access, chat/recovery and owner pairing | retired | [SPEC.md](daytona-workspace-access/SPEC.md) | [#127](https://github.com/DataNavAI/no-ego-dev/issues/127); transport/auth/state removed; removal covered by task-management TC-009 |
| Opt-in telemetry and deletion | implemented | Missing — coverage gap | `src/telemetry.js`; [privacy contract](../cli/TELEMETRY_PRIVACY.md) |
| Browser onboarding and connection flows | draft | Missing — coverage gap | `src/web/app.js`, `src/web/public/`; adapter-backed implementation, production wiring not established |
| Browser job execution, cancellation, and session isolation | draft | Missing — coverage gap | `src/web/app.js` and web lifecycle/security tests; production adapters not established |
| Local browser development preview | implemented | Missing — coverage gap | `src/web/dev-server.js`, `bin/ned-web.js`; local development adapter |
| Skill evaluation runner and reports | implemented | Missing — coverage gap | `eval_runner/`; `tests/test_eval_runner.py` |
| Manual release acceptance gate | implemented | [Spec](manual-release-acceptance/SPEC.md) | [manual test gate](../MANUAL_TEST_GATE.md); `scripts/verify-manual-test-result.mjs`; [QA runbook](../../QA.md) |
| NED Core orchestration and authenticated task HTTP APIs | implemented | [SPEC.md](core-orchestration/SPEC.md) | [API reference](../api.md), [design](core-orchestration/DESIGN.md); seven fast executable cases and separate [real-Hermes/model-stub acceptance](core-orchestration/HERMES-TESTING.md). New dashboard controls deferred. |
| Hosted compute onboarding and production release | planned (parked) | Missing — coverage gap | [browser scope](../browser/README.md); not current release authority |
| Authenticated external-command access broker | draft (discussion only) | Missing — coverage gap | [task decision source](https://chatgpt.com/share/6ac730b2-f424-83e8-a551-df48686e1b40); task metadata exists, credential broker does not |
| CLI workspace provisioning | retired | Retired — removal tracked in #112 | Removal commit `a808317`; issue [#112](https://github.com/DataNavAI/no-ego-dev/issues/112) |

## Profile skill capabilities

Each self-contained skill is an agent-facing capability that needs corresponding feature coverage. The inventory lists every current skill folder separately to avoid hiding coverage gaps; future specs may group related skills around a shared user outcome and link all members. Skill instruction files and their `EVAL.yaml` files remain supporting material, not replacements for `SPEC.md`. Presence does not establish successful evaluation.

| Capability / current skill | Status | Canonical spec | Evidence |
| --- | --- | --- | --- |
| `agent-identity-and-access` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/agent-identity-and-access/SKILL.md); [eval](../../skills/agent-identity-and-access/EVAL.yaml) |
| `android-app-dev` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/android-app-dev/SKILL.md); [eval](../../skills/android-app-dev/EVAL.yaml) |
| `architect` | implemented (profile instructions) | [spec](architecture-planning/SPEC.md) | [instructions](../../skills/architect/SKILL.md); [eval](../../skills/architect/EVAL.yaml) |
| `coder` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/coder/SKILL.md); [eval](../../skills/coder/EVAL.yaml) |
| `communication-evaluator` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/communication-evaluator/SKILL.md); [eval](../../skills/communication-evaluator/EVAL.yaml) |
| `delegation-reliability` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/delegation-reliability/SKILL.md); [eval](../../skills/delegation-reliability/EVAL.yaml) |
| `devops` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/devops/SKILL.md); [eval](../../skills/devops/EVAL.yaml) |
| `english-copywriter` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/english-copywriter/SKILL.md); [eval](../../skills/english-copywriter/EVAL.yaml) |
| `eval-creator` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/eval-creator/SKILL.md); [eval](../../skills/eval-creator/EVAL.yaml) |
| `identity-for-agent` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/identity-for-agent/SKILL.md); [eval](../../skills/identity-for-agent/EVAL.yaml) |
| `immutable-candidate-verification` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/immutable-candidate-verification/SKILL.md); [eval](../../skills/immutable-candidate-verification/EVAL.yaml) |
| `integrator` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/integrator/SKILL.md); [eval](../../skills/integrator/EVAL.yaml) |
| `issue-monitor` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/issue-monitor/SKILL.md); [eval](../../skills/issue-monitor/EVAL.yaml) |
| `marketer` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/marketer/SKILL.md); [eval](../../skills/marketer/EVAL.yaml) |
| `mvp-planning` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/mvp-planning/SKILL.md); [eval](../../skills/mvp-planning/EVAL.yaml) |
| `online-opportunity-seeker` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/online-opportunity-seeker/SKILL.md); [eval](../../skills/online-opportunity-seeker/EVAL.yaml) |
| `play-store-cli` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/play-store-cli/SKILL.md); [eval](../../skills/play-store-cli/EVAL.yaml) |
| `play-store-publisher` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/play-store-publisher/SKILL.md); [eval](../../skills/play-store-publisher/EVAL.yaml) |
| `prd-reviewer` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/prd-reviewer/SKILL.md); [eval](../../skills/prd-reviewer/EVAL.yaml) |
| `product-bootstrap` | implemented (profile instructions) | [spec](product-bootstrap/SPEC.md) | [instructions](../../skills/product-bootstrap/SKILL.md); [eval](../../skills/product-bootstrap/EVAL.yaml) |
| `product-communication` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/product-communication/SKILL.md); [eval](../../skills/product-communication/EVAL.yaml) |
| `product-manager` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/product-manager/SKILL.md); [eval](../../skills/product-manager/EVAL.yaml) |
| `profile-skill-harvester` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/profile-skill-harvester/SKILL.md); [eval](../../skills/profile-skill-harvester/EVAL.yaml) |
| `project-knowledge-organization` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/project-knowledge-organization/SKILL.md); [eval](../../skills/project-knowledge-organization/EVAL.yaml) |
| `project-setup` | implemented (skill candidate) | [spec](project-setup/SPEC.md) | [behavioral eval](../../skills/project-setup/EVAL.yaml) |
| `project-manager` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/project-manager/SKILL.md); [eval](../../skills/project-manager/EVAL.yaml) |
| `qa-audit` | implemented (behavioral acceptance verified) | [SPEC.md](qa-reporting/SPEC.md) | [instructions](../../skills/qa-audit/SKILL.md); [eval](../../skills/qa-audit/EVAL.yaml) |
| `qa` | implemented (audited reporting acceptance verified) | [SPEC.md](qa-reporting/SPEC.md) | [instructions](../../skills/qa/SKILL.md); [eval](../../skills/qa/EVAL.yaml) |
| `react-native-app-dev` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/react-native-app-dev/SKILL.md); [eval](../../skills/react-native-app-dev/EVAL.yaml) |
| `reviewable-artifacts` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/reviewable-artifacts/SKILL.md); [eval](../../skills/reviewable-artifacts/EVAL.yaml) |
| `seo-growth` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/seo-growth/SKILL.md); [eval](../../skills/seo-growth/EVAL.yaml) |
| `serialized-catalog-publication` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/serialized-catalog-publication/SKILL.md); [eval](../../skills/serialized-catalog-publication/EVAL.yaml) |
| `skill-creator` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/skill-creator/SKILL.md); [eval](../../skills/skill-creator/EVAL.yaml) |
| `spec-compliance-review` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/spec-compliance-review/SKILL.md); [eval](../../skills/spec-compliance-review/EVAL.yaml) |
| `subagent-driven-development` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/subagent-driven-development/SKILL.md); [eval](../../skills/subagent-driven-development/EVAL.yaml) |
| `test-writing` | implemented (behavioral acceptance verified) | [SPEC.md](test-writing/SPEC.md) | [instructions](../../skills/test-writing/SKILL.md); [eval](../../skills/test-writing/EVAL.yaml) |
| `technical-design-reviewer` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/technical-design-reviewer/SKILL.md); [eval](../../skills/technical-design-reviewer/EVAL.yaml) |
| `ui-designer` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/ui-designer/SKILL.md); [eval](../../skills/ui-designer/EVAL.yaml) |
| `ui-reviewer` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/ui-reviewer/SKILL.md); [eval](../../skills/ui-reviewer/EVAL.yaml) |
| `unblocker` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/unblocker/SKILL.md); [eval](../../skills/unblocker/EVAL.yaml) |
| `web-game-dev` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/web-game-dev/SKILL.md); [eval](../../skills/web-game-dev/EVAL.yaml) |
| `website-qa` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/website-qa/SKILL.md); [eval](../../skills/website-qa/EVAL.yaml) |
| `workflow-training` | implemented (profile instructions) | Missing — coverage gap | [instructions](../../skills/workflow-training/SKILL.md); [eval](../../skills/workflow-training/EVAL.yaml) |

## Reconciliation and backfill

- Backfill remaining specs from current code, tests, confirmed decisions, and the evidence above before changing the corresponding feature's observable behavior. Keep the same folder for later enhancements.
- Record each missing spec and missing test as a gap until addressed; an inventory entry or existing eval alone is not conformance.
- GitHub Issues governs development of NED; the task CLI governs user-project execution. No automatic tracker synchronization is implemented.
- Browser production scope remains parked; create a canonical spec before extending it. Obsolete CLI provisioning plans have been removed.
- Maintain stable FR/CUJ/TC IDs within each feature. When splitting or merging entries, preserve old ID references and update this inventory.

Desktop project-pane refinement (#269–272) is implemented under [communicator FR-097–101/CUJ-035/TC-055–056](communicator/SPEC.md#desktop-project-pane-refinement-269272); not a separate feature or claim of full manual coverage.

Desktop Settings follow-up #274 is superseded by #309: private Secrets/Connections dialogs replace the Settings workspace while preserving credential behavior. See communicator FR-114–116 / TC-063.

Mobile bottom navigation and Muse-inspired polish (#279) is implemented within [communicator FR-102–105/CUJ-036/TC-057–058](communicator/SPEC.md#muse-inspired-mobile-navigation-279); physical-device keyboard/rotation coverage remains unverified.

Communicator report-formatting guidance: [FR-108 / CUJ-038 / manual TC-060](communicator/SPEC.md#readable-agent-authored-reports-286); historical messages and renderer behavior unchanged.

Provider-specific failed authorization feedback: [FR-011–013 / TC-008](provider-identity/SPEC.md#provider-specific-failed-requests-297). GitHub enrollment wraps isolated gh CLI login on native and owner-authorized Hub instances; see [FR-014–017 / TC-009](provider-identity/SPEC.md#github-cli-connection-300).

Project navigation cleanup #309: [FR-114–116 / TC-063](communicator/SPEC.md#project-views-cleanup-309) replaces Settings and standalone Debug views; Dashboard is exclusively a registered project server. Secrets/Connections move to focused private Chat dialogs.
