# NED COM — share session artifacts

NED COM gives final session artifacts a browser reader and CLI-generated deep links. It is temporary artifact sharing, not permanent hosting, an authenticated collaboration service, or app deployment. Ask NED:

> Share the final report and approved images through NED COM. Use a dedicated review directory, inspect it for private content, and verify each public reader link before handing it to me.

The canonical agent workflow is [`skills/ned-com/SKILL.md`](../../skills/ned-com/SKILL.md); its adjacent `EVAL.yaml` and `evaldata/` cover privacy, stale processes, deep-link verification, refresh, active content, and shutdown.

## Before sharing

- Use a NED CLI version with `ned serve` and `ned com link`; inspect the installed help for the exact supported flags. NED COM is separate from `ned create` and does not require creating a hosted NED instance.
- Public mode requires installed [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Use its official installation instructions. No paid hosting purchase, custom domain, or DNS configuration is required for a Quick Tunnel.
- Approve the specific files and dedicated review directory for sharing. Copy only final shareable files and inspected relative image/media dependencies there. Inspect actual content and metadata; safe-looking names do not prove safety.
- Never serve a whole session folder, repository, home directory, `~/.hermes`, named Hermes profile, credentials, raw logs, or token files. Avoid symlinks escaping the directory. Everything inside the approved root must be shareable, not just the file you link.
- Keep the private receipt outside the review directory. It carries sensitive capability/process information and must have mode `0600`. Prefer an explicit receipt path per sharing workflow; the default is `~/.ned/com.json`.

## Start the reader

Replace these example absolute paths with your approved directory and private receipt destination:

```bash
ned serve --root /absolute/approved/review-root --state /absolute/private/com-receipt.json
```

The command runs the server and, by default, launches cloudflared for an ephemeral Cloudflare Quick Tunnel. Keep that terminal running. In another terminal:

```bash
ned com link /absolute/approved/review-root/final-report.md --state /absolute/private/com-receipt.json
ned com link '/absolute/approved/review-root/design/final screen.png' --state /absolute/private/com-receipt.json
```

Use the **actual returned URLs**. The deep-link shape is `/s/<capability>/?artifact=<encoded-root-relative-path>`; the CLI handles spaces, Unicode, nested paths, and special characters. Do not construct URLs yourself. There is no live URL in this documentation.

The supported server options are `--local`, `--port N`, and `--state <receipt.json>`, alongside required `--root <explicit-approved-artifact-dir>`. An explicit local-only run is:

```bash
ned serve --root /absolute/approved/review-root --local --port 4311 --state /absolute/private/com-local.json
```

A localhost URL is **local-only**: it does not open on another person's phone/computer. Missing cloudflared or a failed public tunnel is a blocker to public sharing, not permission to claim that local mode is public.

You may reuse an owned healthy server only after verifying its exact root, private receipt, process ownership, mode, and current reader/artifact responses. Do not trust a stale receipt or unrelated port listener, kill unknown processes, or overwrite another sharing workflow's receipt.

## Check what the recipient will see

Open every exact CLI-returned HTTPS deep link and check the selected artifact, not just a `200` response from the homepage. Confirm recognizable current report text, the correct image/PDF, working media playback, or the expected safe download. Check Markdown links and relative images. Hand off one labeled verified link per intended artifact; if a file or tunnel cannot be verified, report that blocker instead of inventing success.

The reader uses Node native HTTP, sanitized `marked` Markdown, and browser-native media. Relative report links open the reader, resolved from the selected Markdown file's directory within the same capability-approved root. Relative PNG/JPEG/GIF/WebP images load through the capability's raw artifact API; encoded spaces, Unicode and nested paths are supported. Parent-directory references are allowed only when they remain inside the approved root. Missing, filtered, oversized, symlink, root-escaping and non-image assets do not become active dependencies. External/protocol-relative/data images are removed; external HTTP(S) links open separately without a referrer. HTML and SVG are shown as inert text, never executed or used as inline Markdown images.

Rendering depends on file type and browser codecs. The current reader has no download/fallback button and excludes unsupported formats. If playback or rendering fails, report the limitation and hand off a separately verified approved original or another authorized sharing route; do not claim a download was verified merely because a reader link opened. This reader is not an executable HTML prototype host.

## Privacy and availability

**The URL is a bearer link. Anyone who obtains its capability can access the approved shared root.** It is not per-person authentication. Forward it only to intended recipients; do not publish receipts or capability-bearing URLs in public logs. Use an appropriate authenticated hosting workflow for sensitive material rather than treating an obscure URL as access control.

Cloudflare Quick Tunnels are temporary development/testing tunnels, have no SLA, and do not provide a guaranteed TTL or stable hostname. The host must remain online and awake (including a Mac), and both server and tunnel must stay running. Do not promise always-on hosting or permanent storage. See [Cloudflare Quick Tunnel limitations](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/).

## Refresh files

The reader serves the staged files. When a generated canonical artifact changes, inspect it again, update only its approved staged copy, then reload and verify the exact link's current bytes before saying it is refreshed. New files need the same scope/content checks and their own CLI-generated verified links. Existing recipients can see changed content at the same path; use versioned copies for a frozen review revision.

## Stop sharing

For a foreground server, press **Ctrl-C** in its terminal. For a managed background run, use the exact recorded owned process handle and ensure its owned tunnel is stopped. Check that the former exact HTTPS link no longer serves fresh reader/artifact content before claiming revocation. Do not kill every Node/cloudflared process. Deleting the receipt alone does not stop sharing, and shutdown cannot erase recipient downloads or caches.

After a restart, obtain new links with the CLI and verify them; old URLs may no longer work. Preserve canonical artifacts, and remove staged copies only with appropriate cleanup authority.

## Troubleshooting

| Symptom | Safe response |
| --- | --- |
| `cloudflared` missing | Follow official installation instructions with approval, or explicitly choose local-only mode. |
| Receipt exists but server is gone | Do not reuse it; start an owned instance with the correct root and private receipt. |
| Port already used | Check identity; use an available port/private receipt rather than killing an unrelated process. |
| Homepage opens, artifact does not | Verify the absolute file path, root membership, selected deep link, and current content; withhold handoff until corrected. |
| Media does not play inline | Check browser codec support; this reader has no download button. State the limitation and verify a separately approved original/fallback before handoff. |
| Mac sleeps or tunnel goes offline | Restore the owned process/host availability, obtain fresh links if needed, and reverify; do not promise an SLA. |

The behavioral eval is non-publishing and contains only synthetic fixtures. Schema validation/eval success is not evidence of a real public tunnel; live CLI and HTTPS verification are separate gates.
