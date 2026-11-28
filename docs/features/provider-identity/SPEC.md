# Feature: Provider identity

Status: implemented
Related issue: [#212](https://github.com/DataNavAI/no-ego-dev/issues/212)
Operator setup: [Usage](USAGE.md)

## User outcome and scope

A NED operator can choose which GitHub account, AWS role, or GoDaddy account NED uses. A skill requests a connection through the CLI, and the operator completes it in private COM Settings. This initial release targets native NEDCOM on macOS/Linux. It does not configure commit authorship, change global provider CLI sessions, provision provider accounts, or copy existing IFA grants. Existing profiles that require guarded IFA retain that policy. A Hub-registered standalone container also supports GitHub and AWS for its authenticated Hub owner. Public tunnels, hosted COM, and other container providers remain outside scope.

GitHub defaults to NED’s isolated official gh CLI login; no separate App/client ID is needed. An explicitly configured legacy GitHub App remains compatible. Repository permission is verified separately from login. AWS uses IAM Identity Center in the commercial AWS partition with an AWS access portal URL, Identity Center region and explicitly selected assigned account/role. GoDaddy Domains v3 uses a scoped PAT and verifies access to an operator-selected domain through the registered domain detail endpoint. Verification probes do not certify write authority.

## Requirements

- FR-001. `ned identity connect <github|aws|godaddy> --url <private-loopback-COM-origin>` creates an expiring, repeatable request and outputs only a status and COM location. The Settings panel can also request a connection. Exact-origin browser writes and a purpose-specific header are required; public, isolated staging, and hosted modes reject all routes except the owner-only standalone GitHub/AWS paths in FR-006. Local COM trusts its OS account like existing local Settings.
- FR-002. GitHub and AWS use official provider device authorization, honor polling intervals, and validate the returned identity through read-only provider calls. AWS proves the requested account and role are assigned by obtaining temporary role credentials. GoDaddy accepts only a PAT in the private Settings password input and verifies the exact domain. Show the verified identity and require explicit confirmation before replacing any existing connection.
- FR-003. Pending requests expire within ten minutes and disappear on restart. Opaque request IDs bind each approval to the reviewed attempt. Polling, cancel, expiry, stale controls and overlapping requests cannot overwrite an existing connection. Confirmed records use the encrypted vault in a separate namespace inaccessible through generic Secrets API or CLI. Status exposes only provider identity and connection metadata. Disconnect deletes the local connection and identifies the provider as the owner of upstream revocation.
- FR-004. `ned identity exec github -- gh api <relative-endpoint> …` and `ned identity exec aws -- aws …` use the selected connection in an isolated provider CLI environment. `ned identity domain` performs the scoped GoDaddy domain read without exporting a PAT. Unavailable or expired connection fails closed without ambient fallback. GitHub access expires per provider and can be reconnected. AWS can mint short-lived credentials for its stored role while the portal token is valid, and requires reconnection when it expires. No token values appear in NED status, browser responses, process arguments, or logs. An operator invoking a provider CLI remains responsible for the effects of that command.

- FR-005. A pending provider request created during a chat turn appears as a provider-specific action inside a NED message in the conversation when the reply ends. It opens the existing private Settings flow and clears after confirmation or cancellation. Chat text cannot create this action. Once connected, a subsequent explicit chat request can use the confirmed identity.

- FR-006. A Hub-registered standalone container can queue GitHub or AWS through its local agent CLI. Only the owner-authorized Hub browser transport can view, complete, or disconnect this enrollment. The container provides its own gh and AWS CLI. GoDaddy, unauthenticated requests, direct browser transport, and the public tunnel cannot use this route.

- FR-007. In owner-authenticated Hub Chat, Message options offers Connect AWS and Connect GitHub when the respective provider needs a connection. Opening Chat alone does not queue a request. Each shortcut queues only its named provider; GitHub opens the existing private GitHub modal directly, while AWS retains its existing private Settings flow. Existing pending requests are reused and connected controls hide. A failed GitHub shortcut reports a GitHub-specific unavailable state.


- FR-008. The Hermes `ned` tool action `request_provider_auth` queues a provider request and returns a non-secret request receipt. NED renders a conversation card only for a validated native tool result. The card opens an accessible modal after checking that its request still matches the authenticated instance. Stale cards never act on newer requests. Manual Settings remains available.

## Critical user journeys

### CUJ-001: Connect and use a chosen identity

From a private native COM instance, a skill invokes the CLI. The operator opens the provider connection from Chat or Settings, completes the provider-specific flow, checks the displayed identity, and confirms. A subsequent explicit call uses that connection. If provider setup, credentials or account access fails, the previous connection stays usable. This is critical because existing shell accounts may be owned by a different person.

### CUJ-002: Decline, retry and disconnect

Starting from a pending request or a connected account, the operator can cancel a grant, reject a mismatched account, retry an expired request, or disconnect an existing connection. Later requests cannot resurrect canceled access, and another instance cannot read it. This is critical to preserve owner control.

## Detailed test cases

### TC-001: Private request, verify, confirm, and use

- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-004
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js)
- Preconditions / fixtures: disposable homes, real local COM server, synthetic provider responses and fake CLI, empty vault and injected clock.
- Given: each provider issues a valid response for a selected login, account/role or domain.
- When: start through CLI, approve through Settings API, confirm the resulting identity, then exercise the selected connection.
- Then: public responses contain identity metadata and no credential; the isolated vault survives server restart; use receives only the selected identity; generic Secrets remains empty.
- Variants / negative cases: wrong Origin, disabled mode, unknown provider, concurrent poll/cancel, expired request, mismatched identity, duplicate start, isolated second home, disconnected or expired use.
- Cleanup: close servers and delete only disposable homes and fixtures.
- Pass evidence: named assertions in the linked case, including proof rejected requests do not mutate state.

