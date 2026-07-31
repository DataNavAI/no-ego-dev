from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"

DIRECT_REVIEW_SKILLS = (
    "spec-compliance-review",
    "prd-reviewer",
    "technical-design-reviewer",
    "ui-reviewer",
)

REVIEW_ORCHESTRATION_SKILLS = (
    "subagent-driven-development",
    "project-manager",
    "issue-monitor",
    "immutable-candidate-verification",
)


def skill_text(name: str) -> str:
    return (SKILLS / name / "SKILL.md").read_text(encoding="utf-8")


def eval_expectations(name: str) -> str:
    data = yaml.safe_load((SKILLS / name / "EVAL.yaml").read_text(encoding="utf-8"))
    return "\n".join(data["expectations"])


def test_direct_reviewers_use_the_shared_risk_weighted_three_round_protocol() -> None:
    required = (
        "## Risk-weighted review priority",
        "## First-round completeness",
        "## Three-round maximum",
        "hard to reverse",
        "No round 4",
        "Why it was not discoverable in round 1",
    )

    for name in DIRECT_REVIEW_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing {phrase!r}"

        assert "absolute maximum of **10" not in content
        assert "maximum of **10 substantive" not in content


def test_orchestrators_enforce_complete_first_round_and_no_fourth_review() -> None:
    required = (
        "Risk-weighted review",
        "first-round completeness",
        "Round 1",
        "Round 2",
        "Round 3",
        "No round 4",
        "Why it was not discoverable in round 1",
    )

    for name in REVIEW_ORCHESTRATION_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing {phrase!r}"

    project_manager = skill_text("project-manager")
    assert "absolute 10-round lifetime cap" not in project_manager
    assert "human-authorized continuation may start a new bounded cycle" not in project_manager


def test_review_evals_cover_all_three_user_principles() -> None:
    required = (
        "hard-to-reverse",
        "reversible nits",
        "all independently discoverable findings in round one",
        "later-round feedback is limited",
        "three total review rounds",
    )

    for name in DIRECT_REVIEW_SKILLS:
        expectations = eval_expectations(name)
        for phrase in required:
            assert phrase in expectations, f"{name} eval missing {phrase!r}"
