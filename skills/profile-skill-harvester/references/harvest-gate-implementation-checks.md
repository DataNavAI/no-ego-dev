# Harvest Gate Implementation Checks

Use these checks when implementing or reviewing the automation around a profile-skill harvest. They capture failure modes that are easy to miss even when the high-level workflow is correct.

## 1. Make drift checks shell-fatal

A source-freeze comparison is a publication gate, not an informational printout. Run the gate under `set -e` or explicitly stop on nonzero status before any commit, amend, push, or state update.

Bad pattern:

```bash
python3 compare_inventory.py
git commit --amend --no-edit
```

If the shell is not fail-fast, the amend can still run after the comparison exits nonzero.

Safer pattern:

```bash
set -euo pipefail
python3 compare_inventory.py
git commit --amend --no-edit
```

Also make the comparison script's exit semantics unambiguous:

```python
if changed:
    print(f"UNEXPECTED_DRIFT={changed}")
    raise SystemExit(1)
print("UNEXPECTED_DRIFT=[]")
```

Do not use clever boolean exit expressions when a later shell step depends on the result. After any expected live-source drift is incorporated, inventory again and compare against the immediately preceding observation. Restart affected validation and exact-SHA review.

## 2. Review the intended checkout, not a profile-configured cwd

A spawned Hermes reviewer may honor its profile's configured terminal cwd instead of the subprocess `workdir`. An exact-SHA reviewer can therefore inspect the dirty canonical checkout while believing it is in the isolated worktree.

Give the reviewer:

- the absolute isolated-worktree path;
- the exact candidate SHA;
- an instruction that every Git command use `git -C ABSOLUTE_WORKTREE ...`;
- an instruction that every file read use an absolute path under that worktree;
- a precondition to stop unless `HEAD` equals the requested SHA and `git status --porcelain` is empty.

Treat a verdict as invalid if its reported HEAD, cleanliness, or checkout path does not match. Dispatch a fresh review rather than interpreting findings from the wrong checkout as exact-SHA approval.

## 3. Validate eval context delivery, not only schema

Run this preflight against the eval code from the isolated worktree created from `origin/<default>`, never against the user's existing checkout or an installed/importable copy. A dirty or ahead local checkout may contain an unmerged harness fix and produce a false pass. Pin module provenance before trusting the sentinel:

```bash
PYTHONPATH="$WORKTREE" python3 -c \
  'import pathlib, eval_runner.core as c; p=pathlib.Path(c.__file__).resolve(); w=pathlib.Path("'$WORKTREE'").resolve(); assert p.is_relative_to(w), (p, w); print(p)'
```

Use the same explicit `PYTHONPATH` for the production runner invocation. Record the worktree HEAD alongside the sentinel result so the evidence is attributable to the remote-default generation being harvested.

For every changed `EVAL.yaml`, verify all three layers:

1. the production loader accepts the schema;
2. every declared fixture exists and stays inside its package;
3. fixture text reaches both the evaluated agent and the judge invocation.

A test that checks only a generated `prompt.txt` is insufficient: the runtime commands may still use the original prompt without the fixture. Put a unique token in the fixture body, capture the fake Hermes arguments for both invocations, classify agent versus judge by prompt content rather than assuming call order, and assert that the token—not merely the fixture path—appears in both. Keep the sentinel and recorder outside every Git repository and remove them during exact-run cleanup.

The isolated eval environment intentionally drops arbitrary controller environment variables. Do not make the fake recorder depend on a custom variable such as `PREFLIGHT_RECORD`; that can turn a healthy runner into a false infrastructure failure before any argument is captured. Give the disposable recorder its non-repository output path as a generated literal or explicit command argument, then verify the record contains exactly one candidate and one judge invocation.

Cross-platform fixture tests must not use POSIX-only setup syntax merely to create their test workspace. A test for isolated `HOME`/`~/workspace` expansion that runs on Windows must create the directory through a temporary Python helper using `Path(os.environ["HOME"], "workspace").mkdir(...)`, or an equivalently portable argv command. Commands such as `mkdir -p "$HOME/workspace"` test the host shell rather than the runner contract and fail under `cmd.exe` even when production path expansion is correct. Keep a separate assertion that the evaluated process actually receives the isolated working directory.

