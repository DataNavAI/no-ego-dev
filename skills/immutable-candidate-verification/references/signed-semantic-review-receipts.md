# Signed semantic review receipts for immutable content candidates

Use when a content candidate relies on reviewer signatures rather than hashes alone. A candidate checksum only proves bundle integrity; it does not prove that a reviewer authenticated the decision encoded inside each record.

## Canonical receipt envelope

Sign canonical JSON containing every reviewer-owned assertion, not merely reviewer ID plus record digest:

- `receipt_version`
- `reviewer_id`
- `reviewed_at`
- `outcome`
- `reviewed_record_sha256`
- `record_class`
- `record_id`
- `release_version`

Serialize with UTF-8, sorted keys, compact separators, and no `signature` field. Verify against an independently registered public key. Keep private signing keys outside repositories, candidates, logs, and public artifacts.

## Record digest boundary

Exclude lifecycle and first/second-review metadata only at the top level of the exact record being reviewed. Do not recursively omit generic keys such as `status`: that can silently remove nested governance decisions such as `duplicate_review.status`.

For aggregate records, it is acceptable to bind ordered child IDs when every child has its own receipt. Document this boundary explicitly.

## Required hostile probes

On disposable copies only, prove that each mutation fails without the reviewer private key:

1. Change `outcome` while retaining the signature.
2. Change `reviewed_at` to another structurally and chronologically valid time.
3. Change `record_class` or `record_id`.
4. Change `release_version`.
5. Change a nested governance disposition such as duplicate-review status.
6. Recompute the record digest and outer checksum manifest without re-signing.
7. Substitute provider ID, provider name, canonical source URL, and payload together, then recompute all attacker-controlled hashes.

Expected failure may be an envelope identity/release mismatch, exact-record digest mismatch, or invalid signature. Tests should assert the intended boundary rather than rely only on one diagnostic ordering.

## Chronology and verdict separation

Validate causal chronology independently of cryptography: evidence retrieval ≤ review time ≤ release creation, and second review ≥ first review. Signature verification authenticates the time; chronology validation decides whether that authenticated time is admissible.

Keep three verdicts separate:

- implementation-contract approval;
- content-publication approval;
- deployment promotion.

A publication-negative result caused by legitimately missing second reviews can coexist with implementation approval. A timed-out reviewer provides no verdict and must be re-dispatched; another reviewer cannot fill in its missing domain verdict.

## Freeze and verification recipe

Before dispatch, freeze a unique candidate path, generate a sorted checksum manifest, make the complete tree read-only, and pin the checksum-manifest digest plus payload count out of band. Run tests from the read-only candidate with bytecode/cache writes disabled or redirected to external scratch. Verify inventory, hashes, symlinks, writable bits, and process exits both before and after reviewer execution.

Avoid long shell chains whose final successful command can mask an earlier failure. Use `set -euo pipefail` or a small subprocess driver that records each return code explicitly. If a security wrapper mistakes bitwise syntax for shell backgrounding, express the same check through a library helper (for example `stat.filemode`) rather than weakening the invariant.
