# Visual review publication

Use when canonical visual source is published through a separate review publication layer.

## Stable review model

- Bind comments to stable semantic review IDs, route, restorable UI state, and immutable source revision—not coordinates or fragile selectors.
- Keep canonical source in its product repository. Generated publication output is an artifact, not an editing source.
- Provide realistic runnable states, clean viewport captures, paired annotations, and a review index. A full-page screenshot alone does not prove fixed-navigation clearance or interaction.
- Preserve source identity, published snapshot identity, environment/deployment identity, and feedback-store identity as separate fields.

## Promotion sequence

1. Fetch every open authoritative comment and build a complete stable-ID checklist.
2. Implement accepted feedback in canonical source; preserve or explicitly migrate moved review targets and state restoration.
3. Run local functional, responsive, accessibility, focus, overflow, and console checks. Regenerate affected captures after the last rendered-source change.
4. Freeze and push the exact source revision. Pin the review publication layer to that full reachable revision and build its generated snapshot from a clean checkout.
5. Deploy the immutable publication revision to staging and verify the composed runtime with `review-runtime-integration-qa.md`.
6. Run required independent specialists against the same source generation. Keep their verdicts independent; any changed source revision invalidates exact-candidate approvals affected by the change.
7. Merge canonical source first. When policy requires the canonical merge identity, re-pin and rebuild the publication layer from the actual merge commit rather than predicting it.
8. Verify the intended production environment and runtime-reported source revision before changing feedback state. Staging proof never resolves production feedback.
9. Re-fetch current feedback versions, apply authorized dispositions through the approved external workflow, and read back every changed record.

The bundled review-thread helper remains read-only. This reference does not authorize or add mutable reply/resolve commands. Any external mutation must follow the main skill's immediate identity revalidation, authority check, race disclosure, and post-readback rules.
