# Pre-candidate live-variant reconciliation

Use this before editing or freezing any canonical skill candidate that will later roll out to live sibling profiles.

## Why this gate exists

The remote-default package can be older than live profiles even when the requested change appears source-local. Profiles may also share one frontmatter version while carrying different `SKILL.md` bytes. Building from stale canonical text and discovering those variants only after exact review wastes the review generation and risks downgrading learned behavior.

## Gate sequence

1. Inventory the complete canonical package and every authorized live sibling package before the first behavior edit.
2. Compare complete-package digests and per-file hashes; never use frontmatter version equality as package equality.
3. Group identical files across profiles. Separate:
   - reusable common deltas shared by profiles;
   - profile-local support files or sections;
   - contradictory same-context behavior;
   - generated/runtime files that must be excluded.
4. If any live profile version is higher than source, reconstruct the newest compatible common predecessor first. Apply the requested new behavior on top of that predecessor and choose a version strictly newer than every live variant.
5. Add a regression that proves the requested behavior **and** retains reusable predecessor controls. Run it red before importing the predecessor delta, then green after consolidation.
6. Only after this reconciliation may the first staged-diff/exact-SHA review generation be frozen.

Any profile package that changes after this gate is ordinary live drift: invalidate affected evidence, reclassify, and follow the sibling-rollout drift procedure.

## Preserving profile-local `SKILL.md` additions

When one common live package can serve as the baseline and sibling `SKILL.md` files contain compatible local additions, use a deterministic three-way merge:

- base: common live predecessor;
- ours: approved canonical successor;
- theirs: target's immediately-pre-rollout live file.

Dry-run every target before mutation. Resolve only predeclared, evidence-backed conflicts; otherwise block that target. Build adapted bytes outside profile directories, retain an adaptation map and digests, back up all targets, then swap transactionally. Canonical EVALs/scripts/fixtures may overlay exactly while an adapted `SKILL.md` is reported separately from exact canonical parity.

Do not call a merged profile byte-identical to canonical. Verify canonical markers, retained local markers, target-only file hashes, package references, and a fresh-process explicit skill load.