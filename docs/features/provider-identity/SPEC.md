# Feature: Provider identity

Status: implemented
Related issue: [#212](https://github.com/DataNavAI/no-ego-dev/issues/212)
Operator setup: [Usage](USAGE.md)

## User outcome and scope

A NED operator can choose which GitHub account, AWS role, or GoDaddy account NED uses. A skill requests a connection through the CLI, and the operator completes it in private COM Settings. This initial release targets native NEDCOM on macOS/Linux. It does not configure commit authorship, change global provider CLI sessions, provision provider accounts, or copy existing IFA grants. Existing profiles that require guarded IFA retain that policy. A Hub-registered standalone container also supports AWS for its authenticated Hub owner. Public tunnels, hosted COM, and other container providers remain outside scope.

GitHub uses a configured device-enabled GitHub App client ID. Its installation and app permissions control repository access. AWS uses IAM Identity Center in the commercial AWS partition with an AWS access portal URL, Identity Center region and explicitly selected assigned account/role. GoDaddy Domains v3 uses a scoped PAT and verifies access to an operator-selected domain through the registered domain detail endpoint. Verification probes do not certify write authority.

## Requirements

- FR-001. `ned identity connect <github|aws|godaddy> --url <private-loopback-COM-origin>` creates an expiring, repeatable request and outputs only a status and COM location. The Settings panel can also request a connection. Exact-origin browser writes and a purpose-specific header are required; public, isolated staging, and hosted modes reject all routes except the owner-only standalone AWS path in FR-006. Local COM trusts its OS account like existing local Settings.
- FR-002. GitHub and AWS use official provider device authorization, honor polling intervals, and validate the returned identity through read-only provider calls. AWS proves the requested account and role are assigned by obtaining temporary role credentials. GoDaddy accepts only a PAT in the private Settings password input and verifies the exact domain. Show the verified identity and require explicit confirmation before replacing any existing connection.
- FR-003. Pending requests expire within ten minutes and disappear on restart. Opaque request IDs bind each approval to the reviewed attempt. Polling, cancel, expiry, stale controls and overlapping requests cannot overwrite an existing connection. Confirmed records use the encrypted vault in a separate namespace inaccessible through generic Secrets API or CLI. Status exposes only provider identity and connection metadata. Disconnect deletes the local connection and identifies the provider as the owner of upstream revocation.
- FR-004. `ned identity exec github -- gh api <relative-endpoint> …` and `ned identity exec aws -- aws …` use the selected connection in an isolated provider CLI environment. `ned identity domain` performs the scoped GoDaddy domain read without exporting a PAT. Unavailable or expired connection fails closed without ambient fallback. GitHub access expires per provider and can be reconnected. AWS can mint short-lived credentials for its stored role while the portal token is valid, and requires reconnection when it expires. No token values appear in NED status, browser responses, process arguments, or logs. An operator invoking a provider CLI remains responsible for the effects of that command.

- FR-005. A pending provider request created during a chat turn appears as a provider-specific action inside a NED message in the conversation when the reply ends. It opens the existing private Settings flow and clears after confirmation or cancellation. Chat text cannot create this action. Once connected, a subsequent explicit chat request can use the confirmed identity.

- FR-006. A Hub-registered standalone container can queue AWS through its local agent CLI. Only the owner-authorized Hub browser transport can view, complete, or disconnect this enrollment. The container provides its own AWS CLI. Other providers, unauthenticated requests, direct browser transport, and the public tunnel cannot use this route.

- FR-007. In authenticated Hub Chat, a supported standalone instance offers Connect AWS in a NED message at the latest end of the conversation while AWS is disconnected or expired. An existing action stays ahead of later turns. Selecting it queues a request and opens the private Settings form even if the assistant has only replied with prose or a link. Opening Chat alone does not queue a request.

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
- Preconditions / fixtures: registered GitHub App, AWS sandbox Identity Center role, and scoped GoDaddy PAT with a test domain. Existing production accounts are out of scope.
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
