# Benchmark Semantic Evidence Audit

Use this matrix when a deterministic benchmark scores generated product pages from HTML semantics.

## Trust boundary

Treat the product's semantic root as an identity-bearing record, not merely a convenient selector.

Require all of the following before awarding product-specific credit:

- exactly one product root exists;
- its entity slug equals the decoded final canonical-route slug;
- its entity type equals the authoritative benchmark row;
- its **root-scoped visible identity/H1** matches the authoritative display name after only the contract-approved normalization;
- required content is nonempty in semantic content nodes (`p`, `li`, `dd`), not headings alone;
- evidence selectors are resolved inside that validated root.

A correct page title or a correct-looking H1 outside the product root must not rescue a wrong H1 inside the root. Page-global selectors are untrusted for product-specific identity and entity-integrity credit.

If any prerequisite fails, product-specific dimensions must fail closed before generic text heuristics run.

## Cross-dimension closure

Compute the root/identity validity predicate once and gate every product-specific dimension with it. Do not independently reimplement “one root,” “correct slug/type/H1,” and scoped evidence checks for identity relevance, entity integrity, biography, current, empty-state, and official-link scoring; one weaker branch can preserve a false passing threshold.

Before approval, run a mutation × dimension matrix. For each malformed root mutation below, assert zero product-specific credit across **all** semantic dimensions, not only the dimension that originally exposed the bug:

- missing or duplicate root;
- wrong route slug, entity type, or root-scoped visible H1;
- a correct title or unrelated correct H1 outside a wrong-identity root;
- empty or heading-only required biography;
- evidence moved outside the root;
- wrong canonical action paths;
- prose-only or unsupported official-link evidence.

Keep one valid individual, one valid group, one populated-current case, and one honest-empty case as positive controls. This catches partial validator drift in one pass instead of serial review cycles.

## Dimension isolation

Award each dimension only from evidence that proves that dimension:

- biography facts: scoped factual content, not keywords elsewhere;
- current outcome: a scoped current action or the exact normalized honest-empty contract;
- official links: a real validated HTTPS official/social anchor, never prose containing “official sources”;
- honest empty state: exact entity-specific copy plus exact canonical source and correction actions.

Do not let one evidence node satisfy an unrelated dimension merely because its text contains overlapping keywords.

## Canonical-action checks

Compare normalized route contracts, not loose suffixes. `/unrelated/sources`, query-bearing lookalikes, fragments, actions outside the root, and encoded-path mismatches must not pass unless the specification explicitly permits them.

## Minimum adversarial probes

Start with one valid baseline, then mutate one property at a time:

1. missing root;
2. duplicate root;
3. wrong slug;
4. wrong entity type;
5. wrong root-scoped H1 with an otherwise-correct title;
6. wrong root-scoped H1 shadowed by a correct H1 outside the root;
7. empty required section;
8. heading-only required section;
9. evidence outside the root;
10. unrelated path with a valid-looking suffix;
11. official-language prose without an anchor;
12. HTTP, unsupported-type, or unscoped official anchor.

Exercise both entity classes and populated plus honest-empty current states.

## Evidence reconciliation

- Verify JSON and CSV row counts and field equality.
- Recompute every dimension sum from rows.
- Confirm input hashes did not change unless recollection was authorized.
- Use immutable locally generated product HTML when pre-deployment scoring is required; keep competitor acquisition methods truthful.
- Make text outputs byte-deterministic, including explicit LF line endings.
- If truthful scoring reveals that the product lacks required visible semantics, fix and test the product surface. Never preserve a threshold by weakening the scorer.

## Evidence-selector resolvability

A selector recorded as evidence is part of the claim, not descriptive metadata. For every product-scoped dimension:

- resolve the stored selector against the exact scored document;
- require it to select the intended node inside the validated product root;
- require the resolved node's normalized text to equal the stored `exact_text`;
- reject ambiguous page-global selectors such as bare `h1` when unrelated matching elements can precede the product root;
- prefer a stable scoped selector such as `[data-product-root] h1` over generated classes;
- run both a valid control and a shadowing fixture with an unrelated same-tag element outside the root.

Perform this reconciliation for JSON and CSV evidence after the final scorer change. A correct score with a selector that resolves to different text is still an evidence-integrity failure and requires regeneration of committed artifacts.