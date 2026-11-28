# Provider-specific connection feedback

Use the existing trusted provider-card component from the [Communicator guidelines](../communicator/design/design-system.md) and [mobile guidance](../communicator/design/mobile-muse/README.md). Keep the white inner card, readable heading/body and44px-or-larger existing button style; do not invent a different connection UI.

For a failed GitHub attempt, show **GitHub connection could not start**, then **Ask NED to check GitHub connection support on this instance.**, then **Try GitHub again**. Substitute AWS or GoDaddy only from the validated tool provider. No code, request ID, URL, confirmation or grant state belongs on this card. It records a failed attempt, not a current account state. A separate legitimate AWS action keeps its own label; never make it stand in for GitHub.

Retry uses normal chat transport, preserving the unsent draft. Show existing “Wait until chat is ready, then try again.” feedback if unavailable. Unconfigured/unsupported GitHub must be explicit; this UI cannot register an app or grant repo access. Ordinary links remain links and are labeled from exact known destinations. Inspect actual synthetic renderer pixels on desktop and320/390px mobile. Do not publish the supplied private screenshot.
