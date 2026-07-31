# Externally anchored signed review packages

Use this pattern when an immutable product/content candidate contains reviewed records, reviewer signatures, and a verifier, and future candidates must not be able to mint their own review authority.

## Threat model

Hashing candidate files and signing record digests is insufficient when the candidate also supplies the complete public-key registry. A hostile future candidate can replace the verifier's keys, create attacker keys, resign altered records, and recompute every outer manifest hash. The package is internally consistent but self-authorizing.

Treat these as separate layers:

1. **Candidate integrity:** immutable inventory plus payload checksums.
2. **Record authenticity:** signatures over complete, canonical review envelopes.
3. **Reviewer authority:** a registry identity/digest pinned outside candidate and verifier control.
4. **Promotion authority:** protected environment approval binding the candidate, review reports, registry anchor, and exact source revision.

## Canonical signed envelope

Sign deterministic compact JSON with sorted keys. Bind at least:

- receipt schema/version;
- reviewer-registry ID and version;
- reviewer ID;
- review timestamp and outcome/disposition;
- exact substantive-record digest;
- record class and stable record ID;
- release/content version.

Do not sign only `<reviewer>:<digest>`. That leaves outcome, chronology, identity, or release semantics mutable.

The substantive-record digest may omit top-level lifecycle/review fields to avoid recursive signatures, but omission must be depth-aware. Do not recursively omit generic keys such as `status`: nested governance (`duplicate_review.status`, rights disposition, moderation state) must remain bound. For container records, bind ordered child IDs and require each child to carry its own signed receipt.

## External reviewer-registry anchor

Keep a public registry copy in the package for deterministic verification, but never treat that copy as its own trust anchor.

- Canonicalize and hash the complete registry.
- Require the expected registry SHA-256 as an explicit out-of-band verifier input.
- Store the expected digest in owner-controlled/protected configuration, then bind the same value into release attestation and deployment environments.
- Fail when the anchor is absent, malformed, or different.
- Bind registry ID/version into every signed receipt.
- Require at least two active reviewer identities where two-stage review is claimed.
- Require unique active public keys; one key under multiple IDs is not independent review.
- Keep revoked entries for history but prevent revoked keys from authorizing current receipts.
- Make rotation a new registry version plus independent approval and protected-anchor update; never silently accept a candidate-selected version.

## Governance contract

Document and independently review:

- registry owner and enrollment authority;
- reviewer role/identity proof and enrollment timestamp;
- one identity/one active key rule;
- private-key custody and one-reviewer-per-signing invocation;
- routine rotation;
- revocation and reviewer departure;
- compromise response and receipt invalidation;
- rollback policy;
- how CI/deployment obtains the protected digest.

Private keys, signing audit data, and secret paths never enter candidates, repositories, build artifacts, logs, or public responses.

## Required hostile tests

Use writable disposable copies only; never mutate the exact candidate.

1. Change review outcome and timestamp with unchanged signature.
2. Change reviewer ID, record class/ID, release version, and registry ID/version.
3. Change nested governance disposition, recompute record and outer hashes, retain old signature.
4. Replace all registry keys with attacker keys, resign all records, and recompute the entire candidate while retaining the original external anchor.
5. Register one public key under multiple active reviewer IDs.
6. Revoke an active key and try to validate a receipt from it.
7. Change to a syntactically valid new registry version while retaining the original external anchor.
8. Coordinate provider/source/evidence/record substitution and recompute every attacker-controlled digest.
9. Invoke the CLI without an external anchor and with a wrong anchor.
10. Confirm the legitimate publication-negative gate still fails for the intended missing review/content reason.

Every hostile case must fail for the intended boundary. A test that fails earlier for malformed fixture shape does not prove the deeper invariant.

## Immutable review workflow

1. Validate mutable source with the externally supplied anchor.
2. Run positive, hostile, ranking/source-rights, and publication-negative checks separately with preserved exit codes.
3. Freeze a fresh candidate path; generate a sorted manifest excluding the manifest itself.
4. Remove write bits and verify payload hashes, exact inventory, no symlinks, no cache files, and no private material.
5. Record candidate-manifest digest, payload count, registry digest, and expected publication status out of band.
6. Dispatch independent implementation and source/governance reviews against that exact identity.
7. Preserve exact verdicts. Any candidate edit creates a new revision; approval never transfers.
8. After approval, create a closed release attestation containing candidate identity, registry anchor, exact review-report digests, publication status, and immutable source revision. CI and deployment compare it to protected configuration.

## Verification pitfalls

- Shell aggregates can hide the failing stage or stop before expected-negative exit capture. Run gates separately or use a small subprocess harness that records every return code.
- With `set -e`, temporarily disable fail-fast around an expected-negative command, capture its status, restore fail-fast, and assert the exact expected status/reason.
- Python tests in read-only candidates can create `__pycache__`; set `PYTHONDONTWRITEBYTECODE=1` and recheck candidate integrity afterward.
- Distinguish implementation approval from content publication. A determinate fail-closed publication gate may be approved while publication correctly remains blocked.