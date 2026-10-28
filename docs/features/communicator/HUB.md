# Connect NED COM to NED Hub

Authenticate this machine through your browser:

```sh
ned hub login --hub https://staging.hub.datanav.app
```

The browser opens your Hub's sign-in and explicit **Approve CLI access** page. Sign in with an allowed Google account, approve this CLI, and return to the terminal. `--no-browser` prints the authorization URL for opening manually on this same machine. The callback uses an ephemeral loopback listener on 127.0.0.1; remote browsers cannot reach it. Login times out after five minutes; Ctrl-C cancels. Denied, interrupted and failed attempts preserve any previous credential.

The CLI is an OAuth public client using authorization code + S256 PKCE; Google OAuth stays on the Hub. NED does not receive Google provider credentials, and the resulting Hub token has the same account permissions as a manually issued CLI token. Tokens are saved separately for each canonical Hub origin under `~/.ned/hub-credentials/` (0700 directory, 0600 files, atomic replacement, no symlinks/unsafe permissions). Mutations use a bounded per-origin lock so a stale logout cannot erase a newer login. A completed credential replacement or removal stays successful if lock cleanup fails: the CLI reports success plus “NED Hub credential lock cleanup failed” recovery guidance. It does not revoke a saved token or claim a deleted credential was retained. If a process crashes while holding a lock, later mutations fail safely after five seconds; confirm no login/logout process is running before removing only that origin's `.json.lock` directory and retrying. Native saved credentials currently support macOS/Linux; Windows storage is rejected rather than claiming POSIX permission protection. Never copy or commit that directory.

Set these variables in the environment used to run `ned com`:

- `NED_HUB_URL`: Hub control origin, for example `https://staging.hub.datanav.app`.
- `NED_HUB_TOKEN`: optional explicit private CLI token, which takes precedence over the saved OAuth credential. You can still create one in Hub CLI access. Never commit it or put it in shell arguments/logs.
- `NED_HUB_SLUG`: stable 3–40 character lowercase alphanumeric/hyphen identity, starting with a letter (a trailing hyphen is valid). Reserved names api, auth, tunnel, healthz, assets, connect, favicon, robots, login and logout are unavailable. Slug ownership is permanent, including after deletion.
- `NED_HUB_NAME`: optional display name up to 80 characters; defaults to slug.
- `NED_HUB_PROXY_URL`: optional trusted tunnel origin; defaults to `https://proxy.staging.hub.datanav.app` for that example. Set explicitly for custom proxy hosts or local API/proxy listeners with different ports.

`NED_HUB_INSTANCE_ORIGINS` is optional for loopback-only local Hub/proxy origins: default `false` matches the Hub development default (shared localhost origin). Set `true` when the local Hub uses `INSTANCE_ORIGINS=true`, with a localhost proxy hostname so the instance origin is `<slug>.localhost`. Remote connections always require isolated instance origins; `false` is rejected remotely. Values other than `true`/`false` are invalid.

With none set, COM remains local-only. A configured Hub URL and slug use that origin's saved OAuth token when NED_HUB_TOKEN is absent. Partial/invalid configuration or missing login exits with guidance. `ned com` starts the local server first, then registers through bearer-authenticated `POST /api/instances` with `{slug,name}`. No web instance-registration form or separate Hub agent installation is needed. A successful response supplies `tunnelUrl`, which must exactly match the configured trusted proxy `/tunnel/control?slug=...` WebSocket endpoint. Remote browser access remains authenticated by Hub and isolated on `<slug>.<proxy-host>`; local mode must match the Hub configuration above.

The CLI reports connecting/online/offline without exposing the token. Temporary network/server failures retry registration and reconnect with capped exponential backoff; local COM remains available. A rejected registration (400/401/403/409) stops remote retry: fix configuration, issue a new token when appropriate, and restart. SIGINT/SIGTERM closes the tunnel and local COM. Revoke unused CLI tokens through Hub.

The native tunnel adapter streams HTTP requests/responses with backpressure to the local COM server. It validates Hub-provided instance Host/protocol/slug and exact browser Origin before translating to the loopback Host/Origin expected by COM. The bridge has no listening port. Current COM exposes HTTP resources; adding a COM WebSocket interface requires extending and testing that adapter first. These protocol fixtures do not establish live OAuth, hosted TLS or cross-account security acceptance.

## Sign out

```sh
ned hub logout --hub https://staging.hub.datanav.app
```

Logout revokes this saved Hub token and removes the matching local credential. Other Hub origins and explicit environment tokens are unaffected. If the network or Hub is unavailable, logout returns failure and retains the credential for retry; it does not claim remote revocation. An already-revoked token is cleared locally. You can also revoke CLI tokens from the Hub website. Both commands accept `NED_HUB_URL` instead of `--hub`; there is no implicit production Hub default.

The OAuth routes are `/api/oauth/authorize` (public client `ned-cli`), JSON POST `/api/oauth/token` for code exchange, and native bearer DELETE `/api/oauth/token` for revocation. Redirects during token exchange/revocation are rejected. A callback's code is short-lived and bound to the original redirect and verifier; no token is carried in a URL.
