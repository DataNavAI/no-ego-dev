#!/usr/bin/env python3
"""Promote one owned local NED container from verified no-ego-dev main."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid

ROOT = Path.home() / ".local/share/ned-local-container"
CONTAINER = "ned-local-mac"
CONTEXT = "colima-ned-staging"
REPOSITORY = "DataNavAI/no-ego-dev"
SOURCE = "https://github.com/" + REPOSITORY + ".git"
LABEL = "org.no-ego-dev.local-owner"
REVISION = "org.opencontainers.image.revision"
GENERATION = "org.no-ego-dev.local-generation"
INSTANCE = "org.no-ego-dev.local-instance"
DATA = ("/opt/data", "/var/lib/ned", "/projects")
JOURNAL = ROOT / "promotion.json"
MAINTENANCE = "/opt/ned/scripts/container/local-maintenance.mjs"


def command(*args, timeout=30, **options):
    return subprocess.run(args, timeout=timeout, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, **options).stdout.strip()


def docker(*args, **options):
    return command("docker", "--context", CONTEXT, *args, **options)


def inspect(name):
    found = docker("container", "ls", "-a", "--filter", f"name=^/{name}$", "--format", "{{.Names}}")
    if not found:
        return None
    item = json.loads(docker("container", "inspect", name))[0]
    if item["Config"]["Labels"].get(LABEL) != CONTAINER:
        raise RuntimeError("The configured container is owned by a different deployment")
    return item


def save(value):
    temporary = JOURNAL.with_suffix(".tmp")
    with temporary.open("w") as f:
        json.dump(value, f)
        f.flush()
        os.fsync(f.fileno())
    temporary.replace(JOURNAL)


def lease(name, action, request):
    result = json.loads(docker("exec", "--user", "hermes", name, "node", MAINTENANCE, action,
                               json.dumps(request, separators=(",", ":"))))
    if any(result.get(key) != request[key] for key in ("requestId", "instanceId", "generation")):
        raise RuntimeError("Maintenance response belongs to a different container generation")
    return result


def settle():
    if not JOURNAL.exists():
        return
    state = json.loads(JOURNAL.read_text())
    current = inspect(CONTAINER)
    previous = inspect(state["previous"])
    if previous:
        if previous["Id"] != state["old"]:
            raise RuntimeError("Rollback container identity changed")
        if current:
            if current["Config"]["Labels"].get(REVISION) != state["revision"]:
                raise RuntimeError("Candidate container identity changed")
            if current["State"]["Running"]:
                docker("stop", "--time", "30", CONTAINER, timeout=45)
            docker("rename", CONTAINER, state["previous"] + "-failed")
        docker("rename", state["previous"], CONTAINER)
        current = inspect(CONTAINER)
    if not current or current["Id"] != state["old"]:
        raise RuntimeError("Cannot identify the original container for recovery")
    if not current["State"]["Running"]:
        docker("start", CONTAINER)
    for _ in range(30):
        try:
            result = lease(CONTAINER, "release", state["lease"])
            if result.get("released") is True:
                journal_done()
                return
        except subprocess.CalledProcessError:
            pass
        time.sleep(1)
    raise RuntimeError("Previous generation restarted, but its maintenance lease is still unverified")


def journal_done():
    JOURNAL.unlink()


def verified_revision(repo):
    command("git", "-C", repo, "fetch", "--no-tags", SOURCE, "refs/heads/main", timeout=120)
    revision = command("git", "-C", repo, "rev-parse", "FETCH_HEAD")
    output = command("gh", "run", "list", "-R", REPOSITORY, "--branch", "main", "--commit", revision,
                     "--event", "push", "--limit", "20", "--json", "databaseId,name,status,conclusion")
    runs = json.loads(output)
    for workflow in ("NED CLI", "Smoke test"):
        current = max((row for row in runs if row["name"] == workflow),
                      key=lambda row: row["databaseId"], default=None)
        if not current or current["status"] != "completed" or current["conclusion"] != "success":
            return None
    return revision


def build(repo, revision):
    tag = "ned-local-build:" + revision
    with tempfile.TemporaryFile() as archive:
        subprocess.run(["git", "-C", repo, "archive", revision], check=True, stdout=archive)
        archive.seek(0)
        docker("build", "--label", f"{REVISION}={revision}", "--tag", tag, "-", stdin=archive, timeout=1800)
    image = json.loads(docker("image", "inspect", tag))[0]
    if image["Config"]["Labels"][REVISION] != revision:
        raise RuntimeError("Built image has the wrong revision")
    return image["Id"]


def run(revision, image, instance, generation, volumes):
    args = ["run", "-d", "--name", CONTAINER, "--restart", "unless-stopped", "--stop-timeout", "30",
            "--label", f"{LABEL}={CONTAINER}", "--label", f"{REVISION}={revision}",
            "--label", f"{GENERATION}={generation}", "--label", f"{INSTANCE}={instance}",
            "--env-file", str(ROOT / "runtime.env"), "--publish", "127.0.0.1:18793:8787",
            "--env", "NED_LOCAL_MAINTENANCE=1", "--env", f"NED_MANAGED_INSTANCE_ID={instance}",
            "--env", f"NED_MANAGED_GENERATION={generation}", "--env", "NED_HUB_TOKEN_FILE=/run/ned-hub/token",
            "--env", "NED_HUB_URL=https://staging.ned.datanav.app", "--env", "NED_INSTANCE_NAME=moonk-local-ned",
            "--volume", "ned-local-mac-hub:/run/ned-hub:ro"]
    for origin, destination in zip(volumes, DATA, strict=True):
        args.extend(["--volume", f"{origin}:{destination}"])
    docker(*args, image)


def copy_volumes(old, image, generation, suffix):
    volumes = []
    for index, destination in enumerate(DATA):
        source = next((item["Name"] for item in old["Mounts"]
                       if item["Type"] == "volume" and item["Destination"] == destination), None)
        if not source or not source.startswith("ned-local-mac-"):
            raise RuntimeError("Unexpected source data volume")
        target = f"{CONTAINER}-g{generation}-{suffix}-{index}"
        docker("volume", "create", "--label", f"{LABEL}={CONTAINER}", target)
        docker("run", "--rm", "--network", "none",
               "--mount", f"type=volume,source={source},target=/from,readonly",
               "--mount", f"type=volume,source={target},target=/to",
               "--entrypoint", "/bin/sh", image, "-ec", "cp -a /from/. /to/", timeout=1800)
        volumes.append(target)
    return volumes


def ready():
    for _ in range(60):
        current = inspect(CONTAINER)
        if current and current["State"]["Health"]["Status"] == "healthy":
            lines = docker("logs", "--since", current["State"]["StartedAt"], CONTAINER).splitlines()
            states = [line for line in lines if line.startswith("NED Hub: ")]
            if states and states[-1] == "NED Hub: online":
                return
        time.sleep(3)
    raise RuntimeError("Candidate did not become healthy and online on staging Hub")


def update(repo):
    settle()
    current = inspect(CONTAINER)
    if not current or not current["State"]["Running"]:
        return print("Deferred: the owned container is stopped or absent")
    labels = current["Config"]["Labels"]
    revision = verified_revision(repo)
    if not revision:
        return print("Deferred: current main still needs successful CI")
    if revision == labels[REVISION]:
        return print("Unchanged: " + revision)
    if not labels.get(INSTANCE) or not labels.get(GENERATION):
        return print("Deferred: the running container predates local maintenance")
    generation = int(labels[GENERATION])
    image = build(repo, revision)
    if verified_revision(repo) != revision:
        return print("Deferred: main changed during the build")
    request = {"requestId": str(uuid.uuid4()), "instanceId": labels[INSTANCE], "generation": generation,
               "targetImage": "ned-local-build@" + image}
    status = lease(CONTAINER, "prepare", request)
    if not status.get("ready"):
        return print("Deferred: " + status["reason"])
    suffix = request["requestId"][:8]
    previous = f"{CONTAINER}-old-g{generation}-{suffix}"
    save({"old": current["Id"], "previous": previous, "revision": revision, "lease": request})
    try:
        if not lease(CONTAINER, "commit", request).get("ready"):
            raise RuntimeError("Activity invalidated the prepared lease")
        docker("stop", "--time", "30", CONTAINER, timeout=45)
        volumes = copy_volumes(current, image, generation + 1, suffix)
        docker("rename", CONTAINER, previous)
        run(revision, image, labels[INSTANCE], generation + 1, volumes)
        ready()
        lease(CONTAINER, "status", {**request, "generation": generation + 1})
        journal_done()
        print("Promoted " + revision + "; rollback container retained: " + previous)
    except BaseException:
        settle()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()
    os.umask(0o077)
    with (ROOT / "update.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        update(args.repo)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, subprocess.SubprocessError) as error:
        # Docker/Git errors can contain private runtime context in their stderr.
        if isinstance(error, subprocess.CalledProcessError):
            print("Update blocked at " + str(error.cmd[0]) + " (exit " + str(error.returncode) + ")")
        else:
            print("Update blocked: " + str(error))
        raise SystemExit(1) from None
