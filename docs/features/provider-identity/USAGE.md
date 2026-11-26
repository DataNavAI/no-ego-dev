# Connect a provider to native NED

Start private `ned com` and use the loopback URL it prints. During development, use `node bin/ned.js` from this checkout for both COM and identity commands. Open **Settings → Provider connections**, or have the skill queue a request:

```sh
ned identity connect github --url http://127.0.0.1:12345
ned identity status github
```

Replace the example port with the actual port. A queued request also shows a provider-specific connection button in Chat after the reply. Click it to open Settings. Click **Refresh connections** if Settings was already open. Only confirm the identity you intended to connect.

| Provider | What to prepare | What NED verifies |
| --- | --- | --- |
| GitHub | An administrator registers a GitHub App with device flow and expiring user tokens enabled. Set its public client ID as `NED_GITHUB_APP_CLIENT_ID` in the environment that starts native COM. Install the app with the minimum repository permissions needed. | The login returned by GitHub matches the username entered in Settings. Repository access depends on the app installation and that user's permission. |
| AWS | An official IAM Identity Center access portal, its commercial AWS region, and an account ID and role assigned to the sign-in identity. | The selected account/role actually issues temporary role credentials. Configure the target service region on the AWS command if it differs from the Identity Center region. |
| GoDaddy | A scoped Domains v3 PAT and the exact managed domain. The domain read requires `domains.domain:read`. | The provider returns the requested registered domain to the supplied PAT. NED does not infer broader domain permissions from this check. |

Provider references: [GitHub App device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app#using-the-device-flow-to-generate-a-user-access-token), [AWS Identity Center](https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_StartDeviceAuthorization.html), [GoDaddy authentication](https://developer.godaddy.com/en/docs/api-users/auth).

Use a connected identity explicitly:

```sh
ned identity exec github -- gh api user
ned identity exec aws -- aws sts get-caller-identity
ned identity domain
```

The GitHub wrapper accepts relative `gh api` paths. The AWS wrapper needs an installed AWS CLI. Both wrappers pass credentials only to a trusted provider executable and use separate CLI configuration. They do not grant a sandbox to the process or authorize command side effects. GoDaddy use currently provides a domain read. Reconnect when GitHub or AWS sessions expire. Disconnect removes the local connection. Use provider security settings to revoke upstream access.

This feature is bound to the native NED OS home and private loopback COM. It does not use a project task database as a vault or alter existing guarded IFA access. Public tunnels, the isolated named NED staging runtime, Hub-bridged access and container COM do not expose these controls.
