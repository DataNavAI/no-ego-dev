# Private review-system release gates

Use this checklist when an immutable candidate combines a browser review plugin, authenticated API/agent CLI, AWS deployment role, and a product-source migration.

## Exact reviewer input

When the candidate exists only in the index, make it independently inspectable without committing the branch:

1. `tree=$(git write-tree)`
2. Create a dangling snapshot commit with `git commit-tree "$tree" -p HEAD`.
3. Add a detached worktree under a uniquely named non-repository scratch path.
4. Verify `git rev-parse HEAD^{tree}` equals the staged tree and `git status --porcelain` is empty.
5. Give every reviewer the absolute detached path, snapshot commit, and tree. Any correction creates a new tree and invalidates prior verdicts.

This avoids reviewers inspecting the wrong checkout or failing because an unreferenced tree object is unavailable.

## Multi-repository release snapshot gate

Approve and merge the product-source tree first. Pin the resulting canonical merge SHA plus every legacy storage key in the hub manifest, update the hub's immutable source checkout, and regenerate the **tracked** release snapshot before freezing the hub candidate. A scratch build does not satisfy this gate.

From a clean archive of the frozen hub candidate, run the same build/site verifier used by deployment and require:

- tracked shared plugin JS/CSS and authoritative config exist;
- the build manifest lists every shared file and digest;
- config binds the exact merged product SHA and legacy storage keys;
- published product HTML loads the shared plugin and no deleted bespoke assets remain;
- clean-archive verification exits zero.

An implementation review performed before this generated snapshot exists is phase-scoped only; it cannot authorize deployment. Any product merge SHA, manifest pin, generated site file, or shared-asset digest change creates a new hub tree and requires a fresh release-candidate review.

## Lost-response and migration confirmation

An HTTP 2xx is not persistence confirmation. Before clearing a draft/pending migration or writing a receipt, validate:

- exact success-envelope schema and required discriminator (`created` for POST);
- exact returned record schema and legal authoritative status;
- record identity (`mockId`, `commentId`, component/target identity);
- every immutable request field, including source revision, route, text, viewport, and client timestamp;
- migration provenance fields when present.

Malformed or mismatched 2xx responses must leave the byte-identical pending request and raw recovery source intact. Add a regression for `200 {}` and for a successful envelope containing the wrong identity/immutable field.

Build receipt maps with a null prototype or `Map`/`Object.fromEntries`, and assert every original ID is an own serialized property. Ordinary `{}` assignment is unsafe for allowed IDs such as `__proto__`: it can report `migrated: 1`, serialize an empty mapping, and wrongly remove pending state.

Before persisting migration pending state, validate every legacy-derived field against the create API's exact transport contract, not merely the old local schema. Mirror control-character rejection (including newlines), trimmed length bounds, component/ID alphabets, route constraints, and required types. Incompatible records in an otherwise safe batch are counted as skipped and retained in the raw recovery export; they must never enter pending state and permanently stall later records. Keep a parity regression that feeds a newline/control-bearing body through the plugin and proves zero POSTs for that record while valid peers still migrate.

For agent PATCH, classify every post-transmission non-definitive outcome as uncertain: network loss, timeout, malformed 2xx JSON/contract, and 5xx. Perform authoritative readback even when parsing the response fails; only a definitive pre-commit 4xx may bypass uncertainty handling. If readback is unchanged, retry the exact request at most once and always perform final strongly consistent readback.

## Credential destination pinning

Validate the complete destination **before reading credentials**. A clean arbitrary HTTPS origin is insufficient: a hostile origin can imitate a redemption page and receive URL/header credentials. Pin production to the canonical origin. For staging, discover the authoritative origin from the trusted stack/provider control plane, canonicalize it, and accept an explicit override only when it matches exactly; do not treat “non-production” as permission to send stored credentials to any clean HTTPS host. Test that hostile overrides fail before Keychain/environment lookup in both environments.

