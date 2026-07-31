# Staged-snapshot adversarial pre-commit review

Use when the user freezes an exact staged file set, forbids repository edits, and requires generated-data or adversarial runtime checks.

## Preserve the candidate

Record before testing:

- `git status --porcelain=v2`
- `git diff --cached --name-status`
- `git diff --name-status`
- `git rev-parse HEAD`
- `git write-tree`

If the canonical test command generates or rewrites tracked files, do not run it in the shared checkout. Copy the current working tree (including staged content as it appears on disk) to a unique temporary snapshot, excluding `.git` and `node_modules`; link or install dependencies there. Run generation, focused tests, and the canonical suite inside the snapshot. Delete the snapshot afterward. Re-check the original status, unstaged diff, and index tree byte-for-byte.

After creating the snapshot, make the execution location explicit: use the snapshot as the command tool's `workdir` (or `cd` to it in the same shell command) and begin with an assertion that `pwd` or the resolved module path is under that snapshot. Merely printing or assigning the snapshot path does not change the next command's working directory. If a command accidentally runs in the shared checkout, wait for child-process quiescence, compare against the recorded pre-test state, and restore only proven generated changes; never assume the checkout stayed untouched because the intended snapshot existed.

Prefer a uniquely named sibling/workspace snapshot outside the OS temporary directory when the suite itself verifies temp-root, realpath, or symlink-escape policy. Running those tests from `/tmp`, `/var/folders`, or an equivalent system-temp tree can produce false results because the copied repository is itself under the trusted temp root. After cleanup, compare all five preservation facts—not only the index tree—to their pre-test values: HEAD, `git write-tree`, staged paths, unstaged paths, and untracked paths.

A test that reads generated fixtures may fail against stale checked-in output even when the canonical `generate → test` pipeline passes. Reproduce the canonical command ordering in the snapshot before classifying the failure. Do not waive a failure merely because a concurrent all-file run passed: test files that generate shared output can race. Prefer sequential generation followed by the bounded test. Some canonical suites intentionally mutate or remove copied source/fixture files while testing cleanup and rollback behavior, so do not assume the same disposable snapshot is reusable for a second canonical run. If an exit code or transcript needs confirmation, create a fresh snapshot from the frozen candidate and run the canonical command exactly once there; distinguish a first-run candidate failure from a second-run damaged-sandbox failure.

For closed top-level schemas, an allowed key name is not sufficient. Require every allowed own key—including non-authorizing projection metadata such as rank, rank reason, summary, body, and navigation fields—to have an own data descriptor before any downstream projection performs ordinary property access. Probe each downstream boundary with throwing getters on representative allowed metadata and require rejection plus zero getter calls. A final `try/catch` that returns an empty result after invoking the getter is not fail-closed provenance handling; the hostile accessor has already executed.

## Exact hostile-object closure probes

For security boundaries based on own data descriptors and exact record shapes, test late prototype mutation after module import. Cover both `Object.prototype` and `Array.prototype`.

Do not accept a prototype merely because newly added key names fail to match a sensitivity regex. Name heuristics miss semantically authorizing aliases such as `publisher`, `outlet`, `href`, `link`, `evidence`, or future fields. For an exact-schema boundary, reject every post-baseline prototype key (or require a truly pristine/null prototype) while ensuring getters are never invoked.

Minimum probe matrix:

- null and primitive inputs
- revoked proxy
- stateful proxy whose traps change results across calls
- sparse arrays and inherited numeric entries
- accessor-backed authorizing fields
- inherited receipt/provenance fields on object and array prototypes
- symbol keys and unknown own keys
- conflicting top-level URL, receipt URL, action URL, and rendered URL
- malformed lexical HTTPS forms that parsers normalize
- malformed primary and secondary identity fields in both contradiction directions
- CMS/raw record and post-projection validation

For every malformed case, assert all three properties explicitly:

1. rejection or omission,
2. zero accessor/getter calls,
3. no exception escapes.

## Executable probe discipline

When the frozen requirements name bypass classes, supplement the canonical suite with one bounded executable probe in the isolated snapshot and print a stable success marker naming the classes exercised.

