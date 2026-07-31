# Launch-sensitive remediation patterns

Use this checklist after an independent review finds release-blocking defects in a generated/live application.

## Close findings with executable contracts

1. Convert every blocker/high finding into a focused regression test before changing production code.
2. Run the focused test and confirm RED for the reported reason.
3. Implement the smallest fix, run GREEN, then rerun the full build and validation gates.
4. Request a narrow follow-up review against the exact remediation commit. A completion notification without the findings body is not approval.
5. Keep deployment/freshness evidence separate from code-review clearance; passing local tests does not clear a public launch.

## Destructive account lifecycle

- Never cap pagination when promising complete account or session deletion. Follow every DynamoDB `LastEvaluatedKey` until absent.
- Isolate pagination behind a testable helper that accepts a page fetcher. Test beyond any historical page/item threshold (for example, more than 1,500 records).
- Delete related sessions in bounded transaction chunks, and only return deletion success after all chunks and the final account-data transaction succeed.
- Test multiple simultaneous sessions, not only the request's current cookie.

## Concurrent set mutations

- Avoid read-modify-write for authoritative follow/favorite membership. Use DynamoDB set `ADD`/`DELETE` and return the authoritative `ALL_NEW` state.
- The client may optimistically render, but success must follow server confirmation; restore prior state on failure.
- Include concurrent acknowledged mutations in tests so one mutation cannot erase another.

## Runtime secrets and immutable deployment

- Put sensitive App Runner values in `RuntimeEnvironmentSecrets`, not `RuntimeEnvironmentVariables`.
- Grant the instance role narrowly scoped `secretsmanager:GetSecretValue` access.
- If GitHub provisions secrets, verify that upsert output names, CloudFormation parameter names, deployment overrides, and rollback overrides match exactly.
- Expose a deployment revision in health output and smoke-test it against the expected checkout revision. Promote the exact staging-tested immutable digest rather than rebuilding for production.

## Accurate mobile verification for generated pages

- A Chrome `--window-size=390,844` screenshot may not prove a 390 CSS-pixel viewport. Use CDP `Emulation.setDeviceMetricsOverride` and record both `innerWidth` and `document.documentElement.scrollWidth`.
- Measure bounding rectangles for the reported control, not just global `scrollWidth`. Content can be clipped by an ancestor with `overflow:hidden` even when page scroll width equals viewport width.
- Inspect the actual rendered element/class after client initialization. A visible search form may differ from a similarly named hidden/static form.
- For mobile grid controls, use `minmax(0,1fr)` and an explicit button column; constrain suggestion grids and child `min-width` values.
- Capture a post-fix screenshot and verify concrete visible controls, source/freshness text, safe-area navigation, and clipping.

## Generated-artifact hygiene

- Regenerate with the committed/generated dataset clock when validating layout-only changes; do not accidentally move `generatedAt` backward or create unrelated inventory churn.
- Stage generator source, tests, and intentionally reviewed generated artifacts explicitly. Do not broadly stage the generated tree.
