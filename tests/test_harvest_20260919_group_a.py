from pathlib import Path
import re

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]

REQUIRED = {
    "agent-identity-and-access": {
        "version": "0.1.1",
        "skill": [
            "profile-local gh_config_dir",
            "owner-authority provenance",
            "sanitized blocker",
            "staged saas access",
            "one-time secret",
            "ifa-first",
        ],
        "positive": "profile-local github identity and staged saas access",
        "boundary": "must not expose credentials or bypass ifa-first routing",
    },
    "android-app-dev": {
        "version": "0.1.1",
        "skill": [
            "non-secret expo/eas variable inventory",
            "consumer tracing",
            "agent-owned emulator qa",
            "visible version identity",
            "system back",
            "privacy-safe analytics",
            "play track and capability verification",
            "date-based versioncode",
        ],
        "positive": "expo/eas android release identity and emulator qa",
        "boundary": "must not retrieve secret values or assume date-based versioncode",
    },
    "architect": {
        "version": "0.2.12",
        "skill": [
            "system of record",
            "backup and restore",
            "public identity migration",
            "evidence timestamps",
            "managed security",
            "retained resource",
            "feature retirement",
            "repository-integrated handoff",
            "lifecycle and risk scope",
        ],
        "positive": "mvp durable system-of-record and lifecycle architecture",
        "boundary": "must not use a fixed review-round cap",
    },
    "coder": {
        "version": "0.4.2",
        "skill": [
            "current-base merge",
            "untrusted-model process isolation",
            "tty installer and credential checks",
            "exact-base/head recovery",
            "fail-closed validator",
            "durable transaction",
            "source/evidence closure",
            "consumer parity",
            "provider/domain recipes are scoped",
        ],
        "positive": "recover and validate an exact-base implementation",
        "boundary": "must not execute untrusted model output in-process",
    },
    "delegation-reliability": {
        "version": "1.14.10",
        "skill": [
            "durable draft-pr checkpoint",
            "exact kanban board pinning",
            "controller tick versus worker ownership",
            "persisted prompt reconciliation",
            "gui readiness",
            "current-base multi-pr convergence",
            "sequential focus is explicit",
            "no competing controller authority",
        ],
        "positive": "restart-durable delegated delivery on one pinned board",
        "boundary": "must not create a competing controller or force sequential focus",
    },
    "devops": {
        "version": "0.7.5",
        "skill": [
            "safe expo/eas secret inventory",
            "immutable deployment",
            "ci lane governance",
            "exact-commit enablement",
            "retained or imported infrastructure",
            "live acceptance",
            "cross-repository cd",
            "installer and outage recovery",
            "deployment versus content quality",
            "analytics forwarding",
        ],
        "positive": "immutable cross-repository deployment and live acceptance",
        "boundary": "must not import nested skills or run unaudited secret scripts",
    },
}


def _frontmatter(text: str) -> dict:
    match = re.match(r"\A---\n(.*?)\n---\n", text, re.DOTALL)
    assert match, "missing frontmatter"
    return yaml.safe_load(match.group(1))


def test_group_a_skill_contracts_are_synthesized():
    for name, contract in REQUIRED.items():
        skill_path = ROOT / "skills" / name / "SKILL.md"
        text = skill_path.read_text(encoding="utf-8")
        normalized = text.lower()
        metadata = _frontmatter(text)
        assert metadata["name"] == name
        assert metadata["version"] == contract["version"]
        for marker in contract["skill"]:
            assert marker in normalized, f"{name} missing {marker!r}"


def test_group_a_evals_load_and_cover_positive_and_boundary_cases():
    for name, contract in REQUIRED.items():
        package = ROOT / "skills" / name
        eval_path = package / "EVAL.yaml"
        spec = load_eval(eval_path)
        expectations = "\n".join(spec.expectations).lower()
        fixture = (package / "evaldata" / "README.md").read_text(encoding="utf-8").lower()
        assert contract["positive"] in expectations
        assert contract["boundary"] in expectations
        assert "positive scenario" in fixture
        assert "boundary/negative scenario" in fixture
        assert contract["positive"] in fixture
        assert contract["boundary"] in fixture


def test_group_a_preserves_convergence_and_rejects_known_unsafe_imports():
    architect = (ROOT / "skills" / "architect" / "SKILL.md").read_text(encoding="utf-8").lower()
    delegation = (ROOT / "skills" / "delegation-reliability" / "SKILL.md").read_text(encoding="utf-8").lower()
    devops = (ROOT / "skills" / "devops" / "SKILL.md").read_text(encoding="utf-8").lower()

    assert "no fixed round limit" in architect
    assert "round 4 and later" in architect
    assert "no fixed round limit" in delegation
    assert "round 4 and later" in delegation
    assert "skills/devops/secure-cross-repository-releases" not in devops
    assert "load-secrets-from-store.sh as an unaudited" not in devops