- Set test mode before importing a server module in a one-off Node process (for example, `NODE_ENV=test node --input-type=module`). Import-time `app.listen()` behavior otherwise makes the probe non-hermetic and can create misleading port collisions.
- Inventory every exported helper that accepts a collection and can feed publication—not only the final selector or CMS endpoint. Deduplicators, refresh-candidate builders, ranking helpers, and compatibility adapters are hostile collection boundaries too. Wrap each outer array in a counting `Proxy`, require zero ordinary `get` calls, and separately probe sparse, accessor-backed, named-key, symbol-key, custom-prototype, and over-bound arrays. Array methods such as `.filter()`, `.map()`, `.sort()`, or `.slice()` before descriptor validation are a concrete bypass even if the final record gate is descriptor-safe.
- Reproduce late prototype direct-path attempts only after module import. Mutate both `Object.prototype` and `Array.prototype`, use throwing accessors for provenance-bearing and arbitrary keys, assert rejection plus zero calls, and restore descriptors in `finally`.
- Split stateful CMS proxy coverage into three phases: failure during descriptor validation; successful descriptor validation followed by an ordinary `get` trap failure during compaction/projection; and successful descriptor validation followed by a non-throwing `get` trap that returns stable but descriptor-different values. The second case proves that a post-validation failure returns no partially projected sibling output. The third catches the subtler TOCTOU defect where the projection remains structurally valid and is accepted even though it was not the record that passed descriptor validation. Require zero ordinary `get` calls after validation—not merely an empty result after a throwing trap—and compare a provenance-bearing emitted field with the descriptor-validated source value.
- Exercise every declared collection/object bound with both an exact-maximum positive control and a maximum-plus-one rejection. Probe the exact object named by the contract—not merely an enclosing object that happens to use the same recursive guard. For example, if the bound applies to nested refresh/metadata later spread into output, put both fixtures on that nested object and prove the exact-maximum sentinel survives the spread. Count array payload elements separately from `Reflect.ownKeys(array)` because arrays also own `length`, but enforce the stated key limit directly for plain objects. Inspect shared guards for an off-by-one caused by accommodating array `length`; then prove an over-bound plain object cannot reach a later spread or destructure by putting a sentinel in its final key and checking rejection rather than retention.
- At every object later spread into output, pair key-bound controls with non-enumerable and read-only own-data descriptor cases. Require rejection before the spread: accepting then silently dropping a non-enumerable field—or normalizing away descriptor semantics—can erase moderation/provenance state while leaving a structurally valid result.
- Exercise exact text bounds with a valid maximum-length control and a maximum-plus-one rejection, rather than only an obviously oversized sample.
- Exercise URL disagreement across top-level, typed receipt, action, nested alias, and browser-normalized navigation representations in the same matrix.

If the probe harness itself fails, correct the harness and rerun the complete matrix before classifying a candidate defect. Preserve the final reproducible product result, not a transient harness failure. When probing a derived status or type, choose a valid baseline where the mutated source field actually changes the derivation; a higher-priority source type may dominate a legacy status mutation and make an expected-rejection assertion invalid. Prove the baseline derivation first, mutate one causal input, and assert the new derived expectation before treating acceptance as a product defect.

### Disposable-probe telemetry and cleanup

Some coding runtimes track every path written through file-edit tools even after deletion. A probe first written inside a workspace or copied checkout can therefore trigger a misleading changed-path or unverified warning after an immutable review. When an OS-safe temporary verification script is required:

1. allocate its final pathname directly with the platform tempfile API and the required stable prefix (for example `hermes-verify-`);
2. create and execute it at that final external path instead of writing it in a workspace and moving it later;
3. if the structured file writer refuses the OS temp root, prefer a direct stdin probe (`node --input-type=module`, `python -`) when a physical file is not mandatory; if one is mandatory, use a narrowly scoped runtime writer only for that allocated path;
4. remove the probe and prove absence before the final repository-state comparison;
5. label the result explicitly as **ad-hoc verification**, separate from canonical suite/build evidence.

Do not answer a stale changed-path warning by repeatedly recreating equivalent probes. Reconcile it once against observed path absence, preserved HEAD/index/patch identities, and recorded verification output.

## Legacy-shadow closure and refresh-candidate inputs

When a record retains a `legacy`, `raw`, or compatibility snapshot, derive a binding matrix from the complete allowlisted schema rather than testing only familiar fields. For every allowed shadow field that can restate canonical evidence—title, source URL/type, publisher label/origin, receipt fields, identity, and every timestamp—either require byte-exact equality with its canonical counterpart or reject that shadow key as unsupported. Treat alternate names as one semantic family: identity includes both `id` and `contentId`; type includes `type`, `kind`, subtype, and collection classifiers; time includes published/retrieved/discovered/updated values plus schedule start/end/date/text/timezone/freshness fields. Do not infer closure because one representative from each family is bound. Test both (a) conflicts on fields already present in the production fixture and (b) newly added but allowlisted fields; a fixture that omits `contentId`, schedule fields, `retrievedAt`, `updatedAt`, or `discoveredAt` can hide an accepted conflict. One concise probe can clone a valid production row, mutate each allowlisted shadow representation independently, and print the fields still accepted.

