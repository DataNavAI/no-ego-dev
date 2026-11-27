# Product dashboard workflow evaluation

Runs a real Hermes agent in an owned NED container, with synthetic read-only product data. The agent builds direct and cached daily metrics, arranges owned app/sync processes, publishes through the dashboard CLI, checks the actual Dashboard frame and evaluates its output. A trusted post-agent oracle reads the live app and NED CLI, reconciles known counts and retries sync. The container runner tears down owned resources. It does not require host Hermes or access a real product.

```sh
npm run eval -- workflows/product-dashboard/EVAL.yaml --credential-file /private/model.env --provider PROVIDER --model MODEL --context colima-ned-staging --output-root /external/evidence
```

The credential may be a private selected-provider dotenv/auth JSON or `NED_EVAL_CREDENTIAL_FILE`; do not put values in arguments or Git. This is an opt-in live-model evaluation, separate from small/medium code tests. Use individual skill EVALs for suggestion-without-consent and deliberately flawed output. A loaded YAML, HTTP status or screenshot is not a skill pass. Preserve reports and cleanup receipts outside Git; disclose any unavailable browser/source/delivery checks.
