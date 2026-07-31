# Disposable-copy hostile-probe harness

Use this pattern when an immutable candidate includes executable validators and the review must prove that attacker-coordinated mutations fail without touching canonical bytes.

## Harness shape

For each probe, create a fresh temporary copy from the immutable candidate rather than reusing a previously mutated tree:

1. `copytree()` the candidate into reviewer-owned temporary storage.
2. Make directories user-readable/writable/executable and files user-readable/writable. Read-only source directories may otherwise prevent cleanup; apply directory and file modes separately.
3. Parse only the records needed for the mutation.
4. Apply one semantic attack. If the threat model permits recomputing digests/checksums, recompute all such values honestly—but never use or request reviewer private keys.
5. Serialize the changed records.
6. Rebuild the outer manifest over every payload file in deterministic path order.
7. Run the ordinary validator/publication path as a subprocess.
8. Record probe name, exit status, final rejection reason, manifest entry count, and recomputed outer-manifest SHA-256.
9. Delete the temporary copy in `finally`; if copied read-only directories block deletion, restore reviewer-owned tree permissions before removal.

Do not mutate one shared scratch tree across probes: residue can make a later negative test fail for the wrong reason.

## Manifest correctness

Manifest entries commonly use `./relative/path`. Normalize that prefix when comparing listed paths to `Path.relative_to(root)` output; otherwise every payload can be falsely reported as unlisted even when every hash verifies.

Verify both before and after review:

- requested manifest digest;
- unique listed count and actual payload count;
- every listed hash;
- duplicates, missing files, and unlisted payloads;
- symlinks;
- writable candidate entries;
- bytecode/cache artifacts.

Treat the manifest itself separately from payload count unless the packet explicitly includes it as a listed payload.

## Rejection-reason discipline

A nonzero exit alone is not evidence. Preserve unrelated prerequisites so the mutation reaches the intended rule, and report the exact reason. Examples:

- signed-envelope mutations should fail signature or explicit identity/release binding;
- nested reviewer disposition changes should fail digest equality or signature verification;
- chronology probes should fail signature authenticity or the exact chronology bound;
- credential-bearing URLs should fail the credential-free URL gate, not a later source mismatch;
- publication-negative validation should fail for the intended missing publication evidence, not an accidental missing input.

When a validator performs a structural binding check before signature verification, that is acceptable only if the signed envelope still cryptographically covers the changed field. Confirm message construction as well as runtime behavior.

## Fully prerequisite-satisfied signed probes

Some lifecycle, chronology, and enablement defects are unreachable with the packaged first-review-only fixture. For these focused probes, use reviewer-generated ephemeral keypairs and fresh in-memory or disposable-copy records to construct two otherwise valid signed receipts. Add the ephemeral identities only to the reviewer-owned copy of the registry; never access packaged or real reviewer private keys.

Keep this separate from external-anchor testing:

- external registry replacement/rotation probes must keep the supplied anchor fixed and use the unmodified candidate trust boundary;
- ephemeral keys are only a test fixture for reaching a downstream semantic rule;
- sign the exact mutated substantive record, satisfy unrelated summary/lifecycle/release prerequisites, and retain positive controls;
- report that the keys were reviewer-generated scratch keys and that acceptance demonstrates validator semantics, not authorization by the production registry.

This pattern is especially useful for proving `import completion ≤ first review`, duplicate-reviewer rejection, signed enablement, and whether an arbitrary digest-shaped manifest reference is accepted after every signature prerequisite is met.

### Candidate-relative import-manifest probe matrix

When a signed result adds both `manifest_path` and `manifest_sha256`, do not treat one hash-mismatch unit test as closure. Build a fully signed positive control and then run each mutation from a fresh scratch root:

