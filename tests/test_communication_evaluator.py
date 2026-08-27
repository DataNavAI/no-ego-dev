from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "communication-evaluator"


def test_communication_evaluator_is_a_complete_eval_backed_package():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = SKILL_DIR / evaluation["parameters"]["fixture"]

    assert re.search(r"^name: communication-evaluator$", skill, re.MULTILINE)
    assert re.search(r"^version: 1\.0\.0$", skill, re.MULTILINE)
    assert "product-communication" in skill
    assert fixture.is_file() and fixture.stat().st_size > 0
    assert evaluation["expectations"]


def test_rubric_prioritizes_non_engineer_comprehension_and_sums_to_100():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    weighted_rows = re.findall(r"^\| [^|]+ \| (\d+) \|", skill, re.MULTILINE)

    assert sum(map(int, weighted_rows)) == 100
    for marker in (
        "Non-engineer comprehension",
        "one-read test",
        "what changed",
        "who is affected",
        "why it matters",
        "what a person must do",
        "what happens next",
        "unexplained jargon",
        "acronym",
        "cognitive load",
    ):
        assert marker.lower() in skill.lower()


def test_evaluator_has_material_hard_gates_and_actionable_output_schema():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"]).lower()

    for marker in (
        "## Hard-fail gates",
        "Human action needed:",
        "secrets",
        "misleading",
        "Verdict:",
        "Score:",
        "Non-engineer readback:",
        "Material findings:",
        "Suggested rewrite:",
    ):
        assert marker.lower() in skill.lower()

    assert "non-engineer" in expectations
    assert "hard-fail" in expectations
    assert "suggested rewrite" in expectations
    assert "does not invent" in expectations

    fixture = (SKILL_DIR / evaluation["parameters"]["fixture"]).read_text(
        encoding="utf-8"
    )
    assert "ghp_" not in fixture
    assert "typography alone is optional polish" in fixture
