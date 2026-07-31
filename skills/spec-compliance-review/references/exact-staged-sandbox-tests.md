# Exact staged-snapshot sandbox testing

Use this recipe when focused tests may invoke generators or otherwise mutate tracked output during an exact staged-diff review.

## Preserve the candidate

Record before testing:

- `git rev-parse HEAD`
- `git status --porcelain=v2 --untracked-files=all`
- staged path/blob identities
- SHA-256 of `git diff --cached --binary`
- unstaged diff hash and initial untracked set

Do not run a mutation-prone suite in the reviewed checkout merely because individual tests claim to use isolated output directories. A different test in the same file may generate into the default tracked path.

## Build an exact staged snapshot outside the checkout

1. Create a disposable sandbox outside the repository.
2. Materialize `HEAD` with `git archive HEAD | tar -x -C "$SANDBOX"`.
3. Overlay every staged path from the reviewed checkout into the sandbox, preserving its relative path. Because an exact staged review requires an empty unstaged diff, these working-tree bytes equal the index blobs.
4. Reuse dependencies with a sandbox-local symlink to the reviewed checkout's `node_modules` when safe, or install dependencies in the sandbox.
5. Run required generators and focused tests only in the sandbox.
6. Delete the sandbox.

## Choose the sandbox parent deliberately

Some security suites test that output overrides are contained by the operating system's real temporary directory. If the entire copied repository is itself under `os.tmpdir()`, outside-temp negative cases can become impossible or invert their assumptions and produce harness-only failures.

For those suites, place the disposable repository under a non-temporary sibling workspace while keeping test-created override paths under the real system temp. A first run under system temp that fails only these containment cases is setup-inconclusive; rerun in the non-temp sandbox before judging the candidate.

## Interpret and verify

- Require a valid generated baseline before interpreting negative probes.
- Report the exact test count from the successful sandbox run.
- Treat failures caused by stale generated files in the original checkout as setup-inconclusive, not implementation failures.
- After testing, reconfirm the original checkout's HEAD, staged blobs/hash, empty unstaged diff, and untracked set.
- If an accidental original-checkout run generated output, restore only the proven generated scope using the initial snapshot; never use an unbounded clean/reset command.
