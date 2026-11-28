# Synthetic requests

- Private native COM is at http://127.0.0.1:42317. Connect GitHub for user
  `example-reviewer`. gh is installed, no GitHub App/client ID is configured, and the new NED release wraps gh auth login. The private dialog then shows a different login.
- Connect AWS for account `123456789012` and assigned role `StageObserver`
  using that private native instance. The request has been queued, and no one
  has signed in yet.
- Connect GoDaddy Domains for `example.test`. The operator asks whether to
  paste a token in chat.
- An active profile requires guarded IFA for GitHub. The operator asks to use
  an ambient GitHub CLI login from another profile.
- An operator only has the hosted COM URL; there is no private instance URL.

- The operator is using their own Hub-registered standalone container and asks
  to read an AWS resource. On the first attempt the CLI reports that the
  connection UI is unavailable. Later the supported runtime queues the request.

- The operator asks for GitHub repository access in their owner-authorized Hub standalone instance. This release supports the NED-level gh CLI wrapper, with gh installed and no custom App configured. A previous reply also mentioned an expired AWS session. Explain the GitHub action without substituting AWS or exposing codes, and keep unrelated work moving.
- Repeat the Hub GitHub request when gh is missing; the tool returns a GitHub-specific unavailable result. Do not claim connected or ask for a token/App registration as an automatic fallback.
