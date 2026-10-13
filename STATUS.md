# Project status

Status: active. Updated: 2026-10-12 (America/Los_Angeles).

Current objective: deliver the local NED Communicator serially under [#113](https://github.com/DataNavAI/no-ego-dev/issues/113). Current source provides the credential-free `ned com` command, project chooser backed by the shared NED registry, and verified local WIP preview links. The skeleton landed in [PR #120](https://github.com/DataNavAI/no-ego-dev/pull/120).

Project browsing reads existing database records and selected canonical project folders without initializing, repairing or migrating data. User-owned `.nedcom.json` config points to an explicitly configured HTTP 127.0.0.1 preview; NEDCOM checks reachability but never starts an app. SQLite WAL/SHM coordination sidecars may be updated by SQLite during reads. Missing database/folder and unavailable previews have recoverable states.

Remaining outcomes: [artifact browsing #117](https://github.com/DataNavAI/no-ego-dev/issues/117) and [task browsing #118](https://github.com/DataNavAI/no-ego-dev/issues/118), which retain honest placeholders. Project/preview automated cases TC-005/006 are implemented; TC-003 rendered acceptance and exact-candidate review for #116 remain required before release. NEDCOM as a whole is not complete.

Canonical sources: [project/preview issue #116](https://github.com/DataNavAI/no-ego-dev/issues/116), [communicator SPEC](docs/features/communicator/SPEC.md), [technical design](docs/features/communicator/TECH_SPEC.md), [QA](QA.md), [task management](docs/features/task-management/SPEC.md).

Local Hermes staging [#123](https://github.com/DataNavAI/no-ego-dev/issues/123) is being prepared separately. Controller/native distribution adapter, guarded staging launchers and immutable main release builder have integration coverage; credential-free native profile/config/terminal/npm probes have evidence; final candidate readback, owner installation and scheduling remain pending. Automatic updates will use one Codex heartbeat after setup is verified; no model credentials or production profiles are copied. [Staging contract](docs/features/ned-staging/SPEC.md).