### TC-002: Owner controls in COM

- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-003
- Level / automation: manual; run local COM on loopback with a disposable home and provider credentials authorized for testing.
- Preconditions / fixtures: installed gh (or explicitly configured legacy GitHub App), AWS sandbox Identity Center role, and scoped GoDaddy PAT with a test domain. Existing production accounts are out of scope.
- Given: the operator opens Settings → Provider connections.
- When: complete GitHub sign-in, AWS sign-in with selected role, and GoDaddy domain check, cancel one attempted replacement, then disconnect each connection.
- Then: verify account identifiers before save, the PAT field clears after submission, cancellation preserves the old connection, and local disconnect removes status and disables subsequent use. Refresh and verify confirmed records remain until disconnected.
- Variants / negative cases: reject a wrong account at confirmation; try an expired code and invalid PAT; check mobile layout and keyboard operation; public and cross-origin defenses are covered by TC-001.
- Cleanup: revoke the test GitHub authorization and GoDaddy PAT at the providers, end the AWS session as appropriate, and delete the disposable NED home.
- Pass evidence: redacted screenshot and provider-use status for each path. Never record sign-in codes or PATs.

### TC-004: Private Settings in Chromium

- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-003
- Level / automation: end-to-end; [TC-004.test.js](tests/TC-004.test.js)
- Preconditions / fixtures: disposable native COM home, Chromium, fake GitHub and GoDaddy replies, 390px viewport.
- Given: a GitHub request created by the CLI and an empty GoDaddy connection.
- When: open Settings, complete and confirm GitHub, verify a GoDaddy form using a synthetic PAT, cancel or disconnect, and reopen.
- Then: user actions reach real HTTP routes, no secret is rendered after submission, no horizontal overflow appears, and confirmed status matches the vault readback.
- Variants / negative cases: decline a replacement before confirming, confirm disconnect, and render an unavailable private connection surface without revealing controls. AWS protocol and wrong-account paths use TC-001.
- Cleanup: close the browser and local COM, then delete only the disposable home.
- Pass evidence: named browser assertions and zero page errors.

### TC-003: Skill requests consent without exposing credentials

