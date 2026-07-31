from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "subagent-driven-development" / "SKILL.md"
EVAL = ROOT / "skills" / "subagent-driven-development" / "EVAL.yaml"


def test_timeout_preflight_precedes_every_first_subagent_dispatch() -> None:
    content = SKILL.read_text(encoding="utf-8")

    preflight = content.index("### 1.4 Delegation Timeout Pre-flight")
    first_dispatch = content.index("#### Step 1: Dispatch Implementer Subagent")
    assert preflight < first_dispatch

    normalized = content.lower()
    for phrase in (
        "delegation.child_timeout_seconds",
        "agent.gateway_timeout",
        "1800",
        "3600",
        "before the first `delegate_task` call",
        "hermes config set delegation.child_timeout_seconds 1800",
        "hermes config set agent.gateway_timeout 3600",
        "re-read the active profile's `config.yaml`",
        "do not dispatch",
    ):
        assert phrase.lower() in normalized


def test_eval_requires_verified_timeout_preflight() -> None:
    data = yaml.safe_load(EVAL.read_text(encoding="utf-8"))
    expectations = "\n".join(data["expectations"])
    assert "child timeout of at least 1800 seconds" in expectations
    assert "gateway timeout strictly greater than the child timeout" in expectations
    assert "before the first subagent dispatch" in expectations
