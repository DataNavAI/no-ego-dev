# Local NED container delivery after a feature merge

The user's local NED container should expose the feature just merged. Restarting
an older image or a separate native COM process leaves the container stale.

1. Read back the feature's merged SHA and fetch current remote `main` from the
   canonical NED repository. Use the latest main whose required checks passed,
   including the merged feature. If main changed or its checks are pending, wait
   for verification and resolve the new revision; do not silently deploy an older
   revision and call it latest.
2. Use the maintained `scripts/update-local-ned-container.py` from committed NED
   source: `python3 scripts/update-local-ned-container.py --repo /absolute/path/to/no-ego-dev`.
   Inspect the current script and ownership configuration before running it.
   The existing Mac target is `ned-local-mac` in Docker context
   `colima-ned-staging`. Do not change the global Docker context or substitute an
   AWS/named-profile deployment. Do not print its private runtime environment.
3. The updater verifies latest-main CI, builds from committed source, claims an
   idle maintenance lease, replaces the container using preserved/copied named
   volumes, waits for health and Hub online, and retains the rollback container.
   Use this flow rather than bare `docker restart`, deleting volumes, or manually
   reconstructing credentials and mounts. Preserve configuration and user data.
4. Treat `Deferred`, lock contention, missing ownership, busy work, pending CI,
   failed health or recovery as pending delivery even if the command returns zero.
   Retry after the actual condition clears, without killing agent work or bypassing
   maintenance/ownership checks. Use the updater's journal recovery on interruption;
   do not discard its journal or rollback state to force progress.
5. Independently read back the owned container's running state, immutable image ID,
   `org.opencontainers.image.revision` label and health using explicit-context
   Docker inspection. Confirm the running revision equals the latest verified
   main selected above, the new generation has started, and its configured Hub
   connection is online. Verify the exposed local UI/API without exposing tokens.
   A tag alone, build success, `Unchanged`, or the updater's exit code is insufficient.
6. Record merged/deployed revision and actual health/connectivity evidence before
   completing the task. Canonical skills staging still uses
   `node scripts/deploy-hermes-skills.mjs`; it does not replace container delivery.

For a non-NED project, follow that project's delivery contract instead. Never
apply this machine's container names or updater to unrelated services.