- Journey / requirements: CUJ-001 / FR-001, FR-004
- Level / automation: manual; [skill eval](../../../skills/ned-provider-identity/EVAL.yaml)
- Preconditions / fixtures: synthetic request fixture and no provider access.
- Given: a user must select an identity for a provider operation.
- When: simulate the new skill across the fixture cases.
- Then: correct CLI/provider flow and account verification, no token in chat, and no bypass of existing profile policy.
- Variants / negative cases: missing COM URL, unsupported hosted surface, mismatched identity and existing guarded policy.
- Cleanup: no real provider or account changes.
- Pass evidence: synthetic transcript meeting all eval expectations.

### TC-005: Chat request reaches a protected mock provider after owner approval

- Journey / requirements: CUJ-001 / FR-001–FR-005
- Level / automation: end-to-end; [TC-005.test.js](tests/TC-005.test.js)
- Preconditions / fixtures: disposable Chromium/COM home, empty provider vault, deterministic chat agent, and a separate loopback GoDaddy-shaped service.
- Given: the mock service rejects reads until it has issued a token and the user has confirmed the requested domain in NED.
- When: ask Chat to read the domain, follow the Chat connection action to Settings, issue a token in the mock service UI, confirm it in NED, return to Chat, and retry the request.
- Then: before approval the CLI fails closed and no protected provider request occurs. The browser shows the trusted connection action, both user approvals are required, and the second chat reply contains the domain returned by the actual authenticated HTTP call. The token never appears in chat history. A prose-only mention of connecting has no effect on the control.
- Variants / negative cases: missing or incorrect browser Origin and cross-instance isolation are covered by TC-001. Live provider consent is covered separately by TC-002.
- Cleanup: close the browser and both servers, then remove the test home.
- Pass evidence: the browser transcript, CLI status, and mock provider’s authorization/read counters agree.

### TC-006: Standalone AWS through the Hub boundary

- Journey / requirements: CUJ-001, CUJ-002 / FR-002–FR-007.
- Level / automation: integration; [TC-006.test.js](tests/TC-006.test.js).
- Preconditions: disposable container adapter and credential home, authenticated Hub protocol fixture, synthetic AWS device and protected-resource endpoints.
- Given: an owner opens Chat through the Hub bridge. When the agent queues AWS and the owner approves the assigned role, then Chat shows Connect AWS inside a NED message in the transcript, removes the action after connection, and a retry uses the bound identity.
- Variants: an assistant link alone does not queue enrollment, but the owner can open the form from Chat. Reject anonymous and cross-account requests at ingress, reject direct browser actions, and leave other providers unavailable.
- Cleanup: close the listeners, browser and fake provider, and remove fixture state.
- Pass evidence: automated browser scenario and authorization boundary assertions.

### TC-007: Hermes provider card and modal

- Journey / requirements: CUJ-001, CUJ-002 / FR-008.
- Level / automation: integration; [TC-007.test.js](tests/TC-007.test.js).
- Given: an authorized runtime and a synthetic provider, when the registered Hermes tool successfully queues a request, then its receipt renders a card and the card opens the private modal. Assistant prose cannot create the card.
- Variants: reject unrecognized actions or provider names and stale request receipts. Closing the dialog preserves the request and returns focus to its trigger.
- Cleanup: dismiss the modal and dispose of browser, gateway and synthetic runtime state.

## Coverage and acceptance

| Requirement | Journey | Test cases |
| --- | --- | --- |
| FR-001, FR-002, FR-003 | CUJ-001, CUJ-002 | TC-001, TC-002, TC-003, TC-004 |
| FR-004 | CUJ-001, CUJ-002 | TC-001, TC-003, TC-005 |
| FR-005 | CUJ-001 | TC-005, TC-006 |
| FR-006, FR-007 | CUJ-001, CUJ-002 | TC-006 |
| FR-008 | CUJ-001, CUJ-002 | TC-007 |

## Open questions and coverage gaps

Hosted ownership and rollout, live consent, upstream revocation, provider-side permissions, and handling of organizations that do not use IAM Identity Center need separate acceptance. No privilege elevation, global credential import or AWS permanent-key fallback is introduced.

