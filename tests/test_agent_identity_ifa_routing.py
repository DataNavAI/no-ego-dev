from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
AGENT_SKILL = ROOT / "skills" / "agent-identity-and-access" / "SKILL.md"
IFA_SKILL = ROOT / "skills" / "identity-for-agent" / "SKILL.md"


def test_canonical_identity_skill_prefers_guarded_ifa_and_fails_closed():
    text = AGENT_SKILL.read_text(encoding="utf-8")

    required = (
        "IFA-first authorization routing",
        "ifa_profile_guard.py",
        "direct `ifa` invocation",
        "implicit global store",
        "another profile's store",
        "least-privilege guarded request",
        "Treat approval as provisional",
        "Stop on account mismatch",
        "unsupported_operation",
        "gh api user --jq .login",
        "aws sts get-caller-identity",
        "Gmail send/modify",
        "official Hermes Google Workspace integration",
        "does not refresh a token while a child command runs",
        "another profile's credentials",
    )
    for phrase in required:
        assert phrase in text


def test_distributed_ifa_skill_preserves_guard_and_compatibility_boundary():
    text = IFA_SKILL.read_text(encoding="utf-8")

    assert "Every IFA operation must pass through" in text
    assert "Approval alone is not proof of access" in text
    assert "Stop on an account mismatch" in text
    assert "unsupported_operation" in text
    assert "Gmail send/modify" in text
    assert "does not refresh while a child command runs" in text
    assert "another profile's `google_token.json`" in text
    guarded_operations = (
        "run status",
        "run request <provider>",
        "run exec gh",
        "run google authorize",
        "run google verify",
        "run google refresh",
        "run google scopes",
        "run exec google",
        "run google revoke",
    )
    for operation in guarded_operations:
        assert operation in text
    assert re.search(r"(?m)^ifa(?:\s|$)", text) is None
