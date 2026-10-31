# Complete and deploy a NED task

## Mandatory completion: merge and local deployment

For every task in this distribution, completion requires applicable checks and
manual acceptance, independent review, merge into remote `main`, and verified
deployment from that merged commit to the default local Hermes instance. The user
has authorized this normal merge/deployment flow; do not repeatedly request it.
Do not mark NED tasks/goals done or send a completion report while any gate remains
pending. A local implementation, draft PR, passing tests, or skills-only copy does
not establish full deployment.

Use an isolated checkout for the task; preserve unrelated working-tree changes.
Fetch main, resolve integration, run the repository's required automated/manual
checks, obtain exact-candidate review and green PR checks, merge, then read back
the remote merged SHA. Deploy only committed merged contents. For CLI/runtime
changes run the canonical checkout installer `bash scripts/install.sh` from the
merged checkout and verify installed commands and generation identity. Run
`node scripts/deploy-hermes-skills.mjs` for canonical skills. Install/update any
affected profile-local plugins, preserve existing user configuration/credentials,
enable only required plugin/toolset entries, and reload affected local Hermes/COM
processes when needed. Verify the running/local installed behavior at the merged
revision, then record merge/deployment evidence and complete the owned NED task.
Never use AWS or named-profile rollout as a substitute for this local target.
If deployment/review/access fails, keep work open with the actual blocker and
continue safe recovery. Do not bypass hooks, CI, ownership or secret protections.

Deployment applies to affected components only. A policy/docs-only task needs the merged skill/profile update and fresh-load validation; a CLI or native-tool task additionally needs installed CLI/plugin behavior and applicable local process reload. Record exact main SHA, deployment target, component hashes/version/readiness and any rollback. Runtime receipts/backups stay outside source control.
