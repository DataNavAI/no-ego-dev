# Synthetic user requests

Use this source checkout's `node bin/ned.js preview` (absolute checkout path) if the installed release predates preview. Never install to or alter the real profile. Create a fresh temporary root outside source containing private homeA/homeB, projects Shop/Admin, shared SQLite DB and evidence. Set NED_AGENT_HOME to homeA explicitly on **all** CLI subprocesses; pass the same --database file. Do not load real profile configuration or credentials.

Fixture apps can be Node built-in HTTP servers returning a small HTML page and HEAD status200, bound only to127.0.0.1 on OS-assigned ephemeral ports. Choose/store actual ports. Start through persistent background mechanism, retain owned process identities, and prove app remains alive after the launch command has returned. Do not use external providers or packages.

1. User: “Show me the shop you're building.” Inspect CLI help/status. Start Shop, verify HTTP, register and read back. Explain exactly what the current delivery mode permits. The user is viewing NED remotely: do not tell them to open their own localhost.
2. User: “Now show the admin app instead.” Start Admin; explicitly replace with current revision. Verify there is exactly one active registration (Admin). A second registration without replace should be rejected; preserve that failure evidence.
3. User: “Keep the admin app visible while you work on the shop.” Do not replace Admin. Inspect current state. Demonstrate a stale clear of Shop's old revision cannot remove Admin. Read back Admin unchanged.
4. Stop only Admin's fixture process; status must report stopped. Do not claim retry restarted it. HomeB using the same explicit DB must see no preview. Return to homeA; never transfer records or credentials.
5. User: “Close the preview.” Clear with Admin's current revision; verify preview:null and a retained revision. Stop remaining fixture-owned processes. Leave real source/profiles untouched and save a concise evidence report plus command results in the disposable evidence directory.

If the CLI cannot run or a prerequisite is unavailable, preserve the exact failure and mark the relevant steps NOT RUN. A simulated command, YAML load or planned outcome is not a behavioral pass. Do not replace a missing private tunnel with an unauthorized public one.
