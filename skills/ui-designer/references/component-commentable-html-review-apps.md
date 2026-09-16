# Component-Commentable HTML Review Apps

Use this reference when a user wants to comment directly on components in a runnable HTML/CSS/JavaScript mock and GitHub/Figma is unavailable, disproportionate, or not the desired primary surface.

## Review contract

- Treat the app as `REVIEW_ONLY`; keep publication and production approval separate.
- Attach comments to stable semantic IDs such as `DS-01.hero` or `CHECKOUT.payment-method`, never only screen coordinates or DOM indexes.
- Keep a human label beside the ID so exported feedback remains readable.
- Preserve IDs across revisions. If an ID must change, ship an explicit migration map for existing comment exports.
- Re-run decoration after route renders or dynamic `innerHTML` replacements so new component instances regain their stable comment controls.

## Minimal local data model

```json
{
  "schema": "component-comments/v1",
  "comments": [
    {
      "id": "uuid",
      "componentId": "DS-01.hero",
      "route": "DS-01",
      "label": "Group hero",
      "body": "Make this crop taller on mobile.",
      "status": "open",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

For a dependency-free private review slice, localStorage plus versioned JSON export/import is sufficient when the app states its limits: no account, sync, conflict resolution, audit identity, or recovery after browser data is cleared. Merge imports by comment ID and reject invalid schema shapes rather than accepting malformed data.

Use a backend only when reviewers need shared state, named identities, replies, notifications, permissions, or durable audit history.

## DOM and ARIA pitfalls

Do not append the comment button directly inside:

- an existing `button`, `a`, input, or other interactive control; or
- an ARIA composite whose required children are constrained, such as a `tablist`, listbox, menu, or grid.

Nested controls are invalid and break event/focus behavior; extra children under ARIA composites can trigger `aria-required-children` failures. Put the reviewed control or composite inside a non-interactive wrapper, attach `data-review-id` to that wrapper, and place the comment pin there.

Other rules:

- Pins are native buttons with accessible labels including component label and open-comment count.
- Use at least 44×44px touch targets.
- Keep media provenance labels and comment pins from overlapping; place credits on the opposite edge or in a source sheet.
- A comments side panel/bottom sheet acting modally should use `role="dialog"`, `aria-modal="true"`, inert background content, Escape-to-close, invoking-focus restoration, and a Tab/Shift+Tab focus trap.
- Avoid adding `role="dialog"` to elements for which that role is disallowed; a neutral `div` is safe.
- On mobile, use a bounded bottom sheet; on desktop, a bounded side panel. Verify both remain inside the viewport with no document-level horizontal overflow.
- “Show” should navigate to the stored route, select/scroll the exact stable component, and preserve comment context.

## Import and local-state hardening

Treat every stored or imported comment as untrusted review data.

- Cap the import before parsing (a practical local default is 1 MiB), then cap comment count and body/label/ID lengths.
- Validate the complete versioned document before mutation. Reject malformed JSON, wrong schema/version, invalid statuses/timestamps, and duplicate IDs.
- Decide and label merge-versus-replace semantics explicitly. For merge, key by comment ID; duplicates inside one incoming file still fail closed.
- Render bodies and imported labels with `textContent` or equivalent escaping. Include literal `<img onerror>` and `<script>` strings in tests and assert no executable nodes or callbacks appear.
- A rejected import must leave the existing localStorage value byte-for-byte unchanged and announce the reason through `role="alert"`.
- Guard localStorage reads/writes for corruption, quota, and privacy-mode failures. Do not crash startup.
- Lock background body scrolling while the modal panel is open, include safe-area bottom padding, and restore the exact invoking pin on Escape. If that transient pin disappeared after a rerender, restore the persistent comments hub.
- Keep generated malformed/XSS/oversize fixtures under non-repository scratch space. Retain only an intentional sanitized export example and compact verification receipt when they add review value.

## Authoritative feedback lifecycle

When comments are shared through a backend, treat that backend—not a browser-local export or earlier session note—as authoritative.

1. Query all currently open comments immediately before implementation. Pagination must be exhausted.
2. Build a checklist containing comment ID, optimistic-concurrency version, exact body, route, stable component ID, viewport, requested change, and current disposition.
3. Preserve every targeted stable ID while editing. If a change requires removal/renaming, ship and verify a migration map before dispositioning the comment.
4. After implementation, rerun product browser QA and independent copy/UI review against the exact immutable candidate. Use the package verdict contract: `REQUEST_CHANGES` for material failures, `BLOCKED` only when required evidence cannot be obtained, and `APPROVED` when no material blocker remains. Apply required changes, regenerate evidence, and rerun review rather than treating a failed gate as advisory. Omit reversible nits entirely.
5. Re-query comments before mutation because new comments or versions may have arrived. Reply with the addressing revision/evidence, resolve using the current version, and read back every record.
6. Confirm the final open count and persisted replies/dispositions. Deployment success alone does not prove the review queue was closed.

For feedback about a learning flow, include both perfect and imperfect journeys in browser QA. Confirm that progress, score, rank, accessible labels, and share text are all derived from completed answers, and capture a real mobile viewport showing the learning visual, name, memorable fact, progress, and next action without fixed navigation covering the action.

## Verification matrix

Run the real browser app and assert:

1. one visible `h1` per route;
2. every image loaded (`complete && naturalWidth > 0`);
3. no document overflow at narrow mobile, primary mobile, and desktop;
4. every `data-review-id` is unique;
5. no nested interactive elements;
6. all enabled targets meet the project touch target;
7. axe passes with the panel closed and open;
8. panel background is inert and keyboard focus wraps inside it;
9. create → reload → resolve → reopen works;
10. JSON export has the expected schema/component ID;
11. JSON import follows the declared merge/replace policy; malformed, oversized, duplicate-ID, and invalid-schema files fail closed without changing storage;
12. imported HTML/script strings render literally, create no executable nodes, and fire no callbacks;
13. **Show** navigates across routes to the recorded component;
14. dynamic route/lesson/challenge/tab replacements remain commentable;
15. body scroll is locked while open, safe-area padding is present, Escape restores exact pin/hub focus, and console/page-error buffers are empty;
16. clean screenshots show the selected component and panel at 320px, primary mobile, and desktop.

Freeze and hash a review candidate only after comment evidence, screenshots, source receipts, and rights manifests are complete. Smoke-test the frozen candidate itself; passing checks against the mutable source do not prove the archive works.
