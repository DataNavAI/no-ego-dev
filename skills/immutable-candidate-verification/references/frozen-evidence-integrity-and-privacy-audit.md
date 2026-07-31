# Frozen evidence integrity and privacy audit

Use for a no-edit review of an exact staged Git tree containing browser evidence, reports, checksums, trace archives, deployment receipts, and an immutable publication symlink.

## Preserve and bind the review target

1. Confirm the supplied object is a tree with `git cat-file -t <tree>`.
2. Prove the live index matches without `git write-tree`: `git diff --cached --quiet <tree> --`.
3. Capture HEAD, porcelain-v2 status, unstaged paths, untracked paths, and staged path count.
4. Read frozen blobs with `git show <tree>:<path>` rather than trusting working-tree files.
5. Independently reconstruct the tree object ID from `"tree " + byte_length + NUL + raw_tree_bytes` when the exact staging digest itself is an acceptance criterion.
6. Repeat all preservation checks before issuing the verdict.

## Integrity closure

Parse the frozen evidence JSON and require exact target membership, shared release ID and generation time, PASS status, and closed digest syntax. Recompute SHA-256 over every frozen screenshot and trace blob and compare all receipts individually.

For a secondary checksum manifest, require the exact expected entry count, reject duplicate or unsafe names, retrieve each named blob from the frozen tree, and recompute every checksum. Treat the checksum manifest itself as part of the review identity even when it does not list its own hash: record its expected digest before opening any other artifact, require the same file and digest immediately before the verdict, and fail closed if it disappears. Never regenerate a missing manifest from the mutable checkout; restoration must come from the snapshot owner or another independently pinned source.

Use a shell check that cannot report success after an early missing-file error. Start with `set -euo pipefail`, assert `test -f "$manifest"`, capture the manifest digest and line count, run the checksum verifier, and require the verifier's exit code plus exact `OK` count. Avoid command sequences where a failed `shasum`, redirection, or `wc` is followed by a successful `printf`/`grep` that becomes the process exit status. A robust shape is:

```sh
set -euo pipefail
test -f "$manifest"
test "$(shasum -a 256 "$manifest" | cut -d' ' -f1)" = "$expected_manifest_sha"
test "$(wc -l < "$manifest" | tr -d ' ')" = "$expected_count"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
(cd "$root" && shasum -a 256 -c "$relative_manifest") | tee "$log"
test "$(grep -c ': OK$' "$log")" = "$expected_count"
! grep -v ': OK$' "$log"
```

If the checksum list vanishes or changes during an otherwise read-only review, preserve grounded findings as results against the pre-verified generation, but mark final after-review closure absent and withhold the immutable verdict. Record the concurrent mutation explicitly; do not silently downgrade it to a warning or claim that unlisted files were unchanged.

Then independently validate semantic totals:

- exact target count;
- exact screenshot/trace receipt count;
- expected CUJ rows per interface, complete rank set, and all PASS rows;
- identical authoritative cohort tuples across interfaces;
- expected representative/action result count and all required action fields;
- health revision/generation/cohort binding;
- symlink mode, relative target, and target existence in the same frozen tree.

A candidate-specific directory name or surrounding Markdown is not intrinsic candidate binding. Machine-readable release evidence should carry the release ID/source SHA and a candidate-coherent timestamp. Flag a file that declares `releaseEvidence: true` while omitting candidate identity or retaining a pre-candidate timestamp, even if a checksum manifest binds its bytes to the staged tree.

## Recursive archive and privacy scan

Treat every archive member as evidence. Open each trace ZIP in memory, run CRC verification, inspect member names and contents, and recurse into nested archives with depth and decompressed-size bounds. Scan normal staged evidence and all archive members for:

- `/Users/<name>`, `/home/<name>`, Windows user profiles, and known local usernames;
- `file://` URLs and absolute checkout or temporary paths, including both lexical forms of macOS aliases: `/tmp/...` and `/private/tmp/...`, plus `/var/folders/...` and `/private/var/folders/...`;
- GitHub tokens, AWS access-key prefixes, JWTs, bearer credentials, populated secret/password fields, cookies, and private-key markers;
- emails or other PII, using format-aware checks to avoid treating Playwright resource names such as `page@<id>.jpeg` as email addresses.

A username-free temporary path is still machine-local path disclosure when the requirement forbids machine-local identifiers **or paths**. Sanitizing only home-directory prefixes is insufficient. When a freezer is in scope, run a valid baseline and one external-scratch hostile fixture per prohibited class and lexical alias; require rejection of both symlink-style and realpath-style macOS forms. Report current-byte cleanliness and freezer hostile-matrix completeness as separate results, because a clean candidate can still bundle a bypassable freezer. Report the exact archive and member, for example `target.trace.zip!trace.stacks`.

