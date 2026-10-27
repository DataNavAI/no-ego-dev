# AWS staging deployment

This updates the existing Lightsail instance; it is not an AWS provisioning script. It does not modify DNS, Caddy, passwords or firewall rules. Use Python3.12+, Git, AWS CLI, OpenSSH/SCP locally; the Ubuntu24.04 host needs Docker/Buildx, Python3.12, Caddy, working HTTPS and the existing dedicated staging layout. Existing private SSH key and pinned known-hosts entry are required. Current AWS CLI authorization is used unless `--profile` explicitly selects an authorized AWS CLI profile. Never borrow another Hermes profile's credential store.

## Plan and deploy

Fetch and review the chosen commit. Require the applicable CI jobs to pass before deploying. The command archives that exact local Git commit, excluding dirty/untracked files and all Git history. No secrets belong in the archive. `--help` lists options.

```sh
git fetch origin main
# Set this to the full reviewed, CI-passing commit you intend to deploy:
NED_DEPLOY_COMMIT=$(git rev-parse origin/main)
python3 scripts/deploy-aws-staging.py \
  --account 061039762362 --region us-west-2 --instance ned-staging-trial \
  --ssh-key "$HOME/.local/share/ned-lightsail-staging/ssh-key-rsa" \
  --known-hosts "$HOME/.local/share/ned-lightsail-staging/known_hosts" \
  --commit "$NED_DEPLOY_COMMIT"
# Repeat the same command with --apply to execute the reviewed plan.
```

Plan verifies the account, running staging-tagged Ubuntu host, pinned SSH identity, current container/mounts, private runtime files, internal services and public password gate. It does not create host files or deploy anything. Missing credentials, dependencies, wrong account/tag, changed host key or unexpected layout fail before deployment. Do not disable host checking; obtain/verify a replacement host key through an authoritative operator channel if it changes.

Quiesce all staging Hermes/chat/agent work before `--apply`: the deployment intentionally interrupts the container after its build is complete. A host deployment lock serializes deployers but cannot detect or serialize every user interaction. An already healthy requested revision returns `unchanged`; `--force --apply` deliberately recreates it. Never use forced short timeouts for normal deployment.

## What is preserved

- Container `ned-staging` owns **only** `ned-staging-profile:/opt/data`, `ned-staging-database:/var/lib/ned`, `ned-staging-projects:/projects` and loopback ports8787/9119. Unexpected mounts/ports or another container referencing these volumes are rejected, including stopped containers.
- `/opt/ned-staging/runtime.env` and `/opt/ned-staging/com-password.env` must be regular private files (no group/other access). They stay on the server; no secret values are uploaded/downloaded/logged. Caddy and its bcrypt password remain unchanged. Public acceptance sends credentials only to the fixed HTTPS hostname `staging.ned.datanav.app`, never through redirects.
- Every build gets a unique retained image tag; the journal records its immutable digest for snapshot/restore helpers and the replacement container, so rebuilding one commit cannot evict the running image through tag reuse. The old container is stopped, all three volumes are archived together with numeric ownership/ACLs/xattrs, and archive hashes are committed to a durable journal before replacement. Snapshot directories are private under `/opt/ned-staging/snapshots/<transaction>/`. They contain secrets and must never be copied into this repository or public evidence.
- The original container is retained with its full runtime configuration until health gates pass. Candidate health failure restores the stopped snapshots and starts that original container. Data migration compatibility must still be reviewed; external systems/side effects cannot be rolled back by a volume snapshot.
- Existing seeded Hermes profile/config/auth/projects are preserved rather than silently reseeded from the new distribution. A separate reviewed migration is needed to update profile-owned content. The image's immutable application code and revision label change.

The source build is bounded to30minutes, SSH connection15seconds, SSH apply1hour, and Docker readiness180seconds by default (override1–600 with `--health-timeout`). Each HTTP acceptance request is bounded to10seconds. Rollback has its own readiness deadline. Docker health, exact dashboard/COM identity, unauthenticated dashboard denial, public anonymous401, authenticated COM200 and foreign-Origin403 must all pass. Raw build/provider output is suppressed because it may contain secrets. Errors are nonzero with safe JSON; investigate private host state via SSH.

## Recovery and cleanup

A remote SIGINT/SIGTERM/SIGHUP attempts rollback. Host/process loss or a disconnected SSH transport can leave a durable unfinished journal; the next plan/apply fails closed. Do not delete the journal or snapshots to proceed.

```sh
python3 scripts/deploy-aws-staging.py \
  --account 061039762362 --region us-west-2 --instance ned-staging-trial \
  --ssh-key "$HOME/.local/share/ned-lightsail-staging/ssh-key-rsa" \
  --known-hosts "$HOME/.local/share/ned-lightsail-staging/known_hosts" \
  --recover
```

Recovery validates transaction/container identity and every archive hash before any destructive restore. Unknown containers, unrelated volume users or missing/corrupt snapshots block recovery. Correct the concrete ownership/storage problem rather than pruning resources. A second recovery is harmless after completion; after an interrupted successful commit it finishes only the old-container cleanup and verifies the accepted service.

Successful snapshots and built images are retained privately. There is no automatic backup pruning, off-host backup, free-space guarantee or disaster-recovery promise. Monitor disk space, then delete only operator-reviewed unneeded snapshots/source builds/images after confirming retention needs. A disconnected upload may remain under `/home/ubuntu/.ned-deploy-<transaction>`; it contains committed source/agent code, not runtime secrets. Do not run global Docker prune or delete any persistent volume.

The command creates no AWS resources or extra paid services; existing Lightsail server/storage/traffic charges continue. It is not automatic deployment from main and does not deploy production. No live model request is made.

## Acceptance

Use an approved compatible source on the explicitly authorized existing staging instance. Preserve any owner data. Record the script's staged-tree/commit identity separately from the application commit used in each run. Required live evidence:

1. Privately hash the server's runtime env, COM secret and Caddyfile. Create distinct synthetic sentinels in the profile, database and projects (use a real SQLite/task readback for the database; never modify it while copying a live DB).
2. Run the plan command: status `planned`, correct old revision and no container replacement. Run `--apply`: status `deployed` (or use `--force` once for a known existing revision). Verify the requested image label, all three sentinels, authenticated public COM and unchanged secret/Caddy hashes. Keep the nonsecret JSON receipt.
3. Repeat without `--force`: status `unchanged`, same container ID.
4. Force that same compatible commit with `--force --apply --health-timeout 1`. The one-second candidate deadline must cause nonzero failure and restore the old container, volume sentinels, authentication and health. This is an explicit failure test, never a normal command. Invoke `--recover` and require terminal `rolled_back` without further data changes. A synthetic hard process-loss recovery is independently exercised in TC-002; do not kill the real shared host solely to duplicate that test.
5. After the final code commit, repeat a bounded plan and known-compatible rollout to bind fresh manual evidence to the script commit. Remove only synthetic sentinels; retain private backup data and existing staging state. Do not publish raw logs, env values, auth headers or archives. Record actual results separately from these planned cases.

Credential-free tests: `node --test docs/features/aws-staging-deployment/tests/TC-*.test.js`. Full gates: `npm run lint`, `npm run test:spec -- --all`, `python -m pytest` (or the installed pre-commit `npm run test:all`). TC-003 is manual and requires separate actual AWS evidence; fixture tests are not a live rollout pass.
