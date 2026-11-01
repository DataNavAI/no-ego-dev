# Secret management bounded-port acceptance

Date: 2026-10-31 PDT. Isolated worktree: `/Users/moonk/.codex/worktrees/secret-sharing`, branch `codex/secret-sharing`, based on `e3601371773272b3baf65292361d4c7583acaf59`. This is an uncommitted source candidate, not an approved or deployed release. Evidence from the original dirty workspace is not acceptance for this port.

## Scope and design

Ported encrypted local vault/CLI, protected COM Settings, native `ned` plugin and expiring retrieval cards. Existing COM JSON chat completion/polling, generic tool details, Preview and mobile `#left-toggle` remain intact. No SSE, drawer, uploads, public-tunnel CLI or unrelated advanced COM work was copied. Plugin packaging is included; the profile template enables the packaged plugin/toolset. Existing live profiles still require explicit activation and reload during rollout.

Design references read before UI edits: `design/UI.md`, communicator `design/design-system.md` and `design/ui-brief.md`, and `.projects/no-ego-dev/design/ui-guidelines.md`. The secret design was adjusted to main's mobile workspace toggle rather than the original workspace's drawer.

## Executed automated evidence

Environment: macOS; Node v25.6.1; Python 3.14.3 from `/tmp/ned-tool-venv`, pytest 9.2.0, ruff 0.17.3, ESLint 10.12.0. PATH was prepended with that Python environment and NED_TEST_PYTHON set to its absolute Python executable. Playwright is the only added dev dependency, pinned at 1.64.1.

- `npm ci`: exit 0. npm reported five moderate dependency advisories; no audit fixes or unrelated dependency upgrades were applied.
- `npm run hooks:install`: exit 0. No commit was attempted in this worktree.
- `npx playwright install chromium`: exit 0; Chromium was available for real headless browser execution.
- `npm run lint`: exit 0, including Python plugin ruff and `npm run check`; no analyzer rules weakened.
- `npm run test:spec -- --feature secret-management`: exit 0. TC-001, TC-002, TC-003, TC-005 and TC-006 executed fully; TC-004 reported NOT RUN as manual.
- `npm run test:all`: exit 0. All 73 CLI regressions and all selected automated repository spec cases passed; Python reported 208 passed, 9 skipped. Skips and manual cases are not passes.
- Existing task-management TC-011 verifies npm/profile archives include `plugins/ned/plugin.yaml` and `plugins/ned/__init__.py` while excluding runtime data and spec fixtures. No duplicate pack suite was introduced.
- `git diff --check`: exit 0.
- `npm audit --omit=dev --json`: exit 0, zero production vulnerabilities. The install-time moderate advisories concern the development dependency tree and were not changed in this bounded port.

TC-001 proves CLI persistence, exact bytes, private exports, replacement/deletion, independent homes, concurrent writes, corruption/lost/wrong-key and unsafe-permission/link rejection. TC-002 proves real HTTP guards and `secretsEnabled:false` denial. TC-005 exercises synthetic native registration through Python → trusted Node CLI → vault, expiry/revocation and schema projection. Its deployment regression resolves a synthetic PATH `ned` symlink to the real checkout `bin/ned.js` with synthetic HOME, no NED_CLI_PATH and explicit NED_NODE_PATH; a missing explicit CLI override still fails closed. Node is invoked using argv, never a shell.

TC-003 and TC-006 use their own real-COM/synthetic-JSON-gateway fixture, not the original dirty communicator browser fixture. They prove Settings save/reveal/hide/replace/delete/cancel, preserved Chat draft, 30-second Settings reveal clearing, no browser persistence, 320px overflow check, desktop/mobile access via the existing toggle, delayed-reveal suppression, native card reveal/hide/history reload and rotation failure. Generic tool UI regressions in communicator TC-013 also pass. The card observer watches only hidden attributes and direct transcript child changes, not its own descendant mutations.

Synthetic browser captures were produced outside the repository:

- `/tmp/ned-secrets-desktop.png`
- `/tmp/ned-secrets-mobile.png`
- `/tmp/ned-secret-card-desktop.png`
- `/tmp/ned-secret-card-mobile.png`

