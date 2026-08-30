from pathlib import Path
import importlib.util
import re
import sys

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "communication-evaluator"
SCORER = SKILL_DIR / "scripts" / "score_evaluation.py"
CASES = SKILL_DIR / "evaldata" / "cases.yaml"


def _scorer_module():
    spec = importlib.util.spec_from_file_location("communication_evaluator_scorer", SCORER)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_communication_evaluator_is_a_complete_eval_backed_package():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = SKILL_DIR / evaluation["parameters"]["fixture"]

    assert re.search(r"^name: communication-evaluator$", skill, re.MULTILINE)
    assert re.search(r"^version: 1\.0\.2$", skill, re.MULTILINE)
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


def test_candidate_oracles_have_exact_repeatable_scores_and_verdicts():
    module = _scorer_module()
    cases = yaml.safe_load(CASES.read_text(encoding="utf-8"))["cases"]
    fixture = (SKILL_DIR / "evaldata" / "README.md").read_text(encoding="utf-8")
    fixture_without_quotes = re.sub(r"(?m)^>\s?", "", fixture)
    normalized_fixture = " ".join(fixture_without_quotes.split())

    assert [case["id"] for case in cases] == ["A", "B", "C", "D", "E"]
    for case in cases:
        assert case["message"].strip()
        assert " ".join(case["message"].split()) in normalized_fixture
        first = module.evaluate(
            case["scores"],
            hard_fail_gates=case["hard_fail_gates"],
            one_read_complete=case["one_read_complete"],
        )
        second = module.evaluate(
            case["scores"],
            hard_fail_gates=case["hard_fail_gates"],
            one_read_complete=case["one_read_complete"],
        )
        assert first == second
        assert first.score == case["expected_score"]
        assert first.verdict == case["expected_verdict"]

    sudoku = cases[-1]
    assert "fallback validity" in sudoku["message"]
    assert "dialog focus containment" in sudoku["message"]
    assert "false-green smoke gaps" in sudoku["message"]
    assert "active_project_context_missing" in sudoku["hard_fail_gates"]

    implementation_choice = cases[2]
    assert "core_meaning_inaccessible" in implementation_choice["hard_fail_gates"]
    assert "missing_or_wrong_action_boundary" in implementation_choice["hard_fail_gates"]

    approved = cases[1]["message"].lower()
    assert "requested web-checkout" in approved
    assert "human action needed: none" in approved
    assert "team will watch" in approved


def test_score_threshold_hard_gate_and_one_read_gate_are_fail_closed():
    module = _scorer_module()
    approved = {
        "product_outcome": 15,
        "non_engineer_comprehension": 25,
        "human_action": 15,
        "context_next_state": 10,
        "structure_status": 10,
        "cognitive_load": 5,
        "evidence_safety": 5,
        "accessible_tone": 0,
    }
    assert sum(approved.values()) == 85
    assert module.evaluate(approved).verdict == "APPROVED"

    below = dict(approved, cognitive_load=4)
    assert module.evaluate(below).score == 84
    assert module.evaluate(below).verdict == "CHANGES_REQUIRED"
    assert module.evaluate(approved, hard_fail_gates=["misleading_product_state"]).verdict == (
        "CHANGES_REQUIRED"
    )
    assert module.evaluate(approved, one_read_complete=False).verdict == "CHANGES_REQUIRED"
