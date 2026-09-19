from pathlib import Path

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def package_text(skill: str) -> str:
    package = SKILLS / skill
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml"}
    ).lower()


def assert_terms(skill: str, *terms: str) -> None:
    text = package_text(skill)
    missing = [term for term in terms if term.lower() not in text]
    assert not missing, f"{skill} is missing harvested contracts: {missing}"


def test_group_c_versions_are_monotonic() -> None:
    expected = {
        "react-native-app-dev": "version: 0.1.1",
        "spec-compliance-review": "version: 1.8.8",
        "subagent-driven-development": "version: 1.12.9",
        "technical-design-reviewer": "version: 0.3.9",
        "ui-reviewer": "version: 0.2.8",
    }
    for skill, version in expected.items():
        assert version in (SKILLS / skill / "SKILL.md").read_text(encoding="utf-8")


def test_react_native_release_and_device_contracts() -> None:
    assert_terms(
        "react-native-app-dev",
        "prerequisite inspection",
        "Android back",
        "Expo Go",
        "JDK",
        "EAS",
        "Firebase",
        "prebuild",
        "cross-client parity",
        "in-app browser",
        "privacy-safe analytics",
        "notification readiness",
        "installed artifact identity",
        "version name",
        "build number",
        "News policy",
        "contact discoverability",
    )


def test_spec_review_cross_layer_and_race_contracts() -> None:
    assert_terms(
        "spec-compliance-review",
        "misbound",
        "archive binding",
        "catalog/allowlist authority closure",
        "required-argument closure",
        "empty-state parity",
        "own property",
        "publication consumer closure",
        "source race",
        "async lifecycle transaction",
        "local auth-broker probe",
        "post-report recovery",
        "provider/domain recipes",
    )


def test_subagent_scheduler_and_cleanup_contracts() -> None:
    assert_terms(
        "subagent-driven-development",
        "sequential-mode override",
        "distinct workstreams",
        "owner lease",
        "artifact durability",
        "stacked-parent integration",
        "review-pending merge hold",
        "explicit scheduler workdir",
        "mandatory frontier reconciliation",
        "exact task ownership",
        "no unpushed changes",
        "durable evidence",
    )


def test_technical_design_proportional_and_stateful_contracts() -> None:
    assert_terms(
        "technical-design-reviewer",
        "proportional low-risk mvp",
        "sibling allowlist",
        "positive control",
        "archive/continuity packet",
        "cross-document authority closure",
        "recomputable handoff digest",
        "capacity arithmetic",
        "outage independence",
        "versioned-key",
        "stateful remediation",
        "durable evidence architecture",
        "configurable threshold",
    )


def test_ui_review_immutable_runtime_and_receipt_contracts() -> None:
    assert_terms(
        "ui-reviewer",
        "immutable local prototype fallback",
        "disposable chromium",
        "byte binding",
        "multi-state settings",
        "copy + visual",
        "carousel geometry",
        "interaction receipt",
        "later-round exact-commit reconciliation",
        "parent-transplant negative control",
        "cleanup",
    )


def test_each_package_has_positive_and_boundary_eval_coverage_and_loads() -> None:
    for skill in (
        "react-native-app-dev",
        "spec-compliance-review",
        "subagent-driven-development",
        "technical-design-reviewer",
        "ui-reviewer",
    ):
        package = SKILLS / skill
        spec = load_eval(package / "EVAL.yaml")
        assert spec.expectations
        eval_text = (package / "EVAL.yaml").read_text(encoding="utf-8").lower()
        fixture_text = (package / "evaldata" / "README.md").read_text(encoding="utf-8").lower()
        assert "positive" in eval_text
        assert "boundary" in eval_text or "negative" in eval_text
        assert "positive" in fixture_text
        assert "boundary" in fixture_text or "negative" in fixture_text
