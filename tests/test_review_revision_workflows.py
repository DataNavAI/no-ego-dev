from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _skill(name: str) -> str:
    return (ROOT / "skills" / name / "SKILL.md").read_text(encoding="utf-8")


def test_product_manager_has_bounded_independent_prd_review_state_machine():
    body = _skill("product-manager")

    required = [
        "delegate_task(",
        "fresh independent reviewer subagent",
        "complete latest PRD revision",
        "PRD review — round <N> — revision <path/id>",
        "BLOCKER|HIGH|MEDIUM|LOW",
        "APPROVED_WITH_MINOR_NOTES",
        "REVIEW_PENDING",
        "handoff_blocked: true",
        "three review rounds",
        "issue severity/count does not decrease",
        "Spawn a **fresh independent reviewer subagent** for the latest revision",
        "Do not route the PRD to architecture or implementation until this gate passes",
    ]

    for marker in required:
        assert marker in body, f"product-manager is missing review invariant: {marker}"


def test_architect_has_bounded_independent_technical_review_state_machine():
    body = _skill("architect")

    required = [
        "delegate_task(",
        "fresh independent technical reviewer subagent",
        "complete latest tech-spec revision",
        "Technical review — round <N> — revision <path/id>",
        "BLOCKER|HIGH|MEDIUM|LOW",
        "APPROVED_WITH_MINOR_NOTES",
        "REVIEW_PENDING",
        "handoff_blocked: true",
        "three review rounds",
        "findings do not decrease in severity/count",
        "Spawn a **fresh independent technical reviewer subagent** for the latest revision",
        "No coder/project-manager handoff may begin until the gate passes",
    ]

    for marker in required:
        assert marker in body, f"architect is missing review invariant: {marker}"
