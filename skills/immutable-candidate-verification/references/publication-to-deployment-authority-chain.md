# Publication-to-deployment authority chain

Use when reviewed editorial/source data must become a deployable artifact through distinct eligibility, signing, publication, implementation, and environment gates.

## Authority states

Keep these states separate and explicit:

1. **First reviewed** — the record/mapping has one valid enrolled-reviewer receipt; it is not production-authorizing.
2. **Eligible for second review** — an independent, no-edit report verifies exact candidate bytes and returns a narrow eligibility token. This report does not itself publish.
3. **Second reviewed** — a distinct enrolled identity signs the exact reviewed-record envelope only after verifying the eligibility report's exact path, SHA-256, verdict token, candidate identity, and chronology.
4. **Publication approved** — a fresh independent authorizer reviews the complete second-signed private release, evidence closure, registry, release-level receipt, and deterministic public projection. Eligibility is not final publication approval.
5. **Implementation approved** — independent candidate-bound implementation review approves an exact clean commit SHA. Publication approval cannot substitute for implementation approval.
6. **Environment promotion authorized** — protected environment values pin the exact clean `main` SHA and exact product/publication and implementation attestation byte hashes. Only then may OIDC credentials be acquired and mutation begin.

Any missing report, stale digest, wrong token, chronology violation, duplicate reviewer identity, mutable candidate, or absent process exit leaves the next state unauthorized.

## Freeze boundaries

Before each independent review:

- Copy all review inputs to a uniquely named non-repo scratch bundle.
- Include private release bytes, normalized signed records, feasibility mappings, all pinned evidence payloads and manifest, reviewer registry, release-level receipt, compiler/projection code, public release, schemas, and earlier reports referenced by digest.
- Generate a closed manifest with relative paths, byte sizes, and SHA-256 values; record its own external SHA-256 and payload count.
- Make the bundle read-only and run candidate-bound validators with caches/temporary output redirected outside it.
- Do not modify reviewed tooling after a verdict and still call the original report exact-candidate evidence. If a signing/compiler script changes, freeze a new candidate or obtain a fresh review appropriate to the changed trust boundary.

A shared checkout is not a review surface while builds, compilers, or tests may write to it.

## Signed review envelope

Every record-level or release-level receipt should sign a canonical, versioned, closed envelope containing all reviewer-owned assertions:

- registry ID/version and reviewer ID;
- reviewed record class, stable record/release identity, and substantive-record digest;
- outcome and reviewed timestamp;
- evidence/import or private-release digest bindings;
- independent review report digest when that report authorizes the signing stage;
- exact derived counts/check closure where the receipt represents a complete release.

The compiler must verify the signature with an externally pinned active registry key. It must also derive and compare counts, candidate/private-release hashes, report hash syntax/binding, and chronology. A signed receipt that the runtime compiler merely parses—but does not cryptographically verify—is not an operative publication gate.

## Workflow/controller contract

Treat the deployment workflow and release controller as one typed interface:

1. Enumerate the controller's complete required environment contract.
2. Map each workflow variable/secret to the exact controller name; reject aliases such as `STATIC_BUCKET` versus `WEB_BUCKET` unless translated explicitly.
3. Build deterministic web and Lambda artifacts for the requested approved SHA.
4. Generate a closed upload manifest from the emitted files. Each entry must bind bucket class, immutable object key, local path, media type, cache policy, byte count, and SHA-256.
5. Execute the workflow's metadata-extraction snippet locally against real build outputs. Never guess artifact JSON property names; assert them from emitted bytes.
6. Pin product/publication and implementation attestation hashes in protected environment variables and make the controller read and verify both exact files before OIDC or mutation.
7. Require exact environment-scoped role, subject, region, state key, stack/bucket/distribution/domain/certificate settings, DNS provider configuration, and previous-release context.
8. Test hostile missing, renamed, malformed, stale, and rejected-attestation variants before accepting the workflow.

Quality CI remains non-deploying: no OIDC write authority, cloud mutation, deployment secrets, or production environment binding.

## External DNS adapter boundary

Keep DNS provider code behind a small `observeExact` / `upsertExact` interface:

- `observeExact` distinguishes absent, exact-present, and conflicting states without mutation.
- `upsertExact` performs one bounded write and then requires exact readback.
- Derive the relative record name from the configured zone and exact FQDN; reject apex/out-of-zone inputs.
- Require the expected target and credentials from the secret/config boundary, never from candidate-controlled payloads.
- Use a bounded timeout, reject redirects, normalize only harmless trailing dots, and never include authorization headers or credential values in errors.
- Unit-test with injected transport for absent, exact, conflict, write/readback, wrong-zone, timeout/provider failure, and secret-redaction behavior.

## Verification receipt

Before freezing implementation:

- canonical unit/integration suite exits zero;
- full browser matrix exits zero with exact discovered count;
- deterministic build, API smoke, public-boundary checks, upload-manifest generation, workflow lint, shell syntax, CloudFormation parser validation, and pinned `cfn-lint` exit zero;
- workflow metadata extraction runs against actual artifacts;
- `git diff --check` passes and generated transient output is excluded;
- all async reviewer reports are present, hash-verified, candidate-bound, and explicit about their verdict.

Do not summarize a case-count transcript as PASS if the wrapper exits nonzero, and do not let a later successful command mask an earlier validator failure; capture individual statuses or use fail-fast execution.