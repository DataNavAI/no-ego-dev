# NED API contracts

Canonical interface index; [feature specifications](features/README.md) retain detailed schemas and [architecture](architecture.md) owns component boundaries. Current COM interfaces are in `apps/com/src/server.js` and `chat.js`.

## Browser chat

COM binds loopback with exact Host/Origin checks. The native connector validates the public instance origin before translating to loopback. Writes require Origin and JSON content type. Provider credentials stay behind COM; browser authorization does not grant the separate operator-authenticated `/api/core` interface.

| Method/path | Contract |
| --- | --- |
| POST /api/chat/sessions/fixed | `{}` →200 fixed `nedcom-main` session; read-before-create, preserve exact identity |
| GET /api/chat/sessions |200 `{data,has_more}` session catalog |
| GET /api/chat/sessions/:session/messages?offset=N |200 `{data}` history; preserve canonical row IDs |
| POST /api/chat/sessions/:session/chat | `{input,attachments?,references?}` →202 `{turn:{id,status:"pending"}}`; retain exact turn ID; one pending turn per gateway/session |
| GET /api/chat/sessions/:session/turns/:id/events?cursor=N | SSE activity/delta/terminal; retain exact cursor, require verified terminal completion |
| GET /api/chat/sessions/:session/turns/:id | Current bounded turn result/status |
| POST /api/chat/sessions/:session/turns/:id/stop | `{}` →200 bound turn status; terminal repeats cannot stop later runs |

An authenticated matching cancellation while an owned Stop is in flight establishes stopped completion and preserves partial text even before HTTP acknowledgement. Unsolicited/foreign cancellation fails. Unknown context404, invalid input400, invalid browser write403, pending conflict409, stream/poll limits429, unavailable gateway503. Inference can fail after202: terminal failed with sanitized `gateway_unavailable` is not success. Never return provider credentials, raw upstream failure bodies or refresh grants.

`/api/health` proves process health only. Guided model setup and account inheritance are planned in native#182/Hub#135. Provider/OAuth acceptance is separate from deterministic transport tests.
