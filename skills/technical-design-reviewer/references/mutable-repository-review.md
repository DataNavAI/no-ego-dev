# Reviewing an intentionally mutable implementation repository

Use this when an exact immutable design/product candidate must be reviewed against a worktree with uncommitted or concurrently changing implementation bytes.

## Bind the reviewed reality

1. Verify immutable design and candidate hashes first.
2. Inventory tracked modifications and nonignored untracked files; Git HEAD alone is not the implementation identity.
3. If source bytes change during inspection, reread affected files rather than relying on earlier excerpts.
4. Copy the final reviewable tree to a temporary directory, excluding `.git`, dependency caches, and generated output. A source snapshot may intentionally be read-only or carry macOS immutable flags/ACLs; after copying, make **only the disposable copy** writable before builds (`chmod -RN`, `chflags -R nouchg`, then `chmod -R u+w` where applicable). Never relax the canonical candidate.
5. In the snapshot, sort all regular-file paths, compute per-file SHA-256 values, then SHA-256 the resulting manifest. Report manifest digest and file count.
6. Run the final test/build pass only against that bound snapshot. Re-run the original payload manifest afterward so generated output or installers cannot hide mutation of reviewed inputs.
7. Remove the snapshot after capturing output. If ordinary removal fails because copied flags/ACLs survived, clear them on the disposable copy and retry; verify the directory is gone rather than trusting the cleanup command's attempted output.

## Preserve a no-modification promise

Unit tests that do not write may run in place. Builds, package creation, compilers, generated-tree checks, Python bytecode-producing tests, and destructive clean steps belong in the temporary snapshot. Set `PYTHONDONTWRITEBYTECODE=1` for candidate Python verification where appropriate. Finish by stating whether canonical files were created or modified.

## Verify commands, not labels

For every CI/testability command claimed by the design:

- confirm referenced scripts, globs, directories, and package-script targets exist;
- execute commands where safe;
- distinguish a passing component test from the full claimed failure surface;
- check that workflows actually invoke the commands and preserve the promised evidence;
- record missing paths or a command that resolves to the wrong filename as command-executability evidence, not merely as future implementation work when the design claims it already works.

## Verify packaging end to end

Do not stop at “the bundler succeeded.” Compare:

- generated archive/tree layout;
- deployment handler/module path;
- exported entry point;
- runtime architecture and module format;
- immutable artifact hash/location;
- version/alias resources and outputs;
- smoke invocation from the packaged artifact;
- current-plus-prior retention and no-rebuild rollback path.

A valid CloudFormation template does not prove that its referenced package layout or handler exists.

## Classify findings correctly

- **Design defect:** contracts contradict, a required state is unrepresentable, rollout compatibility is unspecified, or an operational query/recovery path is impossible under the proposed schema/IAM.
- **Implementation gap:** the design is coherent but current code has not implemented it yet.
- **Approval-blocking implementation gap:** the user requested current implementation readiness, or the design explicitly claims an existing command/evidence path is executable.
- **Unavailable evidence:** material source/runtime information cannot be inspected; use `BLOCKED` rather than guessing.
