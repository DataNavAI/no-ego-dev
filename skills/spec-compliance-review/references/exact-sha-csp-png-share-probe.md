# Exact-SHA CSP and PNG-share probe

Use when a frozen static web candidate claims that a generated SVG/canvas fan card or similar client-side artifact remains downloadable/shareable under production-style CSP.

## Goal

Prove the complete rendered interaction at the exact candidate bytes:

1. the challenge/result flow reaches the export action;
2. an SVG loaded through an `Image` can be drawn to canvas under the intended `img-src` policy;
3. `canvas.toBlob(..., 'image/png')` emits a real PNG;
4. the fallback download path receives that file;
5. the next sequential journey starts with correct route/state continuity;
6. no `securitypolicyviolation` occurs during export.

Source inspection or a pre-recorded screenshot is not sufficient evidence for this browser/CSP boundary.

## Reusable procedure

1. Require a clean checkout whose `HEAD` equals the requested SHA; record `HEAD`, tree SHA, and status.
2. Serve the frozen checkout read-only with an explicit header such as:

   ```text
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'
   ```

   Keep the policy aligned with the actual deployment contract; do not add `blob:` to `img-src` merely to make the probe pass when image generation is expected to use `data:`.
3. Launch a disposable headless Chromium profile and drive it through CDP. Serve and test the exact checkout, not an already-running development port.
4. Register a `securitypolicyviolation` listener before triggering export.
5. Complete the real UI flow. Record answer positions or equivalent dynamic state so a hardcoded first-choice implementation cannot masquerade as randomization.
6. Before activating the share control, force the deterministic fallback only at the browser seam:
   - make `navigator.share` unavailable;
   - wrap `URL.createObjectURL(file)` to retain the actual `File` object;
   - replace `HTMLAnchorElement.prototype.click` only to prevent a filesystem download while recording that the fallback was invoked.
7. Inspect the captured file in page context with `await file.arrayBuffer()` and require:
   - `file.type === 'image/png'`;
   - a non-trivial positive size;
   - PNG magic bytes `89504e470d0a1a0a`;
   - the expected deterministic filename.
8. Require zero captured CSP violations, then activate the next-journey action and assert route/query identity, visible label, initial progress, and expected controls.
9. Add an injected-global ownership probe for object-URL cleanup. Have the API used by `createObjectURL()` return a sentinel URL, then mutate `window.URL` (or the injected URL holder) during the synthetic anchor click. Require the **same snapshotted API owner that created the URL** to receive exactly one `revokeObjectURL(sentinel)` call, and require zero calls on the replacement API. Code that rereads `window.URL` in `finally` can leak or misroute cleanup despite a nominal revoke call.
10. Repeat the ownership principle for other paired resources where practical: the snapshotted document/body that accepted a temporary node should own its removal, and capability checking plus action should not reread mutable injected globals without an explicit snapshot boundary.
11. Stop the disposable browser/server and reconfirm exact SHA, tree SHA, clean index/worktree, and untracked set.

## Interpretation

- A screenshot of the SVG card proves rendering, not PNG generation.
- A mocked `canvas.toBlob` proves wiring, not browser compatibility.
- A toast saying “saved” is not evidence unless the captured file is inspected.
- A valid PNG without route continuity does not satisfy a sequential-challenge requirement.
- A passing probe under a weaker CSP does not establish compatibility with the authoritative policy.
- Expected missing hosted-only review-plugin requests should be classified against repository boundaries; they do not excuse product-script, image, CSP, or export failures.
