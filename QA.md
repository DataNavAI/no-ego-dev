# QA Runbook

## Code tests and skill evaluation

Run `npm run lint`, `npm test`, and `python -m pytest` for NED runtime, packaging and evaluation-engine changes. Code tests do not evaluate NED skills, their wording, historical versions, or bundled helpers. Evaluate skills with their EVAL.yaml and synthetic evaldata scenarios, recording actual agent outcomes and material failures separately. The spec runner lists declared manual skill cases as NOT RUN; a green code suite does not imply they passed.

Read [test-writing](skills/test-writing/SKILL.md) before adding or pruning tests. Prefer one strong contract check per distinct risk, retaining unique assertions when consolidating. The distribution packaging contract is covered by task-management TC-011; launcher behavior is covered by process tests rather than source phrase checks.

## Local release acceptance

Use a clean checkout of the exact candidate and isolated test-owned HOME, project directories, SQLite database and package prefix outside the repository. Record candidate SHA, Node/Python versions and actual command results. Run `npm ci`, lint, Node/spec and Python suites, and `npm audit --omit=dev` without suppressing findings.

1. Pack and install the exact candidate into the isolated prefix; run the installed `ned --version` and `ned --help`.
2. Initialize a synthetic project, create a goal and child task, claim and complete the task. Restart the CLI and verify persisted record/history. A second synthetic project sharing the database must not see the first project's work.
3. Run each retired hosted-workspace command and verify exit 2, local-task usage and no credential prompt/network operation. Preserve synthetic legacy state/key sentinels byte-for-byte. Do not read or delete actual user state, credentials or remote resources.
4. Check telemetry consent through a synthetic local fixture. Never enable real telemetry merely to obtain acceptance evidence.
5. Verify the packed profile/distribution excludes runtime databases, secrets, sessions, caches and test fixtures. Test local Communicator/staging through their canonical specs; record manual/browser evidence separately from automated suites.
6. For installer changes, run the exact checkout installer in an isolated HOME and verify native SQLite task execution via its private runtime/launcher. Simulated installer tests establish platform branching, integrity, interruption and rollback contracts; they do not prove native installation on every platform.

Remove only test-owned artifacts after recording redacted evidence. A missing dependency, failing check or unfinished manual case is a blocker or coverage gap, never a pass. Follow [the manual release gate](docs/MANUAL_TEST_GATE.md) for exact-candidate evidence and evidence-only follow-up commits.

## Retired hosted QA

The former live hosted-workspace/Telegram QA procedure is discontinued with [issue #127](https://github.com/DataNavAI/no-ego-dev/issues/127). Do not run removed commands to clean up historical resources. This retirement has no provider side effects and requires no live credentials.
