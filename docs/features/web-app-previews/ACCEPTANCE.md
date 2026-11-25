# Single-preview acceptance evidence

Scope: registration/status API, API-backed CLI and web-app-preview skill (#210). No private embedded relay, remote browser/HMR or rendering proof is claimed. User single-app decision supersedes DEC-01 and historical multi-app screenshots.

Automated API/CLI cases TC-001/002/003/005/006 cover persistence, exact replacement/removal, race/retry semantics, selected-home isolation, readiness/auth failure and legacy config preservation. Actual run results and skill behavioral evaluation are recorded in the implementation PR/issue. TC-004 private delivery remains NOT RUN under #157/#81. TC-007 uses the self-contained skill EVAL/scenarios; loading YAML is not a behavioral pass.

Current code does not route executable app content under COM or issue a private route. Existing browser UI remains unchanged. Local links refer to the NED instance and are not remote-browser access.

Development verification: nine focused API/CLI tests passed; a temporary removal of revision guards made the concurrent-writer assertion fail as intended, and restoring the guards returned it to green. A real disposable Hermes skill evaluation passed: two persistent fixture servers, explicit replacement, rejected implicit replacement/stale clear, shared-DB home isolation, stopped status and cleanup to a revision3 tombstone. Its report explicitly denied remote/embedded delivery. Logs, app content, profile/runtime state and provider credentials remain outside source control. Final candidate evidence and full gate results are bound in the PR/manual receipt.
