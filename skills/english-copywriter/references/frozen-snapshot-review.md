# Frozen-snapshot UI-copy review

Use this when a copy gate requires an immutable candidate and a checksum manifest.

## Integrity protocol

1. **Verify the requested candidate identity before substantive review.** Resolve the repository/worktree `HEAD` and compare the full object ID with the caller's exact SHA. Confirm the requested object exists locally; when appropriate, query the named remote for that exact object. A near-match, abbreviated resemblance, branch label, screenshot batch, or clean worktree is not identity proof.
   - If the exact object is absent or `HEAD` differs, the exact-candidate verdict is `BLOCKED`.
   - You may continue against the available tree only as explicitly labeled diagnostic coverage. Give any hypothetical copy verdict separately and never imply it certifies the requested candidate.
2. **Resolve paths from the manifest's expected root.** Inspect the listed paths before running the checker; a valid manifest can appear broken when verified from the wrong working directory.
3. **Record the manifest itself before review:** absolute path, SHA-256, entry count, and exact pass/fail count.
4. **Run the full manifest check before opening or exercising the artifact.** Do not begin substantive review unless every listed entry passes.
5. **Write only to the explicitly allowed report path.** Keep probe scripts, downloads, and runtime captures outside the candidate tree unless the task author explicitly allows them.
6. **Exercise runtime from the frozen source without regenerating evidence.** A review server is read-only; stop it after the probes.
7. **Run the same manifest check after review** and confirm the manifest still exists, its SHA-256 and entry count are identical, every listed file still passes, and no unexpected candidate/evidence file appeared when the directory is frozen.
8. **If the candidate changes mid-review, do not certify it.** Record the exact integrity failure, retain only findings grounded in source files that still match, and require a fresh review against a new stable snapshot.

## Concurrent-mutation handling

- Do not restore, delete, or rewrite concurrently changed candidate files; that would violate reviewer independence.
- Distinguish review findings from snapshot validity. A runtime branch can pass while the frozen-snapshot gate still fails.
- If the manifest disappears, do not reconstruct it from remembered hashes and call that an after-check.
- Critical-file partial matches can bound trustworthy diagnostic findings but cannot replace the full after-check.
- State the failed after-check plainly. Never imply all files matched after review when only the before-check passed.

## Runtime-probe discipline

For dynamic copy, keep one deterministic result record containing route titles, visible copy, accessible names/alts, state tuples, exact payload/file content, and console errors. Mock each share/export branch independently. Wait for focus transfer before reading `document.activeElement`; animation-frame timing can otherwise create a harness false negative.

Prefer read-only inline evaluations or an existing project verifier over a throwaway program. If a temporary probe file is necessary, keep it outside the candidate tree, record its path, remove it before finalizing, confirm it is absent, and separately confirm the candidate worktree is clean. Do not describe a removed probe as a candidate code change or run broad product tests merely to validate a deleted external helper; verify the candidate with its own relevant gate.