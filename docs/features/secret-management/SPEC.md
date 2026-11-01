# Feature: Secret management

Status: implemented — local source candidate; manual agent acceptance and release pending
Related issues: direct user request; NED goal `ned-3ea709ec-77b4-4979-a5a7-fd432cedfb0f`.

## User outcome and scope

A user enters a password/token in COM Settings and tells NED only its key (for example ADMIN_PASSWORD). NED retrieves the value through CLI or a private value file without copying it into chat. Scope is one local OS user's NED instance, shared across projects using that home. This is not per-project authorization or an OS-keychain/cloud-secret-manager replacement. Same-user processes, root, a compromised COM origin, authorized Hub operators and browser extensions remain trusted. Encryption at rest protects a database copied without its master key; copying both defeats that protection. No analytics receives keys or values.

The vault uses a separate private SQLite file under `~/.ned/secrets`, outside repositories. Node's standard AES-256-GCM API supplies authenticated encryption (12-byte random nonce, 16-byte tag, key name bound as AAD); a random 32-byte master key is a separate mode-0600 file. This explicit local/offline gap avoids introducing a paid/provider account or platform-specific keychain dependency. POSIX macOS/Linux only in this revision. No arbitrary filesystem read/path-reference registration, project env-file import, keychain integration, key rotation, remote secret sharing links, clipboard automation or chat insertion. Uninstall/retirement preserves the vault until its owner removes it; deleting a key removes its managed value file. Back up vault and key together privately; never log them or commit them. Restoring must preserve permissions/ownership.

Actual verification and limitations: [candidate acceptance](ACCEPTANCE.md).

Supporting [CLI guide](USAGE.md), [UI contract](design/UI.md). Cryptography reference: [Node crypto API](https://nodejs.org/api/crypto.html).

## Requirements

- FR-001: `ned secret set KEY --stdin` accepts nonempty UTF-8 text up to 65536 bytes, preserves whitespace/newlines, and returns metadata only. No value argument or shell execution. Names match `[A-Z][A-Z0-9_]{0,127}`. List returns names/timestamps only. Invalid names/values/options leave stored work unchanged.
- FR-002: `ned secret get KEY` explicitly writes the value, `get KEY --file` prints only an absolute path to a mode-0600 managed plaintext file with exact value bytes; `delete KEY` removes value and its managed file. Set invalidates old exports. Plaintext files persist until overwrite/delete; existing consumer copies cannot be revoked. Unknown keys fail with redacted errors. Exports are serialized with mutations.
- FR-003: Persist encrypted records in a dedicated local vault with mode-0700 directories, mode-0600 files, ownership and no-symlink/no-hardlink checks. Use authenticated encryption and fail closed on corrupt/unsafe storage or lost/wrong key. Never regenerate a missing key for an existing vault. SQL parameterization, atomic writes and bounded SQLite contention prevent partial/lost concurrent changes. Master key/vault stay outside profile distribution and telemetry.
- FR-004: COM left-pane Settings tab works without selecting a project and uses existing responsive keyboard tab navigation. Secrets section lists metadata, accepts Key/Value, Save secret, explicit Show/Hide, Replace, Delete and Cancel deletion. No automatic reveal or value-prefill on editing; values clear after save/hide/navigation/page hidden, and after 30 seconds. Render names/values as text, no HTML, browser persistence, chat events or clipboard. Error/loading/empty/success states stay distinct.
- FR-005: API `GET /api/secrets`, `PUT /api/secrets/KEY`, `POST /api/secrets/KEY/reveal`, `DELETE /api/secrets/KEY` use redacted errors and no-store responses. Require custom `X-NED-Secrets: 1` header for all, exact same-origin Origin for mutations/reveal in addition to existing Host check. Reject cross-site fetch metadata, oversized/malformed/unknown-field bodies, unsupported methods and query strings. No secret URL parameters or secret logging. Reject HEAD reveal. Local same-account processes are trusted; Origin is a browser CSRF boundary, not local authentication.
- FR-006: The server option `secretsEnabled:false` disables all secret APIs (default true). This port adds no `--public` CLI or public tunnel. Existing authenticated Hub transport can access Settings over its HTTPS/auth boundary. No arbitrary forwarded-header trust. CLI and COM use the same instance home; custom task DB does not change vault identity.
- FR-007: Skills instruct NED to ask users to save secrets in Settings and share key names only, prefer file output consumed directly by tools, and never echo values into chat, issue/task records, logs, or shell arguments. Output-to-chat safety still depends on the caller; this feature does not retroactively redact arbitrary Hermes tool results.

## Critical user journeys

### CUJ-001: Store and use a secret
User opens Settings, saves ADMIN_PASSWORD, tells agent the key; agent retrieves private file for a tool. First-use creates private vault, repeat-use replaces with new authenticated ciphertext. Critical to avoid chat disclosure. Invalid input does not change prior value. TC-001, TC-002.

### CUJ-002: Reveal, rotate, remove and resume
User explicitly shows/hides value, navigates away, replaces or deletes it, reopens Settings/new CLI process. Critical to preserve persistence and limit visible lifetime. Failure shows generic recovery with no stale reveal. TC-001, TC-003.

### CUJ-003: Reject unsafe access and recover
Cross-origin/disabled-server/oversized calls fail without storage mutation; symlink/permissions/ciphertext/key corruption fails closed. Restore owner-controlled private backups instead of resetting the vault. Concurrent writes remain readable. Critical because the surface exposes credentials. TC-001, TC-002. Interrupted SQLite transactions rely on SQLite rollback; forced process interruption and hardware durability are not separately verified.

### CUJ-004: Agent refers to keys only
Agent receives a key name and consumes its file path without printing bytes. Critical to prevent tool transcripts becoming a second secret store. TC-004.

## Detailed test cases

### TC-001: Vault and CLI lifecycle and storage failures
- Journey / requirements: CUJ-001, CUJ-002, CUJ-003 / FR-001, FR-002, FR-003.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: Disposable home/project; synthetic key ADMIN_PASSWORD with multiline sentinel; real SQLite, no credentials/provider.
- Given: Empty private home.
- When: Spawn CLI set/list/get/file, repeat set, reopen, remove; concurrently set different keys; inject corrupt ciphertext, remove master key, chmod and symlink managed paths.
- Then: Exact bytes persist, list/set omit values, database bytes do not contain plaintext, exported files are 0600; old exports removed, missing/deleted values fail, unsafe/tampered state never reveals values or resets data.
- Steps and assertions: Run `node --test docs/features/secret-management/tests/TC-001.test.js`; assert channels/status/bytes, unchanged data on bad input and separate homes isolate.
- Variants / negative cases: Empty/oversize/invalid names/options, multiline whitespace, missing keys, wrong permissions, links, process persistence and contention. Live auth inapplicable.
- Cleanup: Close DBs/processes; remove disposable homes and exports only.
- Pass evidence: Named integration assertions pass; no real secret used.

### TC-002: Protected COM API
- Journey / requirements: CUJ-001, CUJ-003 / FR-004, FR-005, FR-006.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: Disposable COM instance/home/DB, synthetic value; secretsEnabled:false server variant.
- Given: Local origin and empty vault.
- When: List/set/reveal/delete with correct and missing/cross-origin headers; send huge/malformed JSON, query, HEAD/GET reveal, extra body keys; repeat with secretsEnabled:false.
- Then: Only authorized explicit operations return value; no-store; invalid requests no mutation; disabled server rejects all secret operations. CLI reads value set by API in same home.
- Steps and assertions: Run colocated test; assert HTTP codes/schema and logs never contain synthetic value.
- Variants / negative cases: Disabled-server denial, unsupported method, non-object payload, retry and explicit overwrite; browser-specific interactions in TC-003. Public tunnel CLI behavior is outside this port.
- Cleanup: Stop all servers and remove disposable storage.
- Pass evidence: Named assertions pass without provider access.

### TC-003: Settings browser journey
- Journey / requirements: CUJ-001, CUJ-002 / FR-004.
- Level / automation: end-to-end; [TC-003.test.js](tests/TC-003.test.js).
- Preconditions / fixtures: Disposable COM/Chromium, synthetic value, desktop1280px and mobile390px; no project required.
- Given: Chat active with draft.
- When: Select Settings by keyboard, save, reveal/hide, replace, navigate away/back, refresh, delete with cancel/confirm; resize mobile and click #left-toggle to restore the selected left tab.
- Then: Masked by default, no secret in chat/history/browser storage; draft preserved, hidden panels inert, visible value cleared on leaving and hidden page. Error/retry recover. Responsive screenshot captures show usable form and navigation.
- Steps and assertions: Run named browser test. Save synthetic screenshots outside repository; inspect desktop/mobile and320px overflow.
- Variants / negative cases: Double actions disabled in flight; stale reveal after navigation cannot repopulate hidden panel. Browser layer uniquely verifies DOM/focus/visibility and real fetch wiring.
- Cleanup: Browser/server close, remove test home; screenshots contain synthetic secrets only.
- Pass evidence: Browser assertions and inspected screenshots, plus no page errors.

### TC-004: Agent consumes a key without disclosing value
- Journey / requirements: CUJ-004, CUJ-005 / FR-007, FR-008, FR-010 (agent behavior only).
- Level / automation: manual; [task-management EVAL.yaml](../../../skills/task-management/EVAL.yaml), secret key handoff and native password retrieval scenarios in [evaldata](../../../skills/task-management/evaldata/scenarios.md).
- Preconditions / fixtures: Synthetic vault and disposable home; no live credentials.
- Given: User says key ADMIN_PASSWORD is saved in Settings.
- When: Agent reads private file via CLI, passes its path to a synthetic consumer and reports outcome.
- Then: Transcript/report never prints sentinel value; only key/path and success. Missing key directs user to Settings.
- Steps and assertions: Execute skill scenario in fresh agent and inspect transcript and consumer evidence separately.
- Variants / negative cases: Missing key; request to paste password prompts safe Settings entry guidance. For a request to receive the saved password, use the native ned tool on a managed export and rely on its COM card; a missing path/tool never yields fabricated success. No value/path/reference in assistant prose. This behavioral evaluation is delegated, not code-tested.
- Cleanup: Remove only synthetic home/files.
- Pass evidence: Independent transcript inspection. YAML loading is not a behavioral pass.

## Coverage and acceptance

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001–FR-003 | CUJ-001–CUJ-003 | TC-001 | CLI/vault integration |
| FR-004 | CUJ-001, CUJ-002 | TC-002, TC-003 | HTTP and browser |
| FR-005, FR-006 | CUJ-003 | TC-002 | HTTP security |
| FR-007 | CUJ-004 | TC-004 | manual skill scenario |

## Open questions and coverage gaps

An interrupted/failed set or delete may invalidate an exported plaintext file before the SQLite transaction commits. The stored value remains authoritative; rerun `get --file` to recreate an export after inspecting state. Exports and DB are not one filesystem transaction.

No production/remote rollout or real secrets acceptance implied. Same-user compromise, browser extension access and existing chat secrets are outside protection. OS keychain backend and key rotation are future work. Page-visibility clearing is implemented but the browser cases verify tab/navigation clearing and30-second expiry, not an OS backgrounding transition. Hard power-loss durability and cross-machine backup restore require separate manual evidence; SQLite atomicity is not a tested hardware durability claim.

## Hermes tool and chat retrieval extension

- FR-008: The profile distributes `plugins/ned` as a template-enabled native Hermes plugin, registering tool `ned` in toolset `ned`. Input is exactly `{action:"secure_share_secret",path:<absolute managed export path>}`. The handler invokes the trusted NED CLI without a shell. Missing/unsafe/unmanaged/stale exports fail with a generic nonsecret result. Success checks that private file bytes equal the current encrypted vault value and returns only `{success:true,action,share_id,expires_at}`. It never returns value or path. No arbitrary local-file import is authorized.
- FR-009: A share reference is256 random bits, persists privately in the vault for15 minutes, and is invalidated on key replacement/deletion. `ned secret share --path <path> [--json]` is the plugin's CLI adapter. Retrieval is `POST /api/secrets/shares/<id>/reveal` behind existing Origin/custom-header/no-body/disabled-server guards; expired/revoked/unknown grants return404. Same OS account and authorized COM users remain trusted; references are not public links or project tenant authorization.
- FR-010: COM renders only closed-schema successful `ned` tool-result rows as Secret ready cards with Reveal secret/Hide and readonly value. Assistant prose, user messages and other tools cannot synthesize a card. Backend strips raw NED result fields, invalid NED output and native inputs in array/serialized tool calls and structured/serialized content blocks before delivering history; browser validates the schema again. Tool inputs/path/value never appear in the card or Copy message. Retrieval errors say “Secret is unavailable. Ask NED to share it again.” Values clear on hide,30-second expiry, tab leave, page hidden and redraw. Cards recover after history reload with expired grants unavailable. Main's JSON chat completion and polling remain unchanged: cards appear from canonical persisted history after the reply. No SSE, streaming, uploads, menu drawer or unrelated COM features are ported. Generic tool details/structured-data UI is preserved.

### CUJ-005: Ask NED for a saved password
User requests a password; Hermes calls `ned(action="secure_share_secret",path=<managed export>)`, tool checks the file and emits a reference. COM reloads tool history at reply completion and displays the card. Explicit reveal retrieves the current value; timeout/hide/navigation clears it. Failed validation creates no card. Critical to share a credential without model/transcript disclosure. TC-005, TC-006.

### TC-005: Native plugin, grants and isolation
- Journey / requirements: CUJ-005 / FR-008, FR-009, FR-010.
- Level / automation: integration; [TC-005.test.js](tests/TC-005.test.js), synthetic Python plugin dispatch via a subprocess.
- Preconditions / fixtures: Disposable home/vault with synthetic ADMIN_PASSWORD and exported0600 file, trusted checkout CLI, fake plugin registration context; no model/provider call.
- Given: Valid managed path and registered native tool.
- When: Dispatch tool with correct/missing/invalid/stale paths, capture result, reopen vault, reveal through protected HTTP, expire/revoke grants and retry. Resolve the CLI with explicit NED_CLI_PATH or, absent the standard install, a PATH symlink to bin/ned.js with synthetic HOME and explicit NED_NODE_PATH. Existing task-management TC-011 owns archive/npm plugin checks.
- Then: Valid call returns reference only; unknown actions/arguments, nonfiles/symlinks/outside paths and stale bytes fail without disclosure or grant creation. Reveal requires existing HTTP guards, works before expiry and fails after expiry/replacement/deletion. Plugin/archive/config preserve packaged tool and exclude runtime data.
- Steps and assertions: Run named case, assert captured stdout contains no synthetic value/path, fake context received ned schema and handler, exact result fields and status codes; inspect real local native loader separately when available.
- Variants / negative cases: Cross-origin/disabled-server rejection; input strings never become shell code; a missing explicit CLI override fails without PATH fallback. Live model selection/cache reload remains manual.
- Cleanup: Remove only disposable homes/processes.
- Pass evidence: Executable assertions; a fake registration test is not proof of live Hermes discovery.

### TC-006: Chat retrieval browser journey
- Journey / requirements: CUJ-005 / FR-010.
- Level / automation: end-to-end; [TC-006.test.js](tests/TC-006.test.js).
- Preconditions / fixtures: Disposable COM with synthetic native tool-result history and matching vault grant; desktop/mobile Chromium, no model/provider.
- Given: Canonical successful ned tool result without plaintext.
- When: Load chat, reveal/hide, leave tab/reload, rotate the secret and retry; render non-ned/invalid results. Assistant/user spoof schema rejection is owned by TC-005.
- Then: Only valid tool result produces a card; value enters only readonly UI after explicit reveal, not history/copied message. Errors reveal no content. Input paths/unknown tool fields do not reach browser. Values clear on navigation and expired references remain unavailable.
- Steps and assertions: Run browser case; inspect synthetic screenshots outside repository and network responses. One browser case owns DOM→real protected API wiring; pure schema rejection assertions belong to TC-005.
- Variants / negative cases: Delayed reveal after navigation and rotation handled without stale value restoration. Grant expiry is deterministic integration coverage in TC-005; disabled-server coverage is TC-002/005. Production browser/real model use unverified.
- Cleanup: Stop browser/server and remove test-owned data only.
- Pass evidence: Browser assertions and screenshots; separate live native-loader probe, no claimed model execution.

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-008, FR-009 | CUJ-005 | TC-005 | Native plugin/CLI/vault/HTTP integration |
| FR-010 | CUJ-005 | TC-005, TC-006 | Schema and browser |
| FR-007, FR-008, FR-010 agent behavior | CUJ-004, CUJ-005 | TC-004 | Delegated manual skill eval; NOT RUN |

Port verification uses `tests/browser-fixture.js`: a real COM server with a synthetic
JSON gateway (GET session, POST sessions, paginated GET messages and held POST chat).
`turns.finish()` appends user/assistant history and returns completed JSON; no SSE.
Packaging is verified once by task-management/TC-011 for npm and profile archives,
including plugins/ned/plugin.yaml and plugins/ned/__init__.py. No skill prose tests
or duplicate archive pack runs are added. See ACCEPTANCE.md for actual execution,
environment, unverified manual gates and pending merge/deployment.
