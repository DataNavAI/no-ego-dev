# Publishing relationships with imprecise end qualifiers

Use this when a reviewed source pipeline maps Wikidata relationship qualifiers into a normalized roster or membership model, especially when `P582` (end time) may have year/month precision.

## Semantic contract

A normalized former relationship can be valid in either form:

- `status: 'former'` with an exact normalized UTC `endAt` instant; or
- `status: 'former'` with `endAt: null` when the source proves former status but its `P582` precision cannot truthfully be represented as an exact instant.

`null` means **known former, exact end instant unavailable**. It must not cause the relationship to be dropped, and it must not be interpreted as current.

Keep the neighboring rules narrow:

- `status: 'current'` remains publishable only when `endAt === null`.
- Unknown or unsupported statuses remain omitted.
- A malformed non-null `endAt` remains rejected.
- Accessor-backed `endAt` evidence remains rejected without invoking its getter.
- Existing exact-key, source-receipt, QID, slug, checked-time, and bounds checks still apply.

A typical final predicate is conceptually:

```js
(status === 'current' && endAt === null)
  || (status === 'former' && (endAt === null || isExactUtcInstant(endAt)))
```

Do not broaden the generic timestamp validator to accept imprecise strings such as `"2023"`; preserve imprecision as `null` at the materialization boundary.

## TDD regression recipe

1. Extend the reviewed group fixture with a second exact-shape, source-backed `has_member` relationship:
   - `status: 'former'`
   - `endAt: null`
2. Assert it appears in `roster.formerMembers` alongside an exact-date former member.
3. Assert the renderer places it in the **Former members** section and labels it **Former member**.
4. Run the exact test and confirm RED because only the imprecise former member is absent.
5. Make the smallest relationship-publishability change.
6. Add or retain hostile cases proving:
   - malformed non-null `endAt` is omitted;
   - accessor-backed `endAt` is omitted and its getter is never called;
   - current and unknown status behavior is unchanged.
7. Run the exact behavior tests, feature file, related reference-fixture file, then the canonical full suite.
8. If the canonical suite regenerates tracked output that is outside scope, restore only the previously clean generated tree and rerun the exact behavior tests.

## Common mistake

Requiring every former member to have an exact UTC `endAt` silently discards valid year/month-precision `P582` evidence. Conversely, accepting arbitrary imprecise strings at the roster boundary launders malformed data. Preserve the distinction with `status: 'former', endAt: null`.