# Publication provenance closure probes

Use this recipe when a content record is validated, selected, projected/compacted, and then rendered or returned by a CMS API. The invariant is that no evidence can be accepted and then erased before the next validation boundary.

## Boundary chain

Audit the complete path:

1. hostile source record;
2. final publication validator;
3. entity selector;
4. page-model clone/projection;
5. renderer;
6. CMS prefilter;
7. CMS compact projection;
8. post-projection validator/API response.

A green validator alone is insufficient. Run each hostile record through every production entry path.

## Unknown-provenance matrix

Add an attacker URL under all of these shapes and require rejection before projection:

- unknown top-level URL-like key (`actionUrl`, `ticketUrl`, `youtubeUrl`, `href`);
- unknown top-level provenance container whose key need not contain `url` (`alternateReceipt`, `alternateSource`, `actionReceipt`);
- symbol-keyed value;
- extra own key on a receipt record;
- extra named or numeric property on a receipt array;
- inherited named or numeric receipt-array property;
- second receipt whose URL conflicts with the first;
- nested action/receipt containing a second URL-bearing field;
- disagreement among direct source URL, every typed receipt URL, and rendered action URL.

Do not enforce this with only a `/url|href|link/` key-name regex: provenance containers can hold URLs under innocuous-looking names and then disappear in a whitelist projection. Either require an exact/allowed top-level shape for provenance-bearing records or explicitly reject every unrecognized provenance namespace before any lossy projection.

For every case, assert all of:

- original validator rejects;
- selector returns zero;
- page model/rendered output omits it;
- CMS returns zero;
- no getter or proxy trap is invoked;
- input is not mutated.

## Null, proxy, and prefilter ordering

A protected validator cannot fail closed if an earlier filter dereferences the hostile row. Probe the exported CMS/publication function itself with:

- `null`, primitives, and arrays;
- revoked proxies;
- proxy `getOwnPropertyDescriptor`/`ownKeys` traps that throw;
- a proxy whose descriptors look valid but whose later `get` trap throws or changes values.

Any expression such as `item.publishStatus === ...` before the hostile-object validator is a crash/TOCTOU bypass. Validate or descriptor-clone first, then derive status and compact output exclusively from the validated clone. Revalidate the exact compact projection, but do not mistake post-projection validation for proof that erased unknown provenance was harmless.

## Title separator equivalence

For title/entity safety, test ASCII hyphen, en dash, em dash, comma, plus, ampersand, slash, and connector words in both subject orders. Pair unsafe cross-artist rows with valid descriptive controls.

Do not rely on a finite celebrity-name list or only a two-to-four-token heuristic. Include one-word counterpart names and names containing descriptor-like words. Example mutation families:

- unsafe: `Target—Adele announces ...`, `Adele—Target announces ...`, `Target—Madonna releases ...`;
- valid: `Target—new album announced`, `Target—Big Hit Music announces ...` when the reviewed product semantics intentionally permit an agency/label descriptor.

The final publication gate—not just acquisition parsing—must reject unsafe variants.

## Immutable focused-test setup

When focused tests require generated artifacts but the source checkout must remain untouched:

1. create an isolated clone/copy outside the repository;
2. overlay the exact staged blobs and keep all other files at `HEAD`;
3. link or install dependencies without changing the source checkout;
4. run the canonical generator prerequisite and focused tests in the isolated copy;
5. choose a clone root that preserves test assumptions.

Some suites intentionally assert that a repository path is outside the operating system temporary directory. A clone under `os.tmpdir()` can therefore create false failures in path-containment tests. If that happens, rerun the isolated clone under a disposable non-system-temp workspace and classify the first run as setup-only. Remove both copies and verify the original staged hash, blobs, unstaged diff, and untracked set afterward.