## Mobile authorization presentation (#256/257)
Communicator FR-091/092 and [mobile design](../communicator/design/mobile-organization/README.md) govern the presentation. Idle AWS initiation is in Message options and Settings, not an unrequested transcript item. Trusted receipt cards are hydrated from authenticated identity status; ordinary prose cannot supply a trusted card. Match the exact current request ID before showing its code/link; ended/expired/unavailable requests hide stale code/actions and offer review/status recovery. Connected identity is shown only from the API. Copy reports actual clipboard success/failure. Keep explicit identity confirmation and cancellation. AWS CLI console-login execution remains owned by #249.

TC-007 additionally uses a synthetic browser-routed identity response and canonical tool receipt: pending sign-in → unavailable → expired → connected. Assert exact link/code, truthful Copy, hidden stale actions, one card without a duplicate global prompt, idle initiation in options, and zero POST mutations merely from refresh/navigation. Cleanup is the existing temporary browser/server/home fixture; no real grant or model calls. Existing TC-006 continues to verify the real protected API/Hub/confirmation flow.

Current request deadlines schedule a status refresh (and clear the expiring card/modal actions while checking); returning to the visible tab refreshes status too. No countdown or successful connection is inferred. TC-007 captures and triggers the request-deadline timer in the synthetic browser, advances the authoritative fixture to expired, and asserts stale links disappear with no POSTs. Timers are cancelled on access loss/page exit. Server clocks that differ from the browser remain authoritative through readback; past timestamps alone do not override a still-active API request.

At200% text the supplied short code remains a readable line; code/Copy and secondary controls wrap to separate rows when needed. TC-007 asserts bounded short-code height at320px and captures the large-text state. Primary visible link is “Open AWS” (or provider name) with its full sign-in accessible name.

## Expired authorization recovery (#281)

- FR-009. A trusted provider card and open dialog show an expired state when the authoritative request ends at its deadline or the provider reports expiry. Clear stale links, code fields, and confirmation actions. Apply the same compact card typography and recovery flow to AWS, GitHub, and GoDaddy.
- FR-010. Start new sign-in sends one provider-specific user turn through the normal chat transport. It carries no previous code, authorization link, draft, attachments, or task references. An unavailable composer leaves the user on the recovery surface with feedback. The agent can then queue a fresh authorization.
- CUJ-004. The operator leaves a provider connection open until expiry, then starts a new sign-in from the dialog or transcript card.
- Existing browser case TC-007 covers expired cards, a stale open dialog, provider-reported expiry, and the real chat transport. Assert no browser write to the identity API on restart and preserve existing draft text.


## Provider-specific failed requests (#297)
- FR-011. A validated native `ned` tool failure for `request_provider_auth` preserves the requested provider in a four-field receipt: `success:false`, action, provider and `error:provider_auth_unavailable`. Project only this allowlisted shape; extra fields, unknown providers and prose cannot create a failure card. Render a historical failed-attempt card using that provider name, without a request ID, code, link, confirmation or substitution of another provider. Copy: “GitHub connection could not start” (substitute the provider), “Ask NED to check GitHub connection support on this instance.” and “Try GitHub again”. Retry sends the existing provider-specific normal chat turn and retains draft/media/references; an unready chat shows existing readiness feedback. It never writes the identity API directly.
- FR-012. Recognized legacy approval links are labeled from the actual HTTPS destination, regardless of misleading Markdown labels. Keep AWS links AWS. Label exact `github.com/login/device` links “Open GitHub sign-in”; reject lookalike hosts, credentials, custom ports and unrelated GitHub paths. Ordinary prose never grants a trusted connection or selects an account.
- FR-013. Canonical SOUL guidance requires a native request for the exact provider before asking for authorization, separate provider states/actions when several are needed, no codes/URLs/tokens in prose, and truthful capability failures without substituting another provider. Existing private/owner permission boundaries remain intact; default GitHub enrollment uses gh without App setup. Instruction loading is not proof of deterministic model compliance.

