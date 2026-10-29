# Preview-oriented workspace benchmark

Research date: 2026-10-26. Scope: NED communicator workspace composition; retain the existing Antigravity-informed message renderer and single `NED Chat` session.

## Observed reference

[Lovable's official editor guide](https://docs.lovable.dev/features/projects/editor) describes a left project chat, an interactive app preview on the right, and project controls in a top toolbar. Preview is the home view; Files exposes generated and uploaded deliverables. Chat can collapse to enlarge the preview. Smaller windows collapse controls and the mobile app uses separate swipeable views.

This benchmark uses the current official documentation, inspected in a browser. It does not claim access to a signed-in Lovable project or pixel-level reproduction of its editor.

## NED adaptation

- Keep one persistent chat on the left, preserving draft, transcript and message rendering across workspace navigation.
- Give Preview the central, flexible workspace. Keep project selection in the top-level workspace controls.
- Put Chat, Goals and Artifacts in tabs within the left pane. Goals replaces the visible Goal & Tasks name; selecting a tab preserves the chat draft and transcript DOM. Remove the right inspector.
- On small screens, show one useful view at a time with explicit navigation and retained chat state. Avoid shrinking both columns to fit.
- Keep unavailable data honest: task and artifact browsing are not implemented yet. Preview availability continues to come from the registered project's validated local app configuration.

## Boundary of this iteration

NED currently opens an available local app in a new tab. Moving its availability and launch controls into a central canvas does not create an embedded live preview. Embedding requires its own framing, origin and failure-handling design; this iteration must not present a simulated app as live or relax the existing content security policy merely for visual resemblance.

The resulting layout is a foundation for a preview and deliverable workflow. Full parity with Lovable's interactive preview and file management is outside this composition change.