1. valid contained regular file whose declared hash equals SHA-256 of its exact bytes — must accept;
2. signed all-zero/random digest over unchanged bytes — must reject at exact-byte hash equality;
3. `../` and normalized `segment/../` paths — must reject lexically before resolution;
4. candidate-local symlink resolving outside the package — must reject at real-path containment;
5. missing target and directory target — must fail closed on the ordinary/publication CLI path;
6. byte change with stale signed hash — must reject at exact-byte hash equality;
7. unsigned path mutation — must either fail exact reviewed-record binding or fail closed while resolving the newly named target;
8. completed import after first review, second review before first, and second review after release — each must reject for its intended chronology rule.

Sign only after all substantive result fields are present, and use two distinct ephemeral reviewers. Preserve the exact chain `import completion ≤ first review ≤ second review ≤ release creation` in the positive control. If a direct helper surfaces `FileNotFoundError`/`OSError` for a missing path, also invoke the documented CLI entry point and verify it converts that exception into a nonzero invalid result; an uncaught helper exception alone does not prove the user-facing publication command fails closed cleanly.

For unsigned lifecycle/summary attacks, start from the fully valid signed production control. Mutate lifecycle metadata and derived counters independently so rejection cannot be attributed to a missing signature prerequisite. Record exact rejection text, not only nonzero status.

## Coordinated substitution probe

For evidence/provider substitution, mutate the complete attacker-controlled chain in one copy:

- authoritative mapping/provider ID and display name;
- source provider ID/name/URL;
- evidence payload identity;
- evidence row requested/final URL, bytes, hash, and size;
- record-level reviewed digests;
- enclosing pack/release digests where applicable;
- outer manifest.

Leave signatures unchanged. Acceptance proves checksum-only authorization; rejection should occur at a reviewer-owned semantic binding.

## Machine-local path freezer matrix

When the candidate claims to prohibit machine-local paths, prove two separate properties:

1. **Current-byte cleanliness:** scan every regular candidate file and every recursively bounded archive member.
2. **Future-freezer closure:** run a valid portable baseline, then one fresh hostile source per representation. Require the intended rejection reason, not merely a nonzero exit.

At minimum, keep representation classes separate for macOS home, Linux home, Windows home, private temporary root, generic temporary root, private macOS var-folders root, its non-private lexical alias, and local-file URI. Do not collapse realpath and alias spellings into one case. Inspect the packaged regression table independently of direct probes: a correct freezer implementation does not prove that its durable tests cover every claimed class.

Construct hostile strings from byte/string fragments in the probe and durable report when the report itself may later enter another frozen candidate. This proves the forbidden bytes without copying those exact byte sequences into review prose.

## Pre/post fingerprint discipline

If reporting a whole-tree fingerprint before and after review, use one canonical function both times. It must use identical root-inclusion, path ordering, relative-path encoding, type tags, mode encoding, size encoding, and content-hash rules. Record the algorithm or preserve the helper invocation. Two different but individually valid fingerprint formulas cannot support an “identical before and after” claim.

Manifest verification remains authoritative and should still be repeated independently after all scratch work and after the sole authorized report write. The report is outside the candidate; candidate integrity must remain unchanged.

## Durable report hygiene and verdict tokens

When the gate requires exactly one of two machine-counted verdict tokens:

- emit the selected token once in the verdict section;
- avoid reproducing either token in predecessor dispositions, examples, or explanatory prose;
- count both tokens programmatically before returning;
- hash the final report bytes independently;
- scan the report bytes for the same prohibited path classes when future candidate construction may ingest review reports;
- avoid embedding absolute candidate/report paths in durable prose when a candidate ID, basename, manifest digest, and final out-of-band response provide sufficient identity.

Treat publication/deployment authorization as separate prose without introducing a second implementation-verdict token.

## Reporting

A compact table should include each probe, result, intended rejection, and recomputed outer-manifest digest. Separately report canonical suite counts, ordinary validation, publication-negative validation, regenerated-output comparison, pre/post integrity, report path, and report SHA-256. For an intended-negative publication command, assert both its exact expected exit code and a reason specific to the missing publication evidence; unrelated configuration or trust-anchor failures do not count.
