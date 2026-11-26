# Preinstalled NED image tools

Inventory inspected from the pinned official Hermes base `ef0650d523ee1b5ab32c779acabc446d9936869a9932591553688a62bcf0c42f`, plus NED's Dockerfile additions, on 2026-11-26. This is the maintained developer-facing inventory, not every OS package or transitive library. Exact versions follow the immutable image digest; the runnable suite owns the essential functional contract.

| Area | Installed tools | Integration check |
| --- | --- | --- |
| Shell/files | Bash, sh, GNU coreutils, sed, awk, find, xargs, timeout | Synthetic shell/text/files pipeline |
| Source/search | Git, ripgrep (`rg`) | Local commit/readback, match and expected no-match |
| HTTP/TLS/SSH | curl, OpenSSL, OpenSSH (`ssh`, `scp`, `ssh-keygen`) | Local HTTP response, digest, synthetic key generation/derivation; no remote SSH or cloud login |
| Archives | GNU tar, gzip | Binary-safe archive/extract |
| Native builds | GCC, G++, Make | Compile and execute C and C++ fixtures |
| Python | Hermes virtualenv Python3 and its installed SDK/document libraries; `/usr/bin/python3`; NED virtualenv Python/PyYAML/pip | SQLite and YAML roundtrips, NED pip dependency consistency |
| JavaScript | Node.js, npm, npx; NED native better-sqlite3 | Real SQL query and offline local npm pack/install/npx execution |
| Browser | Google Chrome for Testing **156.0.8078.80** inherited from Hermes; browser-harness | Chrome executes local-page JS and produces screenshot; harness CLI loads |
| Media | FFmpeg, ffprobe | Generate and inspect mono PCM audio |
| Agent/application | Hermes CLI, NED CLI, Hermes dashboard, NED COM, subscription runtime adapters | CLI load/version plus existing service/lifecycle acceptance |
| Cloud | AWS CLI v2, added by NED's pinned official AWS image stage | Offline API skeleton; no cloud credentials or requests |
| Supervision | s6-overlay | Existing actual service restart and graceful-shutdown acceptance |

The browser was already installed at `/opt/hermes/tools/chromium-1248/chrome-linux-arm64/chrome` in the inspected ARM64 image (architecture-specific path on AMD64). Despite the directory name, its actual `--version` identifies **Google Chrome for Testing**, not Chromium. NED exposes it as `/usr/local/bin/google-chrome`; it does not download a duplicate browser. The build fails if the pinned upstream layout/identity changes unexpectedly. Both supported architectures must execute the browser in CI.

Not preinstalled as standalone PATH commands in the inspected base: GitHub CLI (`gh`), jq, wget, fd, zip/unzip, uv, pip/pip3, pandoc and sqlite3 CLI. Python has SQLite support; the NED virtualenv has its own pip. Do not confuse a Python SDK with a corresponding command-line tool, or availability with configured authentication. This change does not add these optional tools.

Hermes Python also includes provider SDKs (OpenAI, Anthropic, boto3, Google/Azure), document libraries (python-docx, python-pptx, openpyxl, xlsxwriter, pypdf, reportlab), Pillow, HTTP clients and browser-harness. They are inherited dependencies, not a promise that every provider or document format is configured or end-to-end tested. Use `python -c 'import importlib.metadata as m; print(sorted((d.metadata["Name"],d.version) for d in m.distributions()))'` inside a disposable image to inspect the full Python inventory.

Run `npm run test:container -- --context <context>` for the credential-free real-image suite. TC-009 runs with network disabled, read-only root, an unprivileged user and disposable writable `/tmp`. It bypasses service startup only for tool checks; TC-003/004 independently exercise normal authenticated startup, recovery and persistence. Browser `--no-sandbox` is limited to this offline disposable smoke test because ordinary Docker seccomp prevents Chrome's nested sandbox; it does not change the production browser-harness policy.
