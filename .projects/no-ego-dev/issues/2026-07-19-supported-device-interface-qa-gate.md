# Supported device interface registry and QA deployment gate

Status: complete
Owner: NoEgoDev skill maintenance
Branch: `feat/supported-device-interface-qa-gate`
Worktree: `/Users/moonk/.hermes/tmp/no-ego-dev-device-interfaces`

Verification evidence:
- RED: contract test initially failed with 3 missing-contract failures.
- GREEN: focused contract test passed (`3 passed`).
- Full repository suite passed (`9 passed`).
- Skill frontmatter, all EVAL YAML, template YAML, and `git diff --check` passed.
- Source skill directories were synced byte-for-byte to NED, AlphaNED, KiaeNED, and NEDxNED live profiles.
- All four profile gateways were restarted and provider smoke tests returned exactly `OK`.

## User request

Maintain a supported device interfaces file for products (for example desktop web, mobile web, Android, and iOS), QA every supported interface before deployment, and require at least one test case for every supported interface.

## Scope

- Add a reusable supported-device-interface YAML template.
- Make product management maintain the interface registry.
- Make project management keep the registry current and create per-interface QA tasks.
- Make QA require and execute at least one test case per supported interface.
- Make DevOps block staging promotion, production deployment, and store submission unless every supported interface passes against the same release candidate.
- Add behavior eval expectations and repository contract tests.

## Acceptance criteria

- [x] Canonical artifact path is `.projects/<project>/product/supported-device-interfaces.yaml`.
- [x] The template includes desktop web, mobile web, Android, and iOS examples without assuming all are supported.
- [x] Each supported interface requires at least one test case, current PASS result, tested release candidate, and evidence.
- [x] Product-manager, project-manager, QA, and DevOps skills share the same contract.
- [x] Deployment is blocked on missing, stale, failed, or blocked supported-interface QA.
- [x] Skill EVAL expectations and repository contract tests enforce the behavior.
- [x] Full repository tests pass (`python -m pytest -q`: 9 passed).
