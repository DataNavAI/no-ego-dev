---
name: web-app-preview
description: Start and register the web app a user wants to preview through the NED API-backed CLI, managing one active preview per agent instance, explicit replacement, readiness and cleanup without asking users to choose ports or apps.
---

# Web app preview

Use when a user asks to see, try or update the working web app, or when development work needs its preview registered with NED. The user should only need to open Preview; NED chooses the working app. There is **one active preview per selected agent home**, across projects. Other app processes may exist, but they are not additional previews.

## Inspect before starting

1. Preserve the current runtime home and project context. `NED_AGENT_HOME` explicitly selects a home; otherwise NED detects Hermes/Codex. Never switch to a different agent home to make an empty registry look populated. Keep the same environment on every command. Do not print/read API token files or put credentials in arguments/chat.
2. Check `ned preview --help` and `ned preview status --json`. The CLI calls NED API v1; use its configured `NED_API_URL` (or explicit `--api`) unchanged. A failed configured API or context mismatch is not permission to fall back to another listener/home. If the installed CLI lacks preview, report the missing update; only use `node /absolute/trusted-checkout/bin/ned.js preview` when that checkout is actually available and intended.
3. Inspect the project's existing start command and current processes. Reuse the correct running app. Choose a free non-control loopback HTTP port; do not ask the user to choose a port, scan unrelated services or register an admin/gateway/COM endpoint. Registration accepts only an integer port1024–65535 and always probes `/` on127.0.0.1. It accepts no command, URL or URL path.

## Run, register and read back

Run the app using the runtime's supported persistent/background process mechanism, in the intended project, bound to127.0.0.1. Hermes terminal supports `background:true`; keep its returned process/session identity for logs and cleanup. A normal foreground command that dies when the turn ends is not a running preview. Do not change app security headers, expose its port publicly or use a new tunnel provider to make a demo appear successful.

Wait for a real HTTP response with a bounded check before registering. Do not follow redirects to private services or treat a5xx response as a healthy app. API status is HTTP readiness, not proof that the app rendered, HMR works or remote users can reach it.

Read the current `revision` from status, then:

```bash
ned preview register --project /absolute/project --port 3000 --name "Working app" --expected-revision 0 --json
ned preview status --json
```

Use the **actual** project, port and observed revision, not these example values. Verify the returned name/project/port and retain ID/revision. The CLI can read revision automatically if the flag is omitted, but explicit observed revision is best for updates. An identical retry returns the same record; after an uncertain response read status before retrying. Never retry changed input against a stale revision.

## Replace one preview

If the user is asking to show a different app/project, that request authorizes replacing the preview. Do not present an app chooser or maintain multiple slots. Read status, then use the new target and `--replace --expected-revision <observed>`:

```bash
ned preview register --project /absolute/other-project --port 3001 --name "Working app" --replace --expected-revision 1 --json
```

Replacement changes the active metadata only; it does not stop the old process. Preserve that process if other work depends on it. If the user wants the current app kept visible, do not replace it just because another server is running. A409 means state changed: inspect status and reconcile the user's intent before writing again. No blind last-writer-wins replacement.

## Recovery and cleanup

- `stopped`: inspect the app's owned logs/session, fix/start it and verify HTTP again. Retry/status never launches a server. `app_error`: resolve the app error before claiming it works. `unavailable`: inspect project access without recreating deleted folders.
- Remove registration with `ned preview clear --expected-revision <observed> --json`; verify `preview:null`. A stale clear must not remove a newer preview. Clearing does not kill processes or remove legacy project config. Stop only processes owned by this task when they are no longer needed.
- Never claim registration is production deployment, process supervision, rendered-browser QA or successful tunneling. Keep the development task open if its requested visible/remote preview still cannot be delivered.

## Private delivery and recovery

Inspect the returned delivery capability rather than guessing a tunnel URL. With
`delivery.mode:"private-relay"`, COM can show the single registered app in Preview
and provides Reload and Open in new tab. `remoteAvailable:true` means the connected
Hub negotiated private delivery; it is not proof of rendered output or working HMR.
Verify the actual app in the browser before reporting it visible.

Private delivery requires a uniquely identifiable loopback listener owned by the
agent user with its working directory inside the registered project. Start the
server from that project. If a restarted process replaces the listener, register
it again using the current revision so stale access cannot reach a different app.
Do not weaken ownership checks or register a control service to bypass failure.

`delivery.mode:"local-link"` means only registration/status is available on that
connection. `localUrl` belongs to the NED instance, not a remote user's computer.
If delivery is unavailable, say: “The app is running, but this NED instance cannot
show it here yet.” Keep the task open, inspect the supported connection and app
process, and use the documented COM controls. Never invent a public URL, expose a
port publicly, paste access grants, or ask users to configure a tunnel.