These are generated artifacts, not independent visual acceptance. Parent visually inspected the Settings mobile and card desktop captures: layout is readable and controls fit without overlap. This does not establish contrast measurements or screen-reader acceptance.

## Pending integration and acceptance gates

Independent review, TC-004 behavioral skill evaluation (including native sharing), real Hermes native-loader/model-selected use, visual inspection and applicable manual acceptance remain pending. No code-based skill tests were added. OS backgrounding, hard power-loss durability, forced interruption during a vault transaction and cross-machine backup restoration are not claimed verified. Local Node 20/22 and Linux/macOS CI execution remain separate from this local Node 25 run; workflow changes install Chromium with dependencies on Linux and retain macos-15.

No commit, push, merge, installer deployment, skills deployment, plugin activation or live process restart was performed. The original `/Volumes/Agent/Codex/no-ego-dev` workspace was read only. Parent owns durable task updates, review, merge and verified default-local deployment. Keep the overall feature/task open until those gates pass. Existing profiles must explicitly enable the packaged plugin/toolset during authorized integration; archive inclusion alone does not activate it.

## Independent agent execution and review correction

A fresh independent Hermes reviewer executed TC-004 using generated synthetic
bytes, private subprocess stdin and a disposable HOME/project/vault. Private-file
consumption, missing-key Settings recovery, safe assistant handoff and absence of
bytes in captured argv/output/task records passed. Actual packaged native plugin
was discovered through Hermes's real plugin manager and registry; dispatch,
SessionDB persistence, API adapter projection and real COM reveal/hide passed.
No default profile mutation or model/provider request occurred in that evaluation.
This supersedes the earlier pending TC-004/native-loader statements only.

Round1 found F1: serialized tool_calls and embedded tool_use content could retain
native export paths in browser history. A real HTTP regression first failed on
the expected path-disclosure assertion, then passed after backend sanitization of
all supported native call/block forms. Ordinary prose, non-native tools and
structured data remain. Focused TC-005 and communicator TC-013:13 passed,0 skipped.
Exact corrected-candidate review remains required; no release approval is inferred.

Independent report SHA-256: `9fccce26bd5dda738bc5681e3e756a1d310f589fc8eeaed4e2f30392b80da44b`. Runtime evidence stays outside the repository.

Round2 exact review approved code candidate49875ea after verifying F1 and rerunning
the actual TC-004/native-loader flow. Provider container acceptance then exposed a
packaging omission: distribution.yaml owns plugins/ned, but the positive Docker
context and Dockerfile did not copy it. Fresh initialization correctly failed
closed for the missing component on both architectures. The container context
and explicit COPY now include only plugins/ned; the container workflow watches
that package. Existing native TC-003/004 assert every owned component is seeded
and exercise startup/recreation, so their real image runs own this regression.
This packaging correction requires a new exact review and provider GREEN.

The hosted Linux/macOS TC-005 fallback fixture also exposed a harness dependency:
its isolated PATH hid python3 when NED_TEST_PYTHON was unset. The fixture now
resolves the interpreter before isolating child PATH. The exact no-override
command reproduced ENOENT before the correction and passes after it, retaining
the absent standard installation/CLI override and PATH-only NED resolution.
Neither this harness issue nor the omitted Docker copy was caught by the earlier
local-env review. They are retained as review escapes with provider evidence;
approval of49875ea does not approve these correction bytes.

Corrected Docker packaging was exercised on the existing local Linux ARM daemon
using only uniquely named disposable test resources: `python
docs/features/standalone-container/tests/container_acceptance.py --context
colima-ned-staging --expected-architecture arm64` exited0. Native TC-003/004 passed
on image sha256:2c459e081f772c73be0355b5bceef7eb7a66037b3f059961b37b0a10b648967c
at2026-10-31T19:42:23Z. Authenticated services, every owned profile component,
service replacement,3.36-second stop, persistence, recreation and negative startup
passed. Test-owned containers/volumes/credentials were removed. This was acceptance
on disposable resources, not rollout of an existing staging profile or AWS.
Hosted AMD64/ARM64 correction checks remain required.