If `parameters.fixture` is defined as a relative package path, reject:

- absolute paths, even if they resolve inside the package;
- `..` traversal or symlink escape outside the package;
- missing files;
- empty values;
- non-string values.

Use an explicit `Path(value).is_absolute()` check before resolving against the package root, then verify the resolved file remains within that root.

### Keep fixture and candidate text literal across shell boundaries

Fixture delivery expands the prompt's attack surface when the runner invokes Hermes through `shell=True`. `json.dumps(prompt)` is JSON encoding, **not shell escaping**: the resulting double-quoted shell argument still permits command substitution such as `$(...)` and backticks. This applies to both the evaluated-agent command and the judge command, whose prompt also contains candidate output.

Prefer an argv list with `shell=False`. If the runner must preserve a configured command prefix and use `shell=True`, wrap every complete dynamic prompt argument with `shlex.quote(...)` immediately before command construction.

Add an adversarial regression using a fixture token such as `literal $(touch <outside-temp-marker>)` and, when judge output is interpolated, equivalent candidate-output syntax. Capture both runtime arguments and assert:

1. the exact metacharacter-containing text reaches the intended invocation unchanged;
2. no marker file is created;
3. agent and judge both complete normally.

A passing fixture-delivery sentinel without this literal-shell check can prove data flow while still hiding command execution.

## 4. Prove browser evidence semantically, not by file existence

When a harvested skill or eval claims browser interaction, responsive QA, or screenshot evidence, an `expected_artifacts` existence check is only a packaging gate. It does not prove the browser ran or that the image represents the requested viewport.

Require all applicable layers:

1. deterministic browser automation loads the isolated candidate workspace, performs the primary interaction, and asserts the rendered result;
2. screenshots decode as their declared format, are non-empty, and have the required pixel dimensions or viewport metadata;
3. verification output identifies the exercised route, viewport, interaction, and observed result;
4. artifact digests or metadata plus browser-verification output reach the judge—not only agent prose claiming the checks ran;
5. adversarial focused tests prove a zero-byte/fake image and placeholder HTML/JavaScript cannot pass.

Keep textual source checks as supplemental structure assertions. Regex matches for element IDs, event names, or media queries do not substitute for executing the user journey in a browser.

## 5. Use an isolated copied workspace for mutating evals

A package-owned starter app is a fixture, not the evaluated agent's working tree. If an eval modifies files:

- copy the complete starter fixture into a unique per-run workspace;
- run the evaluated agent and verification commands from that copy;
- keep the canonical package fixture byte-identical;
- validate `workspace_fixture`, `working_directory`, and expected-artifact paths against absolute paths, traversal, and symlink escape;
- require declared output artifacts and verification commands to succeed before judging;
- test that generated files appear only in the run workspace.

Do not restore mutating evals to a shared fixed `/tmp` checkout, moving branch, or package source directory. A package may be locally self-contained yet still fail evaluation isolation if the agent edits the canonical fixture.

## 6. Dispatch newly introduced CI from the candidate ref

A pull request may report no checks when the workflow file itself is new or its trigger is not yet present on the default branch. Do not interpret `no checks reported` as success, and do not weaken the publication gate.

When the candidate workflow declares `workflow_dispatch`, dispatch that exact workflow from the frozen candidate ref, then verify the returned run's `headSha` equals the reviewed candidate SHA before trusting any job result. Query the run directly by run ID because branch-filtered listings can lag immediately after dispatch. Require the named platform job—not merely unrelated Linux/macOS jobs—to pass. Any test-only remediation after CI failure changes the candidate SHA, invalidates the earlier review, and requires local validation, exact-SHA review, guarded push, and an exact-head rerun.

## 7. Reserve cleanup and reporting capacity

Long harvests can exhaust an agent's tool-call or time budget during iterative review. Reserve capacity for the final gate sequence:

1. final source freeze;
2. tests and secret scan;
3. exact-SHA review;
4. push/PR verification or fail-closed disposition;
5. lock and exact-worktree cleanup;
6. material-outcome report.

If capacity is becoming constrained, stop before publication rather than creating another candidate SHA that cannot be reviewed. Never report cleanup as complete unless the lock/worktree removal was actually verified. State remains unchanged for unfinished candidates.
