# Release and Installer Verification

Use this checklist when reviewing IFA installation or release changes.

1. Build and test with the repository-native full check, then run relevant targeted checks (race tests, shell syntax, ShellCheck, and workflow lint).
2. Install from a clean detached checkout pinned to the exact commit under review, using temporary binary and store paths.
3. Verify `ifa --version` reports the semantic version plus commit/date metadata.
4. Run `ifa init --path <temp-store>` before `ifa status --path <temp-store>` when the test needs a persisted store. `ifa status` reads provider state but does not create a missing store file.
5. Uninstall and verify only the binary was removed and the initialized runtime store remains byte-for-byte unchanged.
6. For private GitHub repositories, retrieve the installer with authenticated `gh api`. Add `?ref=<branch-or-SHA>` when validating a PR version; omitting `ref` reads the default branch and may differ legitimately.
7. To verify reproducibility, build twice with identical explicit `COMMIT` and `BUILD_DATE`, compare the binaries byte-for-byte, and record the checksum.
8. Scan tracked files and the diff for runtime state, generated env files, logs, build outputs, and high-confidence credential patterns.

A failed compound smoke command is not automatically a product defect: identify the exact failed assertion and compare it with documented command semantics before changing code.