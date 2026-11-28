# Product dashboard workflow evaluation

Runs a real Hermes agent in an owned NED container, with synthetic read-only product data. The agent builds direct and cached daily metrics, arranges owned app/sync processes, publishes through the dashboard CLI, checks the actual Dashboard frame and evaluates its output. A trusted post-agent oracle reads the live app and NED CLI, reconciles known counts and retries sync. The container runner tears down owned resources. It does not require host Hermes or access a real product.

```sh
npm run eval -- workflows/product-dashboard/EVAL.yaml --credential-file /private/model.env --provider PROVIDER --model MODEL --context colima-ned-staging --output-root /external/evidence
```

The credential may be a private selected-provider dotenv/auth JSON or `NED_EVAL_CREDENTIAL_FILE`; do not put values in arguments or Git. This is an opt-in live-model evaluation, separate from small/medium code tests. Use individual skill EVALs for suggestion-without-consent and deliberately flawed output. A loaded YAML, HTTP status or screenshot is not a skill pass. Preserve reports and cleanup receipts outside Git; disclose any unavailable browser/source/delivery checks.

## Research-backed service matrix

The companion [ned-example repository](https://github.com/DataNavAI/ned-example/tree/12d016a5b1ae5f10314d70755c3ab0a7185cdc8e) contains five standalone synthetic services: local services, online retail, B2B SaaS, booking and a niche marketplace. Its `evals/product-dashboard-services` matrix reuses this container engine while freezing both source revisions, running fresh per-case volumes and checking business-specific metrics, same-clock source updates and actual private-frame rendering. It requires no host Hermes. Run the documented `npm run eval` from that repository for all five cases; use `npm run benchmark -- --runs 3` for repeated trials. Source-fixture tests are separate from live skill acceptance; see TC-005 in the [feature spec](../../docs/features/product-dashboards/SPEC.md).

The initial five-case example baseline passed4/5; stronger SaaS and corrected-verifier marketplace runs passed separately. Each category has a successful live result across recorded pins, not a uniform5/5 run of the latest verifier. The companion repository also runs model-free positive/negative browser-verifier integration tests in CI; those checks do not count as skill acceptance.

[Source-pinned smoke results and limitations](https://github.com/DataNavAI/ned-example/blob/5cda029a3f4c901826b58aaa062f0b6bd2d36ae8/docs/benchmarks/2026-11-28.md).
