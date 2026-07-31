# Candidate-only atomic fixture refresh CLIs

Use this pattern when a review pipeline must convert bounded fixture responses into a complete candidate artifact without any path to an approved production registry.

## Contract

- Make the candidate basename a fixed internal constant. Do not accept an arbitrary output file and do not include the approved registry basename in any writer path.
- Keep module import side-effect free. Export a reusable collector/orchestrator and guard CLI execution with a direct-execution check.
- Require explicit fixture inputs, one or more repeated expected identities, an existing output directory, and an exact injected UTC instant. Provide `--help` and stable non-zero diagnostics for unknown, duplicate, missing, or malformed arguments.
- Bound the expected identity list (for example, 1–50), validate every identity lexically, reject duplicates, and preserve requested order in deterministic output.

## Fixture and destination boundaries

- Resolve each fixture with `lstat`/`realpath`; require an existing regular non-symlink file, cap bytes before reading, parse JSON fail-closed, and validate the minimum response shape before collection.
- Require the output directory to exist, resolve to a real directory, and not itself be a symlink.
- The fixed candidate target may be absent or an existing regular non-symlink file. Reject symlinks, directories, devices, and other target types.
- Fixture mode must perform no network requests and must not read the wall clock when an exact `checkedAt`/`generatedAt` is supplied.

## Complete-batch fail-closed collection

1. Validate the complete expected identity list before loading records.
2. For every expected identity, call the entity loader in its own guarded block. Normalize every thrown value—including a domain error thrown by the loader—to one stable public loader-failure code carrying only the current identity. Do not leak the loader's message, code, stack, or detail.
3. After the entity loader returns, keep `null`/`undefined` distinct as the existing missing-identity error.
4. Call the companion-evidence loader in a second guarded block with the same loader-failure normalization. Do not place either loader call inside the materializer `try`, or loader failures become indistinguishable from materialization failures.
5. Run the pure materializer in its own guarded block. Normalize all materializer exceptions—including same-class domain errors—to the stable materialization-failure code, and require a non-null result whose identity exactly matches the requested identity.
6. Treat missing/null records, loader failures, materializer exceptions/nulls, mismatches, and partial coverage as batch failure.
7. Build and serialize the complete candidate graph in memory before the first filesystem mutation.

Never preserve a successful prefix of a failed batch. A failed run must leave both any previous candidate and the approved registry byte-for-byte unchanged.

## Canonical direct CLI invocation

- Keep imports side-effect free and run the CLI only when the canonical entry path equals the canonical module path.
- Compare `realpath` values rather than lexical/absolute paths so `node <symlink-to-script> --help` is recognized as direct execution.
- Put canonicalization in a non-throwing guard: if the argv entry is absent, dangling, inaccessible, or cannot be canonicalized, return false and do not activate the CLI during import.
- Retain the existing top-level CLI error formatter after the direct-execution decision; canonicalization failure itself should not emit an accidental CLI diagnostic.

## Atomic write

- Serialize deterministically with stable key and identity order, fixed timestamps, two-space JSON indentation, and exactly one trailing newline.
- Create a unique same-directory temporary file with exclusive creation (`wx`).
- Write all bytes, `fsync` and close the file, then atomically rename it over the fixed candidate target.
- Optionally sync the containing directory where supported/required for durability.
- On pre-rename failure, close descriptors and remove the temporary file. Never leave temp artifacts after successful or failed ordinary runs.
- Do not fabricate approval fields, approved timestamps, or local asset paths. Source-derived rights candidates should remain explicitly pending/non-publishable.

## Focused TDD verification

Drive the CLI through a child process in a temporary output directory:

- Seed the approved registry path with unique sentinel bytes.
- Run one complete fixture batch and assert exact candidate bytes and parsed shape.
- Assert the approved sentinel is unchanged and directory inventory contains only the approved sentinel plus fixed candidate file.
- Run the same command twice and assert byte-identical candidate output with no temp artifacts.
- Add one missing expected identity to force a partial-batch failure; assert non-zero status, stable stderr, unchanged prior candidate bytes, unchanged approved bytes, and no temp artifacts.
- Add injected-loader tests for both loaders with both ordinary exceptions and domain-error instances. Assert the externally visible error class/code/detail/message, identity-only detail, and absence of every private loader code/message fragment.
- Characterize the adjacent unchanged boundaries: a null entity remains a missing-identity error, while a materializer-thrown domain error is normalized to materialization failure rather than escaping.
- Create a temporary symlink to the script, invoke the symlink with the runtime and `--help`, assert zero exit, expected usage on stdout, and empty stderr, and remove the sandbox in `finally`.
- Inspect or test the source/runtime contract so the generic writer cannot select the approved registry basename.
- Record separate exact RED→GREEN evidence for loader normalization and canonical symlink invocation, then run the combined focused tests, feature file, related reference file, and repository's canonical full suite.
- If the canonical suite regenerates a tracked tree that was clean at baseline, restore only that known generated tree and confirm the final diff contains exactly the intended source and test files.
