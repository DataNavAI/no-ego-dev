# Connect a provider to NED

Start private `ned com` and use the loopback URL it prints. During development, use `node bin/ned.js` from this checkout for both COM and identity commands. Open **Settings → Provider connections**, or have the skill queue a request:

```sh
ned identity connect github --url http://127.0.0.1:12345
ned identity status github
```

Replace the example port with the actual port. A queued request also shows a provider-specific connection button in Chat after the reply. Click it to open Settings. Click **Refresh connections** if Settings was already open. Only confirm the identity you intended to connect.

| Provider | What to prepare | What NED verifies |
| --- | --- | --- |
| GitHub | Install gh (the NED container includes it). NED wraps gh auth login with isolated per-request configuration; no separate GitHub App setup is needed. An explicitly configured legacy `NED_GITHUB_APP_CLIENT_ID` remains supported. | The login returned by gh api user matches the username entered in Settings before confirmation. Repository permissions and organization SSO approval remain separate. |
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

Native provider connections are bound to the selected OS runtime home. The Hub-connected GitHub/AWS flow below stores its identity in the standalone container profile. Public tunnels, managed hosted instances and other container provider flows remain unavailable. Guarded IFA policies still apply.

## AWS in a Hub-registered standalone container

From Chat on your instance in NED Hub, ask NED to use AWS. The instance runs
`ned identity connect aws` locally. **Connect AWS** is available in Chat when AWS needs a connection. Select it and follow the
AWS IAM Identity Center sign-in in Settings. Confirm the displayed role and retry
the original request. The container includes AWS CLI; the selected identity
applies through `ned identity exec aws -- aws …`.

If an upgrade retains a previously seeded container profile, synchronize the provider identity skill from the new image before starting a fresh chat. Preserve operator-edited skill files.

## Request authorization from Hermes

Call the `ned` tool with `{"action":"request_provider_auth","provider":"aws"}`.
The user opens **Review connection** on the resulting NED Chat card. The modal
uses the same provider validation and confirmation as Settings. The card expires
with its request and cannot substitute a newer request after expiry or cancellation.

Hub-connected standalone NED supports GitHub and AWS. For a private native
COM listener, configure the Hermes process with `NED_IDENTITY_COM_ORIGIN`
set to the exact private `http://127.0.0.1:<port>` origin. This setting belongs
to the runtime operator. The tool does not accept a URL argument.

## GitHub CLI in native and owner-authorized Hub NED

Ask NED to connect GitHub, or open Message options → Connect GitHub on your Hub instance. The GitHub card/modal asks for the intended username and starts official `gh auth login --web` privately. Open GitHub and enter the code shown only in the private form, approve, select Check approval, verify the returned identity and confirm. No separate GitHub App is needed.

NED does not adopt ambient gh logins or copy another profile’s tokens. Each attempt uses private temporary CLI configuration; the verified token is imported into NED’s encrypted provider vault only on confirmation, and temporary CLI files are removed. Existing connected identity remains until confirmation. Cancel/expiry/shutdown terminates the owned login. Default CLI credentials may remain valid until revoked at GitHub; failures require reconnecting, not ambient fallback. Disconnect clears NED’s local identity; revoke the upstream grant in GitHub when needed.

Use `ned identity exec github -- gh api user` and an authorized relative repository API endpoint to check access. Identity verification alone does not prove private-repository or organization SSO access. Native gh must be installed; the image pins official gh2.88.1 with AMD64/ARM64 release archive checksums. Keep provider prompts and tokens out of chat/logs. [Official CLI login](https://cli.github.com/manual/gh_auth_login).
