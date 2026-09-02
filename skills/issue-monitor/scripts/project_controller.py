#!/usr/bin/env python3
"""Durable single-controller state for project-scoped issue-monitor jobs.

This module deliberately performs no shell, network, credential, profile, or cron
operations.  A setup adapter may apply the returned job binding only to the
setup-time allowlist.  A worker broker may consume a DISPATCHING idempotency key
only by atomically recording its acknowledgement through ``acknowledge_spawn``.
"""

from __future__ import annotations

import hashlib
import sqlite3
import time
from pathlib import Path
from typing import Any


class ControllerError(RuntimeError):
    pass


class AuthorizationError(ControllerError):
    pass


class TransitionRejected(ControllerError):
    pass


class ProjectController:
    """SQLite-backed job convergence and worker-dispatch state machine."""

    def __init__(self, state_path: str | Path):
        self.state_path = str(state_path)
        Path(self.state_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    repository TEXT NOT NULL,
                    tracker TEXT NOT NULL,
                    profile TEXT NOT NULL,
                    paused INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS setup_locks (
                    project_id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL,
                    lease_until REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS scheduler_jobs (
                    job_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    paused INTEGER NOT NULL DEFAULT 0,
                    prompt_digest TEXT NOT NULL DEFAULT '',
                    cadence TEXT NOT NULL DEFAULT ''
                );
                CREATE INDEX IF NOT EXISTS scheduler_jobs_project
                    ON scheduler_jobs(project_id);
                CREATE TABLE IF NOT EXISTS job_bindings (
                    project_id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tasks (
                    project_id TEXT NOT NULL,
                    task_id TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'UNCLAIMED'
                        CHECK(state IN ('UNCLAIMED','RESERVED','DISPATCHING','ACTIVE')),
                    attempt_id TEXT,
                    idempotency_key TEXT,
                    lease_until REAL,
                    receipt TEXT,
                    PRIMARY KEY(project_id, task_id)
                );
                CREATE INDEX IF NOT EXISTS tasks_selection
                    ON tasks(project_id, state, priority, task_id);
                CREATE TABLE IF NOT EXISTS worker_starts (
                    idempotency_key TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    task_id TEXT NOT NULL,
                    receipt TEXT NOT NULL UNIQUE,
                    acknowledged_at REAL NOT NULL
                );
                """
            )

    def _connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.state_path, timeout=30, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout=30000")
        return db

    @staticmethod
    def _row(row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    def initialize_project(
        self, project_id: str, repository: str, tracker: str, profile: str
    ) -> None:
        if not all(value and value.strip() == value for value in (project_id, repository, tracker, profile)):
            raise AuthorizationError("project allowlist values must be nonempty canonical strings")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute(
                "SELECT repository, tracker, profile FROM projects WHERE project_id=?",
                (project_id,),
            ).fetchone()
            expected = (repository, tracker, profile)
            if existing is not None and tuple(existing) != expected:
                db.rollback()
                raise AuthorizationError("stable project identity is already bound to a different allowlist")
            db.execute(
                "INSERT OR IGNORE INTO projects(project_id,repository,tracker,profile) VALUES(?,?,?,?)",
                (project_id, repository, tracker, profile),
            )
            db.commit()

    def authorize(self, project_id: str, repository: str, tracker: str, profile: str) -> None:
        with self._connect() as db:
            row = db.execute(
                "SELECT repository,tracker,profile FROM projects WHERE project_id=?",
                (project_id,),
            ).fetchone()
        if row is None or tuple(row) != (repository, tracker, profile):
            raise AuthorizationError("repository/tracker/profile does not match setup-time allowlist")

    def project(self, project_id: str) -> dict[str, Any]:
        with self._connect() as db:
            row = db.execute("SELECT * FROM projects WHERE project_id=?", (project_id,)).fetchone()
        if row is None:
            raise AuthorizationError("unknown project identity")
        result = dict(row)
        result["paused"] = bool(result["paused"])
        return result

    def set_project_paused(self, project_id: str, paused: bool) -> None:
        with self._connect() as db:
            changed = db.execute(
                "UPDATE projects SET paused=? WHERE project_id=?", (int(paused), project_id)
            ).rowcount
        if changed != 1:
            raise AuthorizationError("unknown project identity")

    def acquire_setup_lock(
        self, project_id: str, owner: str, *, now: float, lease_seconds: float
    ) -> bool:
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "DELETE FROM setup_locks WHERE project_id=? AND lease_until<=?",
                (project_id, now),
            )
            changed = db.execute(
                "INSERT OR IGNORE INTO setup_locks(project_id,owner,lease_until) VALUES(?,?,?)",
                (project_id, owner, now + lease_seconds),
            ).rowcount
            db.commit()
        return changed == 1

    def release_setup_lock(self, project_id: str, owner: str) -> bool:
        with self._connect() as db:
            changed = db.execute(
                "DELETE FROM setup_locks WHERE project_id=? AND owner=?", (project_id, owner)
            ).rowcount
        return changed == 1

    def setup_lock_owner(self, project_id: str) -> str | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT owner FROM setup_locks WHERE project_id=?", (project_id,)
            ).fetchone()
        return None if row is None else str(row["owner"])

    def seed_job(self, job_id: str, project_id: str, *, paused: bool) -> None:
        """Test/setup adapter seam representing scheduler job discovery."""
        with self._connect() as db:
            db.execute(
                "INSERT INTO scheduler_jobs(job_id,project_id,paused) VALUES(?,?,?) "
                "ON CONFLICT(job_id) DO UPDATE SET project_id=excluded.project_id,paused=excluded.paused",
                (job_id, project_id, int(paused)),
            )

    def upsert_project_job(
        self,
        project_id: str,
        attempt_id: str,
        prompt_digest: str,
        cadence: str,
    ) -> dict[str, Any]:
        """Converge scheduler discovery under one stable-identity setup lock.

        The durable binding wins over later duplicate discovery.  Without a
        binding the lexicographically first discovered job wins.  Pause is
        sticky: setup never resumes a paused project job.
        """
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if db.execute(
                "SELECT 1 FROM projects WHERE project_id=?", (project_id,)
            ).fetchone() is None:
                db.rollback()
                raise AuthorizationError("unknown project identity")

            # Lock acquisition, re-read, mutation, binding, convergence and
            # ownership-safe release are one durable transaction.
            now = time.time()
            db.execute(
                "DELETE FROM setup_locks WHERE project_id=? AND lease_until<=?",
                (project_id, now),
            )
            acquired = db.execute(
                "INSERT OR IGNORE INTO setup_locks(project_id,owner,lease_until) VALUES(?,?,?)",
                (project_id, attempt_id, now + 30),
            ).rowcount
            if acquired != 1:
                owner = db.execute(
                    "SELECT owner FROM setup_locks WHERE project_id=?", (project_id,)
                ).fetchone()
                if owner is None or owner["owner"] != attempt_id:
                    db.rollback()
                    raise ControllerError("setup is owned by another live attempt")
            binding = db.execute(
                "SELECT job_id FROM job_bindings WHERE project_id=?", (project_id,)
            ).fetchone()
            jobs = db.execute(
                "SELECT * FROM scheduler_jobs WHERE project_id=? ORDER BY job_id", (project_id,)
            ).fetchall()
            known_ids = {row["job_id"] for row in jobs}
            if binding is not None and binding["job_id"] in known_ids:
                job_id = str(binding["job_id"])
            elif jobs:
                job_id = str(jobs[0]["job_id"])
            else:
                digest = hashlib.sha256(project_id.encode("utf-8")).hexdigest()[:16]
                job_id = f"issue-monitor-{digest}"
                db.execute(
                    "INSERT INTO scheduler_jobs(job_id,project_id) VALUES(?,?)",
                    (job_id, project_id),
                )
                jobs = db.execute(
                    "SELECT * FROM scheduler_jobs WHERE project_id=?", (project_id,)
                ).fetchall()

            sticky_pause = any(bool(row["paused"]) for row in jobs)
            sticky_pause = sticky_pause or bool(
                db.execute(
                    "SELECT paused FROM projects WHERE project_id=?", (project_id,)
                ).fetchone()["paused"]
            )
            db.execute(
                "UPDATE scheduler_jobs SET paused=?,prompt_digest=?,cadence=? WHERE job_id=?",
                (int(sticky_pause), prompt_digest, cadence, job_id),
            )
            db.execute(
                "DELETE FROM scheduler_jobs WHERE project_id=? AND job_id<>?",
                (project_id, job_id),
            )
            db.execute(
                "INSERT INTO job_bindings(project_id,job_id) VALUES(?,?) "
                "ON CONFLICT(project_id) DO UPDATE SET job_id=excluded.job_id",
                (project_id, job_id),
            )
            released = db.execute(
                "DELETE FROM setup_locks WHERE project_id=? AND owner=?",
                (project_id, attempt_id),
            ).rowcount
            if released != 1:
                db.rollback()
                raise ControllerError("setup lock ownership changed before release")
            row = db.execute(
                "SELECT * FROM scheduler_jobs WHERE job_id=?", (job_id,)
            ).fetchone()
            db.commit()
        return self._job_dict(row)

    @staticmethod
    def _job_dict(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "job_id": row["job_id"],
            "project_id": row["project_id"],
            "paused": bool(row["paused"]),
            "prompt_digest": row["prompt_digest"],
            "cadence": row["cadence"],
        }

    def list_project_jobs(self, project_id: str) -> list[dict[str, Any]]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT * FROM scheduler_jobs WHERE project_id=? ORDER BY job_id", (project_id,)
            ).fetchall()
        return [self._job_dict(row) for row in rows]

    def add_task(self, project_id: str, task_id: str, *, priority: int, content: str) -> None:
        # Content is stored as opaque untrusted data and is never evaluated,
        # interpolated into a command, or included in a dispatch receipt.
        with self._connect() as db:
            db.execute(
                "INSERT INTO tasks(project_id,task_id,priority,content) VALUES(?,?,?,?)",
                (project_id, task_id, priority, content),
            )

    @staticmethod
    def _key(project_id: str, task_id: str, attempt_id: str) -> str:
        return f"{project_id}:{task_id}:{attempt_id}"

    def reserve(
        self,
        project_id: str,
        task_id: str,
        attempt_id: str,
        *,
        now: float,
        lease_seconds: float = 30,
    ) -> str:
        key = self._key(project_id, task_id, attempt_id)
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            changed = db.execute(
                "UPDATE tasks SET state='RESERVED',attempt_id=?,idempotency_key=?,"
                "lease_until=?,receipt=NULL WHERE project_id=? AND task_id=? AND state='UNCLAIMED'",
                (attempt_id, key, now + lease_seconds, project_id, task_id),
            ).rowcount
            if changed != 1:
                db.rollback()
                raise TransitionRejected("UNCLAIMED -> RESERVED compare-and-set rejected")
            db.commit()
        return key

    def begin_dispatch(self, idempotency_key: str, *, now: float) -> None:
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            changed = db.execute(
                "UPDATE tasks SET state='DISPATCHING' WHERE idempotency_key=? "
                "AND state='RESERVED' AND lease_until>?",
                (idempotency_key, now),
            ).rowcount
            if changed != 1:
                db.rollback()
                raise TransitionRejected("RESERVED -> DISPATCHING compare-and-set rejected")
            db.commit()

    def acknowledge_spawn(
        self, idempotency_key: str, receipt: str, *, now: float
    ) -> dict[str, Any]:
        """Atomically acknowledge broker acceptance and make one worker visible.

        The worker broker must use the idempotency key as its unique spawn key;
        it must not start an external worker unless this acknowledgement commits.
        """
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT * FROM tasks WHERE idempotency_key=?", (idempotency_key,)
            ).fetchone()
            if row is None:
                db.rollback()
                raise TransitionRejected("attempt is no longer current (fenced)")
            if row["state"] == "ACTIVE" and row["receipt"] == receipt:
                db.commit()
                return {"idempotency_key": idempotency_key, "receipt": receipt}
            if row["state"] != "DISPATCHING" or row["lease_until"] <= now:
                db.rollback()
                raise TransitionRejected("DISPATCHING -> ACTIVE compare-and-set rejected")
            try:
                db.execute(
                    "INSERT INTO worker_starts(idempotency_key,project_id,task_id,receipt,acknowledged_at) "
                    "VALUES(?,?,?,?,?)",
                    (idempotency_key, row["project_id"], row["task_id"], receipt, now),
                )
            except sqlite3.IntegrityError as error:
                db.rollback()
                raise TransitionRejected("spawn key or receipt already consumed") from error
            changed = db.execute(
                "UPDATE tasks SET state='ACTIVE',receipt=?,lease_until=NULL "
                "WHERE idempotency_key=? AND state='DISPATCHING'",
                (receipt, idempotency_key),
            ).rowcount
            if changed != 1:
                db.rollback()
                raise TransitionRejected("spawn acknowledgement lost ownership")
            db.commit()
        return {"idempotency_key": idempotency_key, "receipt": receipt}

    def _recover_stale(self, db: sqlite3.Connection, project_id: str, now: float) -> None:
        db.execute(
            "UPDATE tasks SET state='UNCLAIMED',attempt_id=NULL,idempotency_key=NULL,"
            "lease_until=NULL,receipt=NULL WHERE project_id=? "
            "AND state IN ('RESERVED','DISPATCHING') AND lease_until<=?",
            (project_id, now),
        )

    def reconcile(
        self,
        project_id: str,
        attempt_id: str,
        *,
        now: float,
        manual_setup: bool = False,
        lease_seconds: float = 30,
    ) -> dict[str, Any]:
        """Run one bounded issue-monitor reconciliation.

        A setup manual run is always read-only dry-run/no-launch.  An ordinary
        active run performs all local transitions atomically and starts at most
        one worker.  Real adapters split dispatch and broker acknowledgement at
        these same durable state boundaries.
        """
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            project = db.execute(
                "SELECT paused FROM projects WHERE project_id=?", (project_id,)
            ).fetchone()
            if project is None:
                db.rollback()
                raise AuthorizationError("unknown project identity")
            self._recover_stale(db, project_id, now)
            eligible = db.execute(
                "SELECT * FROM tasks WHERE project_id=? AND state='UNCLAIMED' "
                "ORDER BY priority,task_id",
                (project_id,),
            ).fetchall()
            paused = bool(project["paused"])
            if manual_setup or paused:
                db.commit()
                return {
                    "project_id": project_id,
                    "mode": "DRY_RUN",
                    "paused": paused,
                    "eligible_count": len(eligible),
                    "started": 0,
                }
            active = db.execute(
                "SELECT 1 FROM tasks WHERE project_id=? AND state IN "
                "('RESERVED','DISPATCHING','ACTIVE') LIMIT 1",
                (project_id,),
            ).fetchone()
            if active is not None or not eligible:
                db.commit()
                return {
                    "project_id": project_id,
                    "mode": "ACTIVE",
                    "paused": False,
                    "eligible_count": len(eligible),
                    "started": 0,
                }
            task = eligible[0]
            key = self._key(project_id, task["task_id"], attempt_id)
            lease_until = now + lease_seconds
            changed = db.execute(
                "UPDATE tasks SET state='RESERVED',attempt_id=?,idempotency_key=?,lease_until=? "
                "WHERE project_id=? AND task_id=? AND state='UNCLAIMED'",
                (attempt_id, key, lease_until, project_id, task["task_id"]),
            ).rowcount
            if changed != 1:
                db.rollback()
                raise TransitionRejected("concurrent reservation won compare-and-set")
            db.execute(
                "UPDATE tasks SET state='DISPATCHING' WHERE idempotency_key=? AND state='RESERVED'",
                (key,),
            )
            receipt = f"dispatch:{hashlib.sha256(key.encode('utf-8')).hexdigest()}"
            db.execute(
                "INSERT INTO worker_starts(idempotency_key,project_id,task_id,receipt,acknowledged_at) "
                "VALUES(?,?,?,?,?)",
                (key, project_id, task["task_id"], receipt, now),
            )
            db.execute(
                "UPDATE tasks SET state='ACTIVE',receipt=?,lease_until=NULL "
                "WHERE idempotency_key=? AND state='DISPATCHING'",
                (receipt, key),
            )
            db.commit()
        return {
            "project_id": project_id,
            "mode": "ACTIVE",
            "paused": False,
            "eligible_count": len(eligible),
            "started": 1,
            "task_id": task["task_id"],
            "idempotency_key": key,
            "receipt": receipt,
        }

    def task(self, project_id: str, task_id: str) -> dict[str, Any]:
        with self._connect() as db:
            row = db.execute(
                "SELECT project_id,task_id,priority,state,attempt_id,idempotency_key,lease_until,receipt "
                "FROM tasks WHERE project_id=? AND task_id=?",
                (project_id, task_id),
            ).fetchone()
        if row is None:
            raise KeyError(task_id)
        return dict(row)

    def worker_start_count(self, project_id: str, task_id: str | None = None) -> int:
        query = "SELECT COUNT(*) FROM worker_starts WHERE project_id=?"
        params: tuple[Any, ...] = (project_id,)
        if task_id is not None:
            query += " AND task_id=?"
            params = (project_id, task_id)
        with self._connect() as db:
            return int(db.execute(query, params).fetchone()[0])
