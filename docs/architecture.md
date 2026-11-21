# NED architecture

NED distributes a native CLI, COM browser application, core service and Hermes profile. Current implementations are in `apps/com` and `apps/core`; compatibility entrypoints retain supported old imports. [Feature specifications](features/README.md) and [API contracts](api.md) must change with implementation.

COM binds loopback and serves browser assets, project/workspace interfaces and chat. Its native Hub connector registers through Hub and opens an outbound authenticated WebSocket tunnel. The bridge validates exact instance Host/Origin before translating requests to loopback COM. Hub owns browser access and isolated public origins; ordinary interactions do not invoke Kubernetes.

Chat goes through COM's `/api/chat` gateway to the authenticated local Hermes API. COM owns bounded turn state/IDs, incremental events and cancellation; Hermes owns inference, provider access and session history. Operator-authenticated `/api/core` is a separate interface. Core owns local SQLite task/project data; provider credentials and configuration belong to the private Hermes profile, never this distribution.

An authenticated matching cancellation during an owned in-flight Stop may precede its HTTP acknowledgement. COM records stopped completion with accumulated text. Unsolicited/foreign cancellation fails. Communicator TC-039 holds the acknowledgement until terminal consumption; native#181 and Hub#134 track verification.

Account-level provider inheritance and guided setup are planned in Hub#135/native#182. Health is not proof of configured inference. Hub/ned-iac own hosted Kubernetes resources, account storage and rollout; this source does not prove deployed images. Preserve user workspaces and configured profiles across updates. Synthetic Hermes tests do not certify paid inference or hosted OAuth.
