# Connect NED COM to NED Hub

Sign into your Hub and create a CLI token in CLI access. Set these variables securely in the environment used to run `ned com`:

- `NED_HUB_URL`: Hub control origin, for example `https://staging.hub.datanav.app`.
- `NED_HUB_TOKEN`: the private CLI token. Never commit it or put it in shell arguments/logs.
- `NED_HUB_SLUG`: stable 3–40 character lowercase alphanumeric/hyphen identity, starting with a letter (a trailing hyphen is valid). Reserved names api, auth, tunnel, healthz, assets, connect, favicon, robots, login and logout are unavailable. Slug ownership is permanent, including after deletion.
- `NED_HUB_NAME`: optional display name up to 80 characters; defaults to slug.
- `NED_HUB_PROXY_URL`: optional trusted tunnel origin; defaults to `https://proxy.staging.hub.datanav.app` for that example. Set explicitly for custom proxy hosts or local API/proxy listeners with different ports.

`NED_HUB_INSTANCE_ORIGINS` is optional for loopback-only local Hub/proxy origins: default `false` matches the Hub development default (shared localhost origin). Set `true` when the local Hub uses `INSTANCE_ORIGINS=true`, with a localhost proxy hostname so the instance origin is `<slug>.localhost`. Remote connections always require isolated instance origins; `false` is rejected remotely. Values other than `true`/`false` are invalid.

With none set, COM remains local-only. Partial/invalid configuration exits with guidance. `ned com` starts the local server first, then registers through bearer-authenticated `POST /api/instances` with `{slug,name}`. No web instance-registration form or separate Hub agent installation is needed. A successful response supplies `tunnelUrl`, which must exactly match the configured trusted proxy `/tunnel/control?slug=...` WebSocket endpoint. Remote browser access remains authenticated by Hub and isolated on `<slug>.<proxy-host>`; local mode must match the Hub configuration above.

The CLI reports connecting/online/offline without exposing the token. Temporary network/server failures retry registration and reconnect with capped exponential backoff; local COM remains available. A rejected registration (400/401/403/409) stops remote retry: fix configuration, issue a new token when appropriate, and restart. SIGINT/SIGTERM closes the tunnel and local COM. Revoke unused CLI tokens through Hub.

The native tunnel adapter streams HTTP requests/responses with backpressure to the local COM server. It validates Hub-provided instance Host/protocol/slug and exact browser Origin before translating to the loopback Host/Origin expected by COM. The bridge has no listening port. Current COM exposes HTTP resources; adding a COM WebSocket interface requires extending and testing that adapter first. These protocol fixtures do not establish live OAuth, hosted TLS or cross-account security acceptance.
