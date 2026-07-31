# Photo-rich clickable UI cleanup pattern

Use this reference when a user asks to make an implemented UI cleaner, more image-rich/photo-rich, or to add annotations/affordances to clickable components.

## Pattern learned

1. **Start with the deployed/staged UI, not just source files.** Capture a visual review first so the cleanup targets real clutter, weak hierarchy, missing imagery, or ambiguous clickability.
2. **Remove low-value explanatory copy ruthlessly.** Helper text, repeated category labels, duplicated `Open` metadata, and generic product slogans should lose to actual content, imagery, and primary actions.
3. **Prefer real content imagery over placeholders.** In photo-led domains, reorder or feature cards with real photos first. Use collages or richer fallbacks only when no real single image exists.
4. **Make clickability feel like product UI, not QA overlays.** If the user asks for annotations on clickable components, use polished CTA pills, labels, focus states, or action badges. Avoid dashed/debug-looking outlines unless the deliverable is explicitly an annotated QA screenshot.
5. **Check for layout artifacts after CSS changes.** Absolute/overlay image treatments can create stray/floating thumbnails if the card container lacks the right positioning context.
6. **Verify visually after each major pass.** A screenshot/vision review can catch issues automated tests miss, such as orphaned images, overcrowding, insufficient photo richness, or safe-area gaps.
7. **After deployment, repeat production smoke.** Confirm health endpoints, deployed HTML content markers, and a production browser visual check before calling the UI complete.

## Durable report contents

For project knowledge, save a concise report with:
- objective and before-edit findings,
- specific copy removed or shortened,
- visual/photo richness changes,
- clickable affordance treatment,
- final visual QA result,
- exact verification commands or deployment run evidence.
