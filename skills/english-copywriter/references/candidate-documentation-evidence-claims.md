# Candidate documentation and evidence claims

Use this copy-truth check when UI or documentation says supporting artifacts are present. The check determines whether wording is truthful; canonical reviewers own binding candidate and release decisions.

## Required checks

1. Inventory actual files independently of README and UI claims.
2. Compare each claimed directory, report, receipt, archive, type, and count to a real accessible artifact.
3. Classify each evidence target as bundled and verified, independently accessible and verified, referenced but absent, or malformed/stale.
4. Cross-check words such as `captured`, `recorded`, `available`, and `included` against that classification.
5. Do not treat a URI, filename, hash field, or manifest entry as proof that the target is present and reviewable.

## Copy outcomes

- If copy says an artifact is included and it is absent, report a material copy-truth issue.
- If an identifier is present but the artifact is not bundled, say so directly: `Receipt references are recorded in the manifest but are not bundled in this candidate.`
- Do not report missing evidence as a copy issue when no copy claims it is present. Route any independent evidence requirement to the owning canonical reviewer.