### TC-008: Requested-provider failure, mixed legacy links and retry
- Journey / requirements: CUJ-001, CUJ-002 / FR-008, FR-011–013.
- Level / automation: manual; visual/guidance acceptance with automated supporting variants in [existing TC-007.test.js](tests/TC-007.test.js) and parser/URL unit variants in [communicator TC-013](../communicator/tests/TC-013.test.js). Guidance/runtime loading and pixel inspection are manual supporting acceptance, not code tests of prose.
- Preconditions: disposable browserChat/home; actual registered Python plugin and Node CLI; unavailable native tool runtime; synthetic GitHub/AWS legacy links; no real grant/client/token.
- Given: a GitHub request fails while unrelated AWS enrollment exists as a capability.
- When: the registered tool returns a failure, the browser renders mixed-provider text, and the user selects Try GitHub again.
- Then: the allowlisted failure stays GitHub through the history projection and renderer, no AWS card/action substitutes for it, AWS URLs retain AWS labels and GitHub device URLs retain GitHub labels. Retry input is exactly `Start a new GitHub sign-in.`, existing draft remains, and browser identity POST count is zero. Existing native GitHub/AWS/GoDaddy request/modal/expiry tests retain exact request binding.
- Steps: run `node --test docs/features/provider-identity/tests/TC-007.test.js docs/features/communicator/tests/TC-013.test.js`; assert named cases, provider/text/URL mappings, retries and0 console errors. Inspect synthetic failed GitHub card at desktop and320/390 mobile using existing provider card design; retain only synthetic screenshots. Review/load the exact canonical Provider connection requests section through native/container Hermes after scoped deployment, preserving persona, plugin config and private backups.
- Variants / negative cases: assistant-spoofed JSON, non-ned tools, unknown providers, extra payload fields, wrong HTTPS hosts/paths/ports and failed/unready transport cannot forge grants or switch provider. Unavailable GitHub remains unavailable, not an invented successful connection. Existing CUJ cases cover cancel, expiry, auth loss, native/Hub isolation and concurrency; no new external provider capability is added.
- Cleanup / evidence: close disposable fixture resources; remove only test-owned state. Keep runtime backups/evidence outside distribution. Pass requires automated assertions plus inspected synthetic pixels and actual prompt/plugin deployment readbacks; live model compliance/provider grants are not claimed.

Coverage: FR-011–012 → CUJ-001/002 → TC-008 (TC-007/communicator TC-013 implementations); FR-013 → CUJ-001/002 → TC-008 manual guidance review/loading. [UI guidance](UI.md).

## GitHub CLI connection (#300)
- FR-014. With no explicitly configured legacy GitHub App, GitHub connection wraps installed `gh auth login --hostname github.com --git-protocol https --web --insecure-storage --skip-ssh-key` in a private per-attempt HOME/GH_CONFIG_DIR. No user-supplied app/client ID is required. Environment allowlisting excludes ambient GitHub tokens/config/keyring/SSH authority. Noninteractive official device prompts yield only the exact GitHub device URL and code through authenticated private request status; raw terminal output is bounded and never logged, exposed to chat or persisted.
- FR-015. `gh` remains responsible for authorization polling. NED verifies the approved account with `gh api user`, matches the requested username, privately obtains the token using `gh auth token`, then deletes transient CLI config. Candidate credentials remain memory-only until explicit confirmation saves the encrypted vault. Previous connection remains usable until confirmed replacement. Account verification does not establish repository permissions. Explicitly configured legacy GitHub App adapters remain compatible.
- FR-016. Startup/output/command/lifetime bounds fail closed. Cancel, expiry, shutdown, mismatched identity and stale completion cannot save a candidate or alter ambient credentials. Terminate owned subprocesses and remove owned per-attempt config; startup reclaims only abandoned owned workspaces, retaining unknown/active paths. Pending or cleanup work blocks maintenance. Disconnect removes NED's local credential; upstream revocation remains provider-owned.
- FR-017. Owner-authenticated Hub standalone instances support GitHub and AWS enrollment, with GitHub routed to this CLI wrapper; GoDaddy and public/other-owner browser writes remain denied. The local CLI can queue GitHub and obtain only the normal non-secret receipt. The image supplies pinned official multi-architecture gh with verified release checksum, documented tool inventory and credential-free actual-image auth/config probe. No enrollment starts merely from rendering.

