# Exact-commit review after the shared checkout advances

Use this when an immutable review targets commit `C`, but the checkout moves to a later commit during the review. The checkout movement is not automatically a finding against `C`; it invalidates any observation not proven to come from `C`.

## Recovery procedure

1. **Record the identity change**
   - Capture the new `HEAD`, status, and `git diff --name-status C..HEAD`.
   - Compare blob IDs for every production, test, workflow, and evidence file used by completed probes.
   - Classify prior observations as candidate-bound only when the served/read blob is byte-identical to `C`; otherwise invalidate them.

2. **Materialize the exact commit outside the repository**
   - Create a disposable directory outside the checkout.
   - Run `git archive C | tar -x -C <dir>` from a repository that still has the object.
   - Execute syntax checks, deterministic focused tests, content/source checks, and secret scanning inside that archive.
   - Never switch/reset the shared checkout merely to recover `C`.

3. **Bind browser evidence to candidate bytes**
   - Prefer serving the disposable archive on a reviewer-owned port.
   - If a previously started server remains useful, hash every served HTML/JS/CSS response and compare it byte-for-byte with `git show C:<path>` before retaining browser conclusions.
   - A path-level diff is not enough: establish response/blob equality for all runtime inputs used by the journey.

4. **Rerun only what lost provenance**
   - If the checkout advance changed only a verifier script, rerun that verifier from the exact archive; browser results may be retained only when all served product blobs were proven equal to `C`.
   - If any runtime blob changed, discard and rerun affected browser, accessibility, screenshot, download, and interaction probes against the archive.

5. **Close the review honestly**
   - Verify `C` still exists with `git cat-file -t C`.
   - Report the exact candidate identity, not the checkout's later `HEAD`.
   - Do not claim the live checkout remained at `C`; preservation means the reviewer made no edits, while candidate identity comes from the immutable Git object and archive.

## Compact browser probe pattern

For a static app without Playwright/Puppeteer:

- start a loopback static server from the exact archive;
- launch disposable headless Chrome with a unique profile and DevTools port;
- use CDP to set mobile/desktop viewports, navigate routes, evaluate journeys, inspect the accessibility tree, and allow downloads;
- verify generated downloads by magic bytes and dimensions, not filename alone;
- inject axe from a disposable external file and run the project's declared WCAG tags rather than treating best-practice-only findings as claimed WCAG violations;
- stop Chrome/server and delete disposable files before finalizing.

## Pitfalls

- Continuing to run commands in the advanced checkout and labeling them as results for `C`.
- Treating a clean later `HEAD` as proof that `C` was the reviewed tree.
- Retaining browser results merely because filenames did not change; compare bytes.
- Resetting a shared checkout and overwriting concurrent work.
- Converting checkout movement into a release finding when the exact Git object remains independently reviewable.