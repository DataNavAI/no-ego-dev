# KakaoTalk Hermes Decision

Decision: **defer from `ned create` v0.2.0 and do not ship an unofficial adapter.**

## Why

Hermes can load platform plugins from a profile, but a plugin is only useful when the messaging provider exposes a supported inbound-message contract. Kakao’s public APIs do not currently provide the Telegram-style capability NED needs:

- Kakao Talk Message is an outbound, user-initiated feature for users/friends within the same service. It is not an arbitrary bot inbox.
- Kakao Talk Channel webhooks notify a service when a user adds or blocks a channel; they do not deliver 1:1 conversation messages.
- Wider messaging requires a Biz App/Business Channel, matching business identity, permissions/review, approved templates or commercial products, and a public HTTPS service.
- V1 uses an always-on Daytona Sandbox (`auto-stop=0`) with Telegram long polling. Kakao nevertheless needs separate public shared gateway infrastructure for supported webhook delivery.
- Personal-account automation, desktop scraping, or reverse-engineered protocols would be brittle and unsafe and will not be used.

## Product-compatible future architecture

```text
Kakao-approved business channel
  -> public shared webhook/gateway
  -> signature and tenant verification
  -> queue/idempotency/rate limits
  -> start or restore Daytona workspace
  -> Hermes/NED execution
  -> approved Kakao reply API
```

The gateway, Kakao business application, moderation policy, privacy notice, and tenant mapping are separate hosted product infrastructure. A profile can later distribute the Hermes-side adapter and skills, but not the required Kakao approval or public gateway.

## Revisit gate

Build only after all are true:

1. A project-owned verified Kakao business identity and channel exist.
2. Kakao grants an official API that receives the needed user messages and sends replies for this use case.
3. A public always-on gateway, queue, abuse controls, privacy policy, and operations owner are funded.
4. A contract test proves webhook verification, duplicate handling, authorization, wake latency, and reply delivery.

## Official sources reviewed

- Kakao Talk Channel concepts: https://developers.kakao.com/docs/en/kakaotalk-channel/common
- Kakao Talk Channel webhook: https://developers.kakao.com/docs/en/kakaotalk-channel/callback
- Kakao Talk Message concepts: https://developers.kakao.com/docs/en/kakaotalk-message/common
- Kakao Talk Message REST API: https://developers.kakao.com/docs/en/kakaotalk-message/rest-api

Telegram remains the better always-on beta channel because Hermes already supports it and Telegram exposes a direct bot update API. KakaoTalk does not fit profile-only distribution today.
