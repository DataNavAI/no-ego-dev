# Static semantic and responsive interface gates

Use this pattern when a generated web surface needs deterministic accessibility/responsive checks before browser evidence exists.

## Boundary

- Static checks may prove emitted HTML semantics, CSS contracts, local asset references, and machine-readable interface rows.
- They must explicitly report `browserEvidence: false`.
- Do not claim measured overflow, control rectangles, LCP, transferred bytes, screenshots, computed style, or real browser support until the later browser runner executes those checks.

## Exact supported-interface cases

- Preserve the registry's exact reserved test names, one result per supported interface.
- Share one generated fixture/report so desktop and mobile cannot drift, but emit distinct interface envelopes.
- Keep ordinary artifacts temporary. Durable release evidence requires explicit QA mode and an explicit evidence directory.

## Avoid regex evidence laundering

Regexes that span container boundaries can combine evidence from different elements. For repeated semantic containers such as `<article>`:

1. Tokenize opening/closing tags.
2. Fail closed on unexpected closes, nesting when nesting is forbidden, and unclosed containers.
3. Validate time, action, source, and content type within the same isolated container.
4. Add regressions for sibling-split, nested, and missing-close markup.

For headings, labels, and controls, do not inspect independent opening-tag regexes. Parse the bounded generated landmark into a tree (or use an already-installed standards parser): consume every byte, maintain a balanced element stack, reject duplicate attributes and relevant invalid content-model nesting, then traverse the parsed nodes. Attribute parsing must track match offsets and reject every non-whitespace gap and trailing fragment; a regex iterator that merely collects matches can silently skip malformed text such as `href="/x" ="oops"`. Verify one H1, no skipped levels, and globally unique valid IDs. Each section's `aria-labelledby` must resolve to exactly one H2 owned by that section, not merely any global heading with the same ID. Every nav needs an accessible label, and controls need valid targets/types. Compute static control names from `aria-label` or descendant text while excluding every `aria-hidden="true"` subtree; a decorative hidden glyph alone is not an accessible name. Add regressions for malformed/unbalanced nesting, unconsumed attribute fragments, duplicate/ambiguous IDs, and an aria-hidden-only link; prove each old gate accepted its repro before hardening.

## Exact membership, not shape alone

Generic checks such as “HTTPS URL exists” or “datetime is non-empty” permit wrong-entity content. Bind rendered evidence to authoritative inputs:

- Compare the complete ordered profile-source tuple set (`URL`, source type), not merely one valid source.
- For current cards, compare title, canonical timestamp, chosen source URL, content type, ownership, count, and order.
- Require each populated rendered card to match exactly one entity-owned inventory record.
- When the frozen real fixture legitimately contains only empty states, add a populated synthetic contract test. It must accept a valid card and reject substitutions of title, timestamp, URL, and content type. Also keep universal report-to-rendered-card count equality for every real row.

## CSS contract checks

Keep new rules scoped to the feature root. Assert the selected design contract rather than generic responsive slogans:

- desktop canvas and absence of legacy phone-shell caps;
- breakpoint columns with explicit minimum widths;
- `min-width: 0` for shrinkable grid/flex descendants;
- Korean/English wrapping without forced clipping;
- 44×44 minimum interactive controls;
- visible `:focus-visible` treatment;
- all required safe-area edges for mobile;
- local asset paths and intrinsic dimensions where available;
- no remote rendered/CSS assets: reject HTTP(S) and protocol-relative URLs anywhere in the feature-scoped CSS so `image-set()`, imports, future image functions, and `url(//host/…)` cannot bypass a `url(https…)` regex; parse every `<img>`/`<source>` `src` and complete `srcset` value so a remote second candidate cannot hide behind a local first candidate; decode browser-relevant decimal/hex character references and URL named references before classifying HTML attributes so `https&#58;//…`, encoded slashes, and `//host/…` fail closed;
- exact regressions for CSS `image-set("https://…")`, protocol-relative CSS/HTML, encoded schemes, and mixed local/remote `srcset` values.

Static selectors are necessary but not sufficient; browser viewport and performance evidence remains a separate release gate.

## Verification and review

- Reconstruct RED against the immutable parent in a disposable worktree when a delegated TDD worker times out before returning its transcript.
- Run exact interface tests, affected feature tests, the bare canonical suite, and the bare build.
- Restore only known generated output, commit exact authorized files, then obtain specification PASS and quality APPROVED at the same clean SHA.
- Any remediation commit invalidates both reviews.