### TC-009: Isolated GitHub CLI process lifecycle
- Journey / requirements: CUJ-001, CUJ-002 / FR-014–017.
- Level / automation: integration; [TC-009.test.js](tests/TC-009.test.js), synthetic executable fixture under tests. Existing TC-006 owns real Hub-owner transport and denied direct/public routes; TC-004 retains legacy App compatibility; TC-007 owns cards/modal/retry. Container tool acceptance owns installed binary/config behavior.
- Preconditions / fixtures: disposable profile, real spawned Node executable emulating fixed gh commands and split output, synthetic approval/denial control, no provider credentials/network. Parent includes synthetic ambient token/config sentinels.
- Given: no GitHub App configured and an existing confirmed connection where relevant.
- When: start, expose device status privately, approve, verify identity/token, confirm; separately cancel during startup/poll, expire, fail/oversize output, mismatch identity, close, restart after abandoned workspace, and attempt concurrent/stale completion.
- Then: exact gh argv and private environment are observed; no ambient sentinels or raw output leak; only GitHub URL/code are public device fields, token only enters candidate/vault after verification/confirmation; prior credential survives declined/stale paths; all owned children/config are cleaned and maintenance remains busy through cleanup. Missing executable and malformed device URI/output fail generically without provider substitution.
- Steps: run `node --test docs/features/provider-identity/tests/TC-009.test.js` and TC-001/004/006/007/communicatorTC-013; inspect named assertions, cleanup, ownership and denied-route checks. Actual-image offline suite must exercise installed gh and pass native ARM64/AMD64 CI before merge.
- Variants / negative cases: split code/URL lines, unknown or evil URL, missing gh, canceled/replaced request, wrong username, nonzero subprocess, bounded output and startup/lifetime, missing/old workspace marker, active versus dead owner, retry and repeat-use. No production login, live role change or GitHub App setup.
- Cleanup / pass evidence: terminate/wait owned fixture children and delete only test-owned files via teardown; assertions plus redacted synthetic browser/device-card screenshots. Real GitHub consent is separate manual acceptance below, not inferred from fake CLI success.

### TC-010: Real GitHub CLI approval (operator-authorized)
- Journey / requirements: CUJ-001, CUJ-002 / FR-014–017.
- Level / automation: manual; authorized test account/repository only. Not run without the operator approving a real provider grant.
- Preconditions: installed gh, private native or owner-authorized Hub NED, disposable/sandbox account authorization, no ambient account adoption.
- Given: NED queues GitHub and the operator reviews the GitHub card.
- When: enter intended username, open GitHub, approve the device code privately, check approval, compare verified identity and confirm. Exercise `ned identity exec github -- gh api user` and a separately authorized repository read. Repeat with decline/cancel/expired code and disconnect.
- Then: only the selected account is used; no codes/tokens enter chat/logs; account confirmation precedes local replacement; repository denial remains truthful; ambient gh sessions remain unchanged. Disconnect clears local access while provider revocation remains explicit.
- Cleanup: revoke sandbox grant at GitHub, disconnect NED and remove only disposable test state. Preserve unrelated runtime/user configuration and private backups.
- Pass evidence: redacted status/identity and consent observation; no tokens/codes in captures. Report NOT RUN until actually executed; instruction loading and offline tests are not a live OAuth pass.

Coverage: FR-014–016 → CUJ-001/002 → TC-009 plus TC-010 manual; FR-017 → CUJ-001/002 → TC-006/009 and standalone-container TC-009 actual-image tools. This supersedes the earlier AWS-only Hub and required-App setup statements for the default GitHub path; GoDaddy remains native-only. [CLI contract sources](https://cli.github.com/manual/gh_auth_login), [pinned noninteractive implementation](https://github.com/cli/cli/blob/v2.88.1/internal/authflow/flow.go).

UI update (#309): the Settings workspace is removed. Manual provider management is a private Connections dialog in Chat → Message options → Connections. Trusted connection cards retain their dedicated provider dialogs. Existing TC-004 covers manager enrollment/confirmation/disconnect and sensitive input clearing; TC-007/009 retain card/shortcut routes. AWS shortcut opens its dedicated private provider dialog, matching GitHub. No identity or transport permissions change.
