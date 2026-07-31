# Semantic source-contract closure

Use this when an immutable product/content candidate authorizes publication from pinned evidence. A checksum proves byte identity, not that those bytes support the intended entity or claim.

## Required binding chain

For each public claim, prove one closed chain:

`public claim → private reviewed claim ID → typed evidence locator → source record → pinned evidence bytes → authoritative entity mapping`

Bind all of the following, not just a caller-consistent subset:

- stable product entity/artist ID;
- canonical source ID expected for that entity;
- authoritative provider record ID (for example an MBID);
- provider URL record ID;
- parsed payload record ID and canonical name;
- source hash, size, retrieval time, rights decision and field allowlist;
- exact relied-on field or typed relation locator;
- claim/relation lifecycle and distinct reviewer receipts.

A source ID, URL and payload that were all changed together can remain internally consistent. Reject it unless the tuple still matches the separately reviewed authoritative mapping.

## Locator and identity rules

Treat locators as executable selectors, not descriptive strings.

- Parse field locators and require the field to exist with the expected scalar/object type.
- Bind each claim concept/kind to a closed reviewer-approved locator scope. Mere locator existence is insufficient: an unrelated field in the same valid payload cannot support the claim.
- For relation locators, bind relation type plus the evidence-side entity name or record ID and require exactly one matching relation.
- Make stable relation IDs deterministically encode their authoritative endpoint tuple and enforce endpoint-pair uniqueness. This rejects coordinated substitutions where person ID, display name and locator are changed together while the relation ID stays fixed, and rejects a fully renamed duplicate endpoint.
- Bind the reviewed display/stage name to that evidence relation through a private relation record; transliteration or native-script differences must be explicit data, not fuzzy matching.
- Include hostile regressions for nonexistent locators, semantically unrelated existing locators, wrong member, coordinated wrong-member substitution, duplicate endpoints, wrong relation type and a correctly hashed unrelated payload.

## Closed contracts

- Close top-level and every nested normative object with exact allowed/required keys.
- Close release status/version, entity type, relation/activity, alias-kind and analytics enums.
- Parse BCP-47 structurally; a broad hyphenated-token regex can accept invalid numeric regions such as a two-digit region.
- Parse real calendar dates, reject future-dated release/entity/alias/lineage/relation records against the frozen release/evaluation clock, and enforce retrieval → first review → second review → release chronology.
- Reject unknown values that still match generic regexes.
- Reject lexical `.` and `..` path segments before path normalization; then enforce resolved and realpath containment beneath the candidate root so symlinks cannot escape.
- Keep semantically distinct identities separate: a challenge `packVersion` is not a content `releaseId` even if both happen to use version-like strings.
- Search all operative Markdown as well as executable schemas. A passing validator cannot approve a candidate whose plan/editorial prose still authorizes a removed route or held source.
- Freeze the complete executable dependency closure. If workflows, package scripts or entrypoints reference files omitted from the immutable bundle, the candidate is non-executable even when the mutable checkout works.

## Public projection

Governance records can remain private. A public release should contain only fields required by shipped screens, while the compiler verifies that every projected field traces to approved private records.

Before expanding the public schema, ask whether the product actually ships the corresponding route or promise. If the UI does not provide a complete member directory, do not export a complete lineage graph or public review receipts merely because private governance uses them. Narrow the product contract instead of inventing unused runtime surfaces.

## Separate verdicts

Keep these decisions independent:

1. `APPROVED_FOR_IMPLEMENTATION`: contracts are coherent and executable.
2. Content/publication approval: every record has the required independent editorial/source receipts.
3. Deployment/promotion approval: the exact built artifact passed environment and rollback gates.

A completed delegation is not a verdict. Preserve the exact candidate-bound verdict text; missing, truncated or stale verdicts leave the gate absent.

## Minimal hostile matrix

- correctly hashed evidence with unrelated canonical name;
- internally consistent but wrong provider ID in payload and URL;
- authoritative source missing from an otherwise valid profile;
- absent relied-on field;
- relation locator resolving zero, many, wrong-type or wrong-entity rows;
- unknown field at every nested contract boundary;
- unknown/contact-encoded analytics IDs and impossible release IDs;
- enum drift between prose and executable schema;
- absolute, `..`, and lexical `.` candidate paths;
- prohibited provider/adapter authorization;
- positive suite run from a read-only immutable candidate with scratch output outside it.