Do not stop after proving that direct text payloads reject. If the freezer admits any archive-capable format (including ZIP-based office documents), repeat the complete hostile path matrix inside compressed members and at least one nested archive. A raw outer-byte substring scan is bypassable because compression hides member strings. Require recursive member-name and member-content inspection, CRC/format failure rejection, and explicit depth, member-count, per-member-size, and aggregate decompression limits. Keep two independent assertions in the report: (1) the current candidate and every recursively opened member are clean, and (2) the bundled freezer rejects future archived leaks. The first does not imply the second.

Treat archive recognition itself as fail-closed. A guard shaped like `if not is_zipfile(bytes): return` accepts truncated or malformed files carrying an archive-capable extension because malformed input often fails format detection before the strict parser runs. For every supported archive extension (especially `.zip` and ZIP-based office formats), require successful strict parsing; reject truncated local headers, missing central directories, unsupported/encrypted members, CRC failures, and extension/content contradictions. Probe malformed ZIP and office-document fixtures separately in addition to CRC corruption of a structurally parseable archive. For the strongest privacy reproducer, start from a valid deflated archive whose member contains a prohibited path, remove only the end record, assert that the forbidden plaintext is absent from the outer bytes and archive sniffing now fails, then require the freezer to reject rather than copy it.

An aggregate decompression budget must be shared across the complete recursive walk, not reset in each nested-archive invocation. Probe an outer archive containing multiple inner archives that each stay below the nominal ceiling while their cumulative expanded bytes exceed it. Charge one shared counter before or during every extraction; a local `total = 0` per invocation is only a per-archive limit and permits multiplicative expansion. Keep valid direct, ZIP, and office-document baselines so fixture/setup errors cannot masquerade as fail-closed behavior.

Byte-pattern path scans must cover serialization encodings, not only the decoded display form. In particular, a Windows profile path has one backward separator after JSON decoding but doubled backward-separator bytes in JSON source text; a detector matching only the decoded byte spelling will accept the serialized evidence. Run direct, ZIP-member, and office-document-member fixtures for decoded backward separators, forward separators, and JSON-escaped backward separators. Prefer safe structured decoding for supported text formats or an equivalently closed representation detector, while retaining raw-byte scans for non-structured members.

## Artifact-truthfulness checks

Do not trust summary counters alone. Read complete command logs past the nominal `pass N / fail 0` block. Node's test runner can report all test bodies as passed and then print a failing file-level hook or teardown after the summary. A retained `✖ failing tests`, stack trace, nonzero command result, or failed after-hook contradicts an unqualified “command passed” claim.

Treat every human-readable release table as a projection of the canonical machine-generated evidence, not as an independent truth source. After evidence regeneration or sanitation, reconcile every row by stable target ID and compare all reported measurements and statuses—not only counts, digests, and PASS labels. In particular, compare LCP/latency, byte totals, viewport, browser identity/version, and control results. A report carrying metrics from an earlier run is a release blocker even when all current artifact hashes and aggregate counts pass. Use an explicit target-to-target comparison rather than relying on row order or visual inspection.

Validate PNG decoding and dimensions; inspect trace context records for expected browser engine, viewport, deployed origin, and runtime errors. This establishes that receipts point to structurally real browser artifacts rather than arbitrary bytes, without overstating product-quality review.

## Deployment-equivalence corroboration

When read-only credentials are available, corroborate durable claims without writing files:

1. Query the workflow run conclusion and jobs.
2. Download the workflow artifact into memory, verify ZIP integrity, hash the inner manifest bytes, and compare its source ref and digest.
3. Resolve the immutable registry tag to its digest and compare size/media metadata.
4. Query deployment-controller image/revision and runtime operation status.
5. Probe health/readiness and require the exact candidate revision/cohort.
6. Query environment branch policies and verify any temporary exact-branch policy is absent and the original policy set remains.

A workflow-dispatch run may have metadata `head_sha` for the workflow-owning branch rather than the deployed input ref. Do not reject solely on that field; inspect the resolved deployment manifest and runtime revision. Conversely, a successful workflow badge alone is insufficient.

## Verdict discipline

Return `REQUEST_CHANGES` for any privacy leak, misleading command receipt, stale/replayable candidate binding, checksum mismatch, malformed archive, or uncorroborated required cleanup. Keep blockers reproducible with frozen path/member/line evidence. Passing cardinalities and deployment checks may be summarized after blockers when the user requested a full audit rather than blocker-only output.