Treat a refresh-candidate builder as a multi-input hostile boundary. Snapshot and descriptor-validate not only fetched rows, but also the existing moderation database, nested refresh metadata, and any caller-supplied options that influence publication. Probe each accepted input with counting proxies and throwing accessors. Success is valid only with zero ordinary `get` calls; spreading `existingDb`, destructuring accessor-backed options, or reading `existingDb.refresh` after validating fetched rows is still a fail-open refresh path. Include one valid minimum-size control so an early minimum-count failure cannot prevent the probe from reaching existing-state handling.

## Projection preservation and navigation resolution

For pass-through CMS metadata such as `rank`, `rankReason`, and `href`, test positive preservation and hostile rejection as separate obligations. Push a valid ranked record through raw publication validation, compaction, post-projection validation, and selector/page-model propagation; then independently probe accessor-backed and invalid plain values at the raw boundary. Exact preservation does not establish that the values were validated.

Treat navigation strings as browser syntax rather than ordinary strings. Resolve each accepted `href` against the production origin with the platform URL parser and require the resulting origin and canonical route shape to remain in contract. A value such as `/\\attacker.example/path` passes a naive `^/(?!/)` check but resolves cross-origin after browser backslash normalization. Also probe protocol-relative forms, controls, dot segments, and encoded separator variants. Assert the exact projected value and resolved destination so omission or fallback cannot create a false pass.

## Focused frozen-contract replay

When the reviewer is asked to reproduce previously identified hostile cases, turn the request into one bounded test-name pattern rather than rerunning an unrelated broad suite. The focused replay should include both the negative family and its positive control in the same invocation. For ranked publication projections, replay at least:

- throwing getters for `rank` and `rankReason`, with zero getter calls;
- object-valued, negative, non-integer, over-bound, and unpaired rank metadata;
- exact preservation of a valid rank/reason pair;
- browser-resolved external `href` forms such as backslash-normalized authority syntax;
- exact preservation and same-origin resolution of a valid root-relative `href`, including query state;
- direct-URL records under late `Object.prototype` and `Array.prototype` additions;
- nested receipt/action/legacy provenance conflicts, extra keys, inherited entries, and accessor-backed title or metadata;
- valid single-entity title controls beside separator, case, order, and possessive attack variants.

If focused tests depend on generated fixtures, run the canonical prerequisite generator in the disposable staged sandbox first. A pre-generation failure is setup-inconclusive; only the post-generation focused result is gate evidence. Record the focused test count from the successful bounded invocation, but bind the verdict to the named contract cases rather than assuming a historical count is stable as tests evolve.

## Reviewer routing and verdict availability

Each delegated reviewer starts without the parent's shell working directory. In every task—especially every item in a parallel batch—repeat the absolute repository or isolated-snapshot path, exact HEAD/index-tree identity, staged path list, and no-edit instruction in that task's own context and goal. Begin the review by proving that path is a Git repository and that its staged tree matches the supplied identity. If the worker inspects the workspace default, another nested repository, zero staged files, or any other checkout, discard the verdict as **absent** and re-dispatch against the unchanged candidate.

If the supplied path is not a Git repository but an exact index-tree hash was frozen, do not guess from project names or review an unrelated nested checkout. Perform a bounded read-only search across known task worktree roots, asking each repository whether it contains that tree object and whether its current `git write-tree` equals the frozen hash. Proceed only on a unique exact match; record the resolved repository path in the verdict. No match or multiple matches leaves the gate absent and requires clarification. The tree match recovers candidate identity, but it does not waive the final HEAD/index/staged/unstaged preservation checks.

Treat timeout, provider interruption, safety-filter interruption, or a response without the required first-token verdict as no gate result. Do not translate these into PASS, FAIL, APPROVED, or REJECTED. Re-dispatch with narrower implementation/compliance wording and bounded local checks while keeping the candidate and review contract unchanged; do not weaken the matrix to obtain a response.

When several gates are required, all verdicts must bind the same index tree or commit. A passing specification/quality pair cannot override a missing or rejected domain gate such as editorial/provenance, and a later source correction invalidates every gate in the batch.

## Verdict evidence

A green canonical suite is necessary but not sufficient when a direct adversarial probe demonstrates authorization. Use the caller's exact verdict vocabulary (`ACCEPTED`/`REJECTED`, `APPROVED`/`REQUEST_CHANGES`, etc.) as the first output token. When the caller requests “concrete blockers only,” report only reproducible blocking findings—do not append passing checks, inventory summaries, or general review narration. Preserve those facts internally as review evidence, and mention staged-state preservation only if the requested output contract permits it. Also retain the preserved index-tree digest and absence of unstaged changes in the review record.