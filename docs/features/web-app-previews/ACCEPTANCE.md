# Single-preview acceptance evidence

Scope: registration/status API, API-backed CLI and web-app-preview skill (#210). No private embedded relay, remote browser/HMR or rendering proof is claimed. User single-app decision supersedes DEC-01 and historical multi-app screenshots.

Automated API/CLI cases TC-001/002/003/005/006 cover persistence, exact replacement/removal, race/retry semantics, selected-home isolation, readiness/auth failure and legacy config preservation. Actual run results and skill behavioral evaluation are recorded in the implementation PR/issue. TC-004 private delivery remains NOT RUN under #157/#81. TC-007 uses the self-contained skill EVAL/scenarios; loading YAML is not a behavioral pass.

Current code does not route executable app content under COM or issue a private route. Existing browser UI remains unchanged. Local links refer to the NED instance and are not remote-browser access.

Development verification: nine focused API/CLI tests passed; a temporary removal of revision guards made the concurrent-writer assertion fail as intended, and restoring the guards returned it to green. A real disposable Hermes skill evaluation passed: two persistent fixture servers, explicit replacement, rejected implicit replacement/stale clear, shared-DB home isolation, stopped status and cleanup to a revision3 tombstone. Its report explicitly denied remote/embedded delivery. Logs, app content, profile/runtime state and provider credentials remain outside source control. Final candidate evidence and full gate results are bound in the PR/manual receipt.

## Private delivery candidate (#157 / Hub #81)

The candidate extends the historical registration-only evidence above. Native
TC-008 exercises actual owned loopback HTTP and WebSocket, one-use bootstrap,
credential/cookie stripping, worker denial, clear revocation and wrong-project
fail-closed behavior. The Hub cross-repository Chromium procedure uses the actual
native COM/connector and a project-owned Vite server on desktop1280×800 and
mobile390×844. It verifies visible app, live module update without direct-port
fallback, form POST, Reload, explicit new tab with null opener, anonymous401,
parent DOM/service-worker isolation and closure of the current socket after
parent access revocation. Both passed during development. Final exact-source
checks, skill evaluation and deployment evidence belong in the PR/issue.

Hosted DNS/TLS/OAuth and rollout are not established by these disposable local
fixtures. Local Chromium cookie behavior is supported; other local browser
privacy settings may require the offered top-level fallback. macOS listener
identity has the limitation documented in TECHNICAL_DESIGN.md.
