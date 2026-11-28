# Complete and deploy a NED task

## Mandatory completion: merged files and the selected runtime

Use the canonical [coder completion policy](../../../skills/coder/SKILL.md#mandatory-completion-merge-and-docker-only-local-delivery). Docker is the sole default local NED web runtime on this host; do not restart or re-enable the retired native COM service after a task.

Run required checks, self-review and green PR checks, merge, and read back the remote revision. Deploy affected components from that merged source. Skills/docs-only updates synchronize canonical files to `~/.hermes` with fresh-load validation and no service start. Runtime/UI updates use the maintained Docker updater with ownership, CI, maintenance and rollback gates; verify running revision, health and Hub connection. Preserve existing profile state and install affected plugin/persona changes with backups when needed.

A user-deferred or busy Docker rollout remains pending. Native CLI installation or a native COM restart cannot substitute for that delivery. Retain native profile data and administrative tools; deleting them is not required for a single running Docker instance. Runtime receipts/backups remain outside source control.
