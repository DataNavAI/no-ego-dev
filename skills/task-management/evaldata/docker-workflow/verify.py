import json
import hashlib
import os
from pathlib import Path
import subprocess

home = Path(os.environ["HERMES_HOME"]).resolve()
project = home / "workspace"
actor = "agent:workflow-eval"
env = {**os.environ, "NED_AGENT_HOME": str(home)}
for name in ("NED_DATABASE_URL", "NED_CORE_URL", "NODE_OPTIONS"):
    env.pop(name, None)
evidence = []


def require(condition, message="Persisted workflow does not match the fixture"):
    if not condition:
        raise AssertionError(message)


def cli(*arguments):
    command = ["/usr/local/bin/ned", *arguments, "--project", str(project),
               "--actor", actor, "--json"]
    result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=20)
    if result.returncode or result.stderr:
        raise RuntimeError("Independent NED CLI read failed")
    value = json.loads(result.stdout)
    evidence.append({"command": list(arguments), "sha256": hashlib.sha256(result.stdout.encode()).hexdigest()})
    return value


goals = cli("goal", "list")
tasks = cli("task", "list")
require(len(goals) == 1, "Expected exactly one goal")
require(goals[0]["title"] == "Synthetic release readiness")
require(len(tasks) == 3, "Expected exactly three tasks")
by_title = {task["title"]: task for task in tasks}
require(set(by_title) == {"Draft release note", "Verify release note", "Publish release"})
draft = by_title["Draft release note"]
verification = by_title["Verify release note"]
publication = by_title["Publish release"]
goal = cli("goal", "get", goals[0]["id"])
require(goal["status"] == "done")
require(goal["createdBy"] == actor)
require(draft["parentId"] == verification["parentId"] == goal["id"])
require(publication["parentId"] is None)
require(verification["dependencies"] == [draft["id"]])
for task in (draft, verification):
    require(task["createdBy"] == actor)
    item = cli("task", "get", task["id"])
    require(item["status"] == "done" and item["assignee"] == actor)
    history = cli("task", "history", task["id"])
    require([event["type"] for event in history].count("created") == 1)
    require([event["type"] for event in history].count("claimed") == 1)
    completed = [event for event in history if event["type"] == "completed"]
    require(len(completed) == 1 and completed[0]["value"]["reason"].strip())
    require(all(event["actor"] == actor for event in history))
draft_history = cli("task", "history", draft["id"])
verify_history = cli("task", "history", verification["id"])
draft_done = next(event for event in draft_history if event["type"] == "completed")
verify_claim = next(event for event in verify_history if event["type"] == "claimed")
require(draft_done["createdAt"] <= verify_claim["createdAt"])
require([event["type"] for event in verify_history].index("dependency_added") < [event["type"] for event in verify_history].index("claimed"))
require(verify_claim["previousValue"]["status"] == "ready")
goal_history = cli("goal", "history", goal["id"])
require(len([event for event in goal_history if event["type"] == "completed"]) == 1)
require(all(event["actor"] == actor for event in goal_history))
publication = cli("task", "get", publication["id"])
require(publication["status"] == "blocked" and publication["assignee"] is None)
require(publication["createdBy"] == actor)
require(publication["blocker"] == {"reason": "Awaiting operator approval",
                                  "service": "release-approval", "requiresUserAction": True})
publication_history = cli("task", "history", publication["id"])
require([event["type"] for event in publication_history] == ["created", "blocked"])
require(all(event["actor"] == actor for event in publication_history))
require(Path("RELEASE.txt").read_bytes() == b"Synthetic release is ready.\n")
delivery = cli("task", "delivery", draft["id"])
require(delivery["impact"] == "Operators can review the synthetic release note")
require(delivery["remainingSeconds"] is None and delivery["estimatedFinish"] is None)
require(delivery["outputs"] == [{"id": "release-note", "kind": "document",
                                "title": "Synthetic release note",
                                "text": "Synthetic release is ready.\n"}])
status = cli("status")
require(status["counts"] == {"planned": 0, "ready": 0, "working": 0, "blocked": 1, "done": 2})
tree = cli("tree")
require(len(tree) == 2)
goal_node = next(item for item in tree if item["id"] == goal["id"])
require(goal_node["storedStatus"] == "done")
require({child["id"] for child in goal_node["children"]} == {draft["id"], verification["id"]})
print(json.dumps({"status": "passed", "cli_readbacks": evidence,
                  "counts": status["counts"], "goal": {"id": goal["id"], "status": goal["status"], "storedStatus": goal_node["storedStatus"]},
                  "tasks": [{key: task[key] for key in ("id", "title", "status", "assignee", "parentId", "dependencies", "blocker")} for task in tasks],
                  "delivery": delivery}, separators=(",", ":")))
