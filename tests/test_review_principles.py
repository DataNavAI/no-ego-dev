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
    "coder",
)


def skill_text(name: str) -> str:
    return (SKILLS / name / "SKILL.md").read_text(encoding="utf-8")


def eval_expectations(name: str) -> str:
    data = yaml.safe_load((SKILLS / name / "EVAL.yaml").read_text(encoding="utf-8"))
    return "\n".join(data["expectations"])


def package_text(name: str) -> str:
    package = SKILLS / name
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml", ".yml"}
    )


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
        "omits reversible nits entirely",
        "all independently discoverable findings in round one",
        "later-round feedback is limited",
        "three total review rounds",
    )

    for name in DIRECT_REVIEW_SKILLS:
        expectations = eval_expectations(name)
        for phrase in required:
            assert phrase in expectations, f"{name} eval missing {phrase!r}"


def test_reversible_nits_are_omitted_not_reported_as_minor_feedback() -> None:
    for name in DIRECT_REVIEW_SKILLS:
        content = skill_text(name)
        assert "Omit them entirely" in content, f"{name} must omit reversible nits"

    for name in ("prd-reviewer", "technical-design-reviewer"):
        content = package_text(name)
        assert "APPROVED_WITH_MINOR_NOTES" not in content
        assert "`LOW`" not in content

    ui = package_text("ui-reviewer")
    assert "PASS WITH MINOR POLISH" not in ui
    assert "**Low**" not in ui
    assert "| low" not in ui


def test_round_is_one_candidate_generation_shared_by_all_review_kinds() -> None:
    required = (
        "One review round is one immutable candidate generation",
        "share the same round number",
        "lineage, round, candidate identity, and required review-kind set",
        "A corrected candidate increments the round",
    )
    for name in REVIEW_ORCHESTRATION_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing canonical round rule {phrase!r}"


def test_no_published_workflow_allows_round_four_or_unreviewed_risk_acceptance() -> None:
    published = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(SKILLS.rglob("*.md"))
    )
    for forbidden in (
        "iterate until approved",
        "human-authorized continuation may start a new bounded cycle",
        "user authorizes another exact-SHA review",
        "explicitly accepts the named unreviewed risk",
    ):
        assert forbidden not in published

    assert "No round 4" in skill_text("coder")


def test_all_required_exact_sha_gates_rerun_after_test_only_changes() -> None:
    subagent = skill_text("subagent-driven-development")
    assert "If a follow-up commit changes tests only" not in subagent
    assert "A test-only correction changes the commit SHA" in subagent
    assert "rerun every required exact-SHA review kind" in subagent


def test_direct_reviewers_reject_missing_or_fourth_round_before_review_and_bind_receipts() -> None:
    for name in ("spec-compliance-review", "ui-reviewer"):
        content = skill_text(name)
        for phrase in (
            "## Mandatory review lineage gate",
            "Before substantive review",
            "missing or ambiguous",
            "Round 4",
            "review_kind",
            "candidate_identity",
            "required_review_kinds",
        ):
            assert phrase in content, f"{name} missing fail-closed lineage receipt {phrase!r}"
