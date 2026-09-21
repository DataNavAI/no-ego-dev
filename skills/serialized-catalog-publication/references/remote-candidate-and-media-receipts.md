# Remote candidate and deterministic media receipts

Use for any catalog candidate built in an isolated worktree and handed off through a remote pull request.

## Remote-first handoff

A worker summary, local commit, or clean worktree is an observation—not delivery. Resolve and verify:

- remote branch and exact head commit;
- live pull request number/URL and state;
- exact base/head identities and ancestry;
- changed-path set and artifact path;
- artifact bytes read from the exact remote head; and
- required check conclusions and publication boundary.

If a handle is omitted, search live open/closed PRs and remote refs by issue/title/branch before redispatching. A parent-local file miss is expected for isolated worktrees. Reuse a coherent remote artifact; re-dispatch only when no durable artifact exists or identity cannot be reconciled.

## Shell-safe PR body

Never build a body containing Markdown backticks, command substitutions, non-ASCII text, paths, or SHAs through an unquoted shell heredoc or interpolation. Materialize literal bytes with a file-writing API and use `gh pr create/edit --body-file <absolute-path>`. Derive head/path fields immediately before writing. After create/edit/amend/force-push, read back live body, base/head SHAs, and changed paths and require exact agreement.

## Exact URL derivation

Do not hand-transcribe or intuitively repair encoded source/media URLs. Read the live page or structured response, extract the canonical/original URL, and let the HTTP client encode query values. Preserve already encoded path segments and encode raw Unicode exactly once. Record canonical source identity separately from transport-normalized request identity.

Bind source page/API receipt, requested URL, final URL, status, content type, byte count/digest, and stored original bytes. Preserve failed observations rather than overwriting them with a later success.

## Deterministic media receipt

Generate metadata from final bytes after the actual image tool runs: format, dimensions, byte count, digest, crop/safe-area, recipe, and tool version. Replay the declared recipe to a separate temporary output and compare bytes, dimensions, and hashes. When practical, compute replay crop/transform inputs through an independently inspected path so copied metadata cannot conceal an implementation error.

## Final-tree freshness

Every changed-path write or changed candidate head invalidates the prior verification envelope. From the final task-owned tree rerun the focused artifact/hash/replay audit, canonical tests/lint/build that apply, boundary checks, `git status --short`, and diff checks. Remove transient helpers and verify their absence. Then refresh the remote branch/PR receipt. Never report a pre-write or pre-amend result as current.
