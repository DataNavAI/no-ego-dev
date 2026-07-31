# Generated Artifact Release Verification

Use this when a repository contains generated web/UI assets and the runtime image or package may copy those assets directly.

## Core risk

Changing a generator is not the same as changing the deployed product. Tests can regenerate assets inside one job and pass while a later deployment job builds from a fresh checkout and copies stale tracked output. A source-level review can therefore approve code that is absent from the release artifact.

## Required trace

Before approving or shipping, trace the complete path:

1. **Source of truth** — identify generator, canonical data, templates, and runtime source.
2. **Generation step** — identify the exact command and whether it runs in tests, CI, image assembly, or nowhere.
3. **Artifact consumed by runtime** — inspect Dockerfile/package config/server static root and determine whether it consumes tracked output or freshly generated output.
4. **Fresh-checkout behavior** — reproduce from a clean checkout or `git archive`, not a dirty worktree whose tests already regenerated files.
5. **Whole-tree negative scan** — for removed tags, identifiers, fake states, or stale routes, scan every generated artifact rather than a few representative pages.
6. **Artifact identity** — record image/package digest and expose a revision marker from the running service so smoke tests prove which build is serving.

## Safe delivery patterns

Choose one explicitly:

- **Build-generated artifact:** run dependency install and generation inside the image/package build before copying output. Prefer this when generated files should not be reviewed as source.
- **Committed generated artifact:** regenerate, review, and commit the complete output. CI must fail when `generate && git diff --exit-code` changes tracked output.

Do not mix the patterns accidentally. If output is committed but deployment regenerates, document which form is authoritative.

## Same-digest promotion

For staging-to-production delivery:

- Make the container registry immutable.
- Resolve the pushed image digest immediately after staging build.
- Persist a manifest that binds commit SHA, image digest, staging run ID, and environment.
- Production must retrieve a successful staging manifest for the requested full SHA, re-resolve the registry tag, and fail if the digest differs.
- Deploy by digest, not mutable tag.
- Include the commit/revision in the service health response and require it in smoke tests.
- Smoke the rollback target after rollback; rollback command success alone is not evidence.

## Review checklist

- [ ] Generator changes are present in the artifact actually copied by the runtime.
- [ ] Fresh-checkout build reproduces the expected pages/assets.
- [ ] Negative scans cover the complete generated tree.
- [ ] Tests exercise the real client event/action names, not server defaults that hide mismatches.
- [ ] Staging and production account/app/environment identities are asserted, not merely configured by variables.
- [ ] Production promotes the exact digest proven in staging.
- [ ] Running health reports the expected revision and live dependency-read status.
- [ ] Rollback is followed by the same smoke contract.
