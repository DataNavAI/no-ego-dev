# Provider-specific connection feedback

Use the existing trusted provider-card component from the [Communicator guidelines](../communicator/design/design-system.md) and [mobile guidance](../communicator/design/mobile-muse/README.md). Keep the white inner card, readable heading/body and44px-or-larger existing button style; do not invent a different connection UI.

For a failed GitHub attempt, show **GitHub connection could not start**, then **Ask NED to check GitHub connection support on this instance.**, then **Try GitHub again**. Substitute AWS or GoDaddy only from the validated tool provider. No code, request ID, URL, confirmation or grant state belongs on this card. It records a failed attempt, not a current account state. A separate legitimate AWS action keeps its own label; never make it stand in for GitHub.

Retry uses normal chat transport, preserving the unsent draft. Show existing “Wait until chat is ready, then try again.” feedback if unavailable. A missing or unavailable gh runtime must be explicit; default CLI login needs no separate App, and account login does not grant repository access by itself. Ordinary links remain links and are labeled from exact known destinations. Inspect actual synthetic renderer pixels on desktop and320/390px mobile. Do not publish the supplied private screenshot.

For supported owner Hub instances, Message options includes **Connect GitHub** alongside **Connect AWS**. GitHub opens the existing GitHub modal, asks for the intended username, then **Get sign-in code**, **Open GitHub**, **Check approval** and explicit identity confirmation. Preserve current private-code and expiry styles; the AWS form must not appear in this modal.
