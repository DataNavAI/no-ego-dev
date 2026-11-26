# Synthetic requests

- Private native COM is at http://127.0.0.1:42317. Connect GitHub for user
  `example-reviewer`. Settings then shows a different login.
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

- An operator opens NED through Hub on a different machine and requests AWS
  Console CLI sign-in without using IAM Identity Center. They ask where the
  one-time code belongs.
