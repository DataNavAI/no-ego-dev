# Exact-cohort API persistence coverage

Use this pattern when a fixed production registry must be proven through an authenticated persistence endpoint without changing production behavior.

## Test shape

1. Generate the real production cohort into an isolated temporary output directory whose basename satisfies the generator contract (for example, `<temp>/generated-output`). Freeze the generation clock and run generation with production semantics.
2. Parse the generated static-data artifact itself. Assert the exact cohort size and expected type partition before deriving API keys.
3. Map canonical model types to the endpoint's existing vocabulary explicitly (for example, `individual -> idol`, `group -> group`). Assert uniqueness and a few boundary anchors that catch type inversion.
4. Prove the broad legacy catalog was not collapsed: assert established minimum group/idol counts and that every cohort slug exists in the matching broad collection.
5. Only after production generation succeeds, enable the test-only runtime data override and point it at the exact generated artifact. Preserve and restore every touched environment variable in `finally`.
6. Use one authenticated identity and sequentially `PUT` every derived key. For each response, require the exact legacy `entity` string and `followed: true`.
7. `GET` once and compare the sorted persisted set to the exact expected set. This catches silent truncation, accidental schema migration, duplicates, and partial writes.
8. Exercise at least one entity of each model type through `DELETE -> GET -> PUT -> GET`, requiring exact removal and restoration.
9. Parameterize negative mutations across:
   - valid slug with the wrong known type,
   - unknown slug with a known type,
   - unknown type with a valid slug.
   Require 404 and re-read the complete persisted set after each attempt to prove non-mutation.

## Verification and cleanup

- Run the focused named test, its complete owning test file, the canonical full suite, and the package build.
- If canonical generation dirties a tracked output tree, verify it was clean before the run. Restore tracked files and remove only generator-created untracked files under that known-owned tree afterward. `git restore` alone does not remove untracked generated directories.
- Finish with diff whitespace checks and a clean worktree outside the intentional test change.

## Decision rule

If the new test passes on its first execution, record that honestly: it is persistence coverage for already-correct production projection, not RED evidence and not justification for an unnecessary server change. Only modify production code after a test exposes a real contract failure.
