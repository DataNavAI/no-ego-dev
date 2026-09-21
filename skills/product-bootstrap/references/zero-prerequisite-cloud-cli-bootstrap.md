# Zero-prerequisite cloud CLI bootstrap

Use when a user wants one copy/paste command that installs a local launcher and provisions a hosted workspace from a clean supported laptop.

## Product contract

“Nothing installed” means the happy path must not require a preinstalled project CLI, language runtime, package manager, Git, cloud CLI, or root access. State the remaining platform assumptions explicitly, normally HTTPS download support, a POSIX shell, archive extraction, and a supported OS/architecture.

Installation is not the outcome. Completion requires install → authorize → create → remote health/representative use → stop/resume → destroy → independent resource and credential cleanup readback.

## Installer contract

1. Use a version-pinned HTTPS installer. If the convenience URL is mutable, download to a temporary file and verify an exact published digest before execution.
2. Detect and reject unsupported OS/architecture combinations before writes.
3. Install a pinned private runtime and pinned application asset in a user-owned directory; verify each digest.
4. Install one stable user-local launcher, repair one exact marked PATH block, and invoke the launcher by absolute path during the current run.
5. Require no `sudo`; reject unsafe roots, symlink escapes, writable-by-others targets, and ownership mismatches.
6. Serialize installation, construct a complete generation in staging on the destination filesystem, verify it, then atomically activate it. Preserve the previous generation until activation succeeds.
7. Make reruns version-aware and integrity-checking. File presence or marker text is not integrity evidence.
8. Keep credential-free commands such as `create --dry-run` credential-free regardless of flag order.
9. Provide uninstall and remote cleanup separately; local reinstall must not delete a hosted resource.
10. Keep failure-injection switches out of production installer bytes. Tests transform a reviewer-owned copy or intercept external boundaries.

## Authentication and verification

Prefer provider-supported browser/device/OAuth flows. If a key is unavoidable, collect it from a hidden interactive prompt and store it in an OS credential store or an owner-only atomic file; never accept or expose it through chat, argv, URLs, logs, fixtures, or repository files. Keep infrastructure credentials local and use provider secret storage for hosted workload credentials.

Verify clean macOS and Linux environments with minimal PATH and no leaked developer tools. Deterministic fixtures prove orchestration and failure cleanup; they do not prove live provisioning. With user-approved least privilege, run the exact candidate through the complete hosted lifecycle and independently confirm deletion. If authorization is unavailable, verify the installer through the credential boundary, label live provisioning blocked, and ask only for the smallest safe authorization action.