Install an explicit same-origin redirect policy in the HTTP client. Validate every redirect hop before the library constructs the redirected request so custom agent headers and URL bearer credentials cannot cross origins; checking only the final URL is too late. Preserve the legitimate same-origin access redemption redirect. Add a direct regression proving a cross-origin `302` is rejected before forwarding either credential.

Keep identifier transport aligned across storage, CLI, and API. If the contract preserves IDs from `[A-Za-z0-9._:-]`, keep those characters literal in a path segment or decode once server-side before applying the same closed ID regex. Probe at least `legacy:1`; listed records that cannot be dispositioned are a release blocker.

## CloudFormation privilege ceiling

A runtime permissions boundary does not constrain the CloudFormation execution role itself. Account-wide API Gateway or CloudFront create/update/delete grants let a permitted stack change set target unrelated resource IDs even when stack ARNs are narrow.

Prefer explicit owner/agent and environment separation:

- an authenticated owner bootstraps new topology, applies the fixed runtime permissions boundary, and deliberately performs IAM, API Gateway, CloudFront, DynamoDB, log-group, bucket, edge-auth/token, and teardown mutations;
- use separate staging and production OIDC roles **and separate staging and production CloudFormation execution roles**. Each OIDC role is trusted only by its matching repository environment subject and authorized only for its own bucket, distribution, named stack, change-set prefix, and matching execution role;
- each execution role may mutate only its matching Lambda/function and may `iam:PassRole` only its matching runtime role. A staging role that can update staging Lambda configuration while passing the production runtime role can assign attacker-controlled staging code production data privileges, even when the outer stack/change-set ARNs are isolated;
- treat read permissions as potential secret access. Scope `cloudfront:GetFunction` and `cloudfront:GetDistributionConfig` to the matching environment because edge function code and origin custom headers may contain access/origin secrets; account-wide "read-only" is not harmless. Keep only genuinely non-secret discovery reads wildcarded when AWS does not support narrower resource authorization;
- a workflow-level production gate does **not** compensate for any shared authority whose staging session can write, assume, pass, or read production resources;
- if CloudFormation change-set actions require a change-set ARN, generate explicit environment-prefixed names and scope each role to only `changeSet/<environment-prefix>-*/*`; a shared wildcard change-set ARN can let one environment execute a change set created for another stack even when stack ARNs appear narrow;
- routine GitHub OIDC may pass only a CloudFormation execution role with read-only discovery plus mutation rights for exact already-existing deployable functions/artifacts that CI must update;
- remove topology create/update/delete actions entirely from the CI execution role rather than documenting `Resource: '*'` as unavoidable;
- topology changes must fail closed in CI and be applied by the owner before routine release automation resumes.

Test authorization by slicing each role policy independently: staging text/policy must contain no production subject, bucket, distribution, stack, or change-set prefix, and vice versa. Validate the real template, lint the workflow, and simulate representative allowed and denied actions against actual ARNs when credentials permit.

Keep the runtime permissions boundary so replaceable application code cannot exceed exact DynamoDB, config-object, and log operations. Test both sides: boundary presence on runtime roles, and absence of API Gateway/CloudFront/IAM/DynamoDB/log-group/bucket topology mutation in the CI execution role.

For retained data created by an update, prefer `DeletionPolicy: RetainExceptOnCreate` plus `UpdateReplacePolicy: Retain`: failed first creation cleans up, while a successfully deployed table survives later removal/replacement. Document fail-closed API disablement, complete export, retained resource recording, and CloudFormation resource-import/export recovery before teardown.

## Product CSS handoff

Deleting a bespoke plugin stylesheet can also delete host-product layout rules. Inventory selectors used by surviving product markup before removal, especially wrappers introduced to host semantic review targets. Move host rules into product CSS and verify computed geometry at required viewports, not only no-overflow/axe checks. For a flex rail, measure both wrapper and child widths; a wrapper lacking its old `flex-basis` can shrink cards even when the button still declares a basis.
