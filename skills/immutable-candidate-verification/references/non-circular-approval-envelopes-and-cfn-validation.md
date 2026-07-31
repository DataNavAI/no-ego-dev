# Non-circular approval envelopes and CloudFormation candidate validation

Use this pattern when implementation review must happen before publication or deployment authority is finalized, but the approved source still needs to land with attestations in the same commit.

## Non-circular implementation authority

### Problem

An attestation cannot safely require `candidateGitSha === HEAD` when the attestation itself is committed: adding the attestation changes `HEAD`. Likewise, a product/publication attestation may legitimately change after implementation review without changing implementation source.

### Pattern

1. Freeze every tracked and intentional untracked source file into an external read-only candidate.
2. Generate a canonical manifest with sorted payload paths, byte counts, SHA-256 values, and the exact fixed envelope exclusion list.
3. Exclude only these predeclared approval envelopes:
   - the implementation candidate manifest copied into the repository;
   - the implementation attestation;
   - the independently anchored product/publication attestation;
   - one fixed implementation-review report path.
4. Have the independent implementation reviewer approve the external immutable candidate and manifest digest/count.
5. Commit the reviewed source plus the four envelopes.
6. In live preflight, before OIDC or provider mutation:
   - verify the protected implementation-attestation digest;
   - verify the candidate-manifest digest/count named by the attestation;
   - verify the fixed review report digest and approved verdict;
   - enumerate the current Git source closure with tracked plus intentional untracked files;
   - remove only the exact declared envelope paths;
   - require exact path equality with the reviewed manifest;
   - recompute every payload byte count and SHA-256.
7. Keep the exact clean lowercase 40-character `main` SHA as a separate environment-scoped deployment approval.

Any post-review source change fails closure or digest verification. Only independently anchored envelope changes can occur without a new implementation review. Add hostile tests for an extra source file, a missing source file, payload tampering, an added envelope, manifest tampering, report tampering, and a rejected verdict.

## Privacy-safe candidate assembly

A manifest can be hash-perfect and still leak machine-local paths. Scan selected payloads and recursively scan archive members before freezing. Treat path aliases as distinct hostile representations rather than one broad “temporary path” class. At minimum exercise this explicit matrix:

| Class | Representations to reject |
|---|---|
| macOS home | `/Users/<name>/...` |
| Linux home | `/home/<name>/...` |
| Windows profile | both `C:\\Users\\<name>\\...` and `C:/Users/<name>/...` |
| generic temporary root | `/tmp/...` |
| macOS private temporary alias | `/private/tmp/...` |
| macOS per-user temporary root | both `/var/folders/...` and `/private/var/folders/...` |
| local-file URI | every supported spelling the contract forbids, including `file://...` |

Also scan JSON path fields, trace stacks, logs, Markdown review prose, and archive metadata. A clean payload scan is insufficient if the freezer accepts a hostile future payload.

For ZIP-based containers—including `.zip`, `.docx`, `.xlsx`, and `.pptx`—scan both member names and decompressed member bytes, then recurse into nested ZIP-based members to a small fixed depth. Fail closed on encrypted members, absolute/traversing/backslash member paths, malformed archives, excessive member count, excessive per-member uncompressed size, excessive aggregate uncompressed size, and depth overflow. Compare the bytes read with the declared uncompressed size. This is both a privacy boundary and a ZIP-bomb/resource-exhaustion boundary; never extract candidate archives to disk merely to inspect them.

The regression matrix must cross **representation × container**: feed every prohibited path/URI form as a direct payload, a compressed ZIP member, and a DOCX member. Add separate probes for a hostile member name, traversal, encryption where fixture tooling supports it, size/count limits, and nested-depth overflow. A direct-payload rejection suite can be fully green while every compressed representation bypasses the freezer.

If the freezer scans its own source, construct forbidden byte probes from separated fragments so the detector does not reject its own rule literals. Mirror **every detector representation** in the packaged regression matrix; a single Unix-home test does not prove Linux-home or Windows-profile closure, and testing only a filesystem realpath does not prove its lexical alias. Independently feed every matrix row through the freezer and require rejection.

After unit tests pass, run the real freezer against the complete mutable source before naming the final candidate. This catches detector literals or historical governance prose that unit fixtures miss. If durable status/review prose must discuss a prohibited representation, describe it semantically (for example, “the non-private macOS var-folders alias”) rather than embedding the forbidden bytes. Sanitize concrete local paths as “external scratch script,” freeze a **new** candidate, and rerun every candidate-bound review. Never repair an immutable candidate in place.

## CloudFormation candidate validation

Run both local semantic lint and AWS parsing before immutable review:

1. Run `cfn-lint` on the readable source templates.
2. Treat warnings about unknown IAM actions as real blockers. An SDK operation name is not necessarily an IAM action. For example, DynamoDB transactions are authorized through the underlying item actions (`GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `ConditionCheckItem` as applicable), not a fabricated `TransactWriteItems` IAM action.
3. AWS `ValidateTemplate --template-body` accepts at most 51,200 bytes. For a larger readable JSON/YAML source, deterministically emit canonical compact JSON below the limit and prove semantic equality in a test.
4. Run AWS `ValidateTemplate` against the compact foundation template and directly against every template already below the body limit.
5. Record the compact byte count, resource count, lint exit, AWS validation exit, shell/workflow lint, and `git diff --check` in the candidate evidence.

Do not treat a local linter pass as AWS validation, and do not treat an AWS size rejection as a template semantic failure. Validate the exact compact bytes that deployment will submit.
