# Agent runtime home acceptance

Local candidate evidence, 2026-11-02. This is not a live rollout receipt.

- Shared resolver/CLI/store tests and corrected first-use COM regression pass. The
  real CLI reproducer failed at HTTP503 before the first-use fix and now returns
  health200/projects200 with an empty inventory. Existing state is not imported.
- Full lint and npm run test:all passed on the implementation, including73 CLI
  regressions, all61 automated feature cases and Python208 passed/9 skipped.
  Skipped Windows-specific Python cases and the automated runner's21 manual
  NOT RUN cases are not passes. Current commit hooks repeat all required checks.
- Native local ARM container TC-003/004 passed image
  sha256:c35c9bfeedc0f0cc7701fd103ae72f9bf39a20eebd923306d0799d7c3a30db6e:
  authenticated services, complete profile/CLI, restart/recovery, retained data,
  3.35-second stop and owned-resource cleanup. No AWS/profile rollout/model call.
- A fresh independent agent executed new/changed task-management isolation
  behavior (runtime-home TC-004),83 checks, using disposable homes/projects and
  internally generated secret bytes. Different homes did not synchronize/migrate;
  explicit task DB sharing did not expose another vault, credential or telemetry
  state. Known-store resume reused the original record; secret values stayed out
  of captured argv/output/task records/logs. Unchanged broad skill scenarios were
  not all rerun; this is not a blanket full EVAL pass.
- Real installed Hermes loader/registry discovered the packaged plugin in a
  disposable profile. Actual get_hermes_home context override beat stale ambient
  HERMES_HOME and inherited Codex markers; the CLI/private Node installation stayed
  in OS HOME, and the secret grant resolved in the active profile vault only.
- Independent pre-review found AH-001: older COM documentation/test labels still
  promised no CLI initialization. Those contracts now distinguish CLI-authorized
  missing empty DB creation from direct raw-server/read-only noncreation. The
  first-use behavior stays, existing DB records remain preserved, and raw missing/
  corrupt/unsupported DB read tests are retained. Exact-candidate re-review pending.

Windows resolver CI is added but no local Windows/Node20/22 execution is claimed.
GitHub issue150 tracks work; project1 assignment/readback is blocked by missing
project scope. No duplicate local NED tracker record was created. Existing shared
state remains intact; automatic migration, per-session isolation and same-user
adversarial sandboxing are outside scope. Exact review, hosted CI, main merge and
default-local CLI/plugin/skills/COM rollout remain separate required gates.

Independent pre-review report SHA256: `635fe8205a8827210b6123adf672a720154f52a8a6a0dbaac7d20acf39679c2e`. Detailed runtime evidence remains outside source control.
