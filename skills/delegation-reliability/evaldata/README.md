# Delegation reliability eval fixture

This fixture exercises recovery and continuation when background workers stop without a trustworthy end-to-end handoff.

The scenario deliberately separates five facts that must not be collapsed: process lifecycle, active-agent visibility, remote repository state, durable review artifacts, and authorization to start dependent work. A passing response must recover and verify available artifacts before replacement dispatch, preserve attempt-specific provenance, keep immutable targets stable during review, and resume runnable work without inventing success.

The user has explicitly rejected a second persistent queue, so the response should use lifecycle-delivered hook-only continuation with the external tracker as canonical while stating its restart limitation. A quiet watchdog may alert on missing starts, interruption, or staleness, but it must not recursively launch agents.
