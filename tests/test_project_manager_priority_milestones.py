from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "project-manager"
SKILL_PATH = PACKAGE / "SKILL.md"
EVAL_PATH = PACKAGE / "EVAL.yaml"
FIXTURE_PATH = PACKAGE / "evaldata" / "README.md"


def load_skill_frontmatter_and_body():
    text = SKILL_PATH.read_text(encoding="utf-8")
    _, frontmatter, body = text.split("---", 2)
    return yaml.safe_load(frontmatter), body


def test_priority_labels_and_issue_creation_are_fail_closed():
    frontmatter, skill = load_skill_frontmatter_and_body()
    evaluation = yaml.safe_load(EVAL_PATH.read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"])

    assert frontmatter["version"] == "0.32.0"
    for definition in (
        "`P0` = **MUST-FIX**",
        "`P1` = **critical to a product milestone**",
        "`P2` = **good-to-fix**",
    ):
        assert definition in skill

    assert "exactly one of `P0`, `P1`, or `P2`" in skill
    assert "determined milestone at creation" in skill
    assert "next outcome-based milestone before creating the issue" in skill
    assert "scope, evidence, milestone goal, incident state, or dependencies change" in skill
    assert "exactly one priority label remains" in skill
    assert "every new issue gets exactly one P0 P1 or P2 label and a determined milestone at creation" in expectations


def test_dispatch_and_milestone_completion_obey_priority_policy():
    _, skill = load_skill_frontmatter_and_body()
    evaluation = yaml.safe_load(EVAL_PATH.read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"])
    fixture = FIXTURE_PATH.read_text(encoding="utf-8")

    assert "`P0` > `P1` > `P2`" in skill
    assert "Lower-priority work cannot consume capacity while a higher-priority runnable issue exists" in skill
    assert "reclassify the urgent issue as `P0`" in skill
    assert "all `P0` and `P1` issues assigned to it satisfy the normal completion and evidence gates" in skill
    assert "Move every remaining open `P2` issue to the next milestone" in skill
    assert "Do not close P2 issues merely to drive the milestone's open count to zero" in skill
    assert "consult the user on the goal of the next milestone" in skill
    assert "Do not retroactively readjust priorities in the just-completed milestone" in skill

    assert "selects runnable work in strict P0 then P1 then P2 order" in expectations
    assert "with no lower priority capacity bypass" in expectations
    assert "moves remaining open P2 issues to the next milestone with preserved history and rationale rather than closing them to zero the count" in expectations
    assert "consults the user on the next milestone goal" in expectations

    combined_policy = "\n".join((skill, expectations, fixture)).lower()
    for prohibited_exception in (
        "owner-approved exception",
        "owner approved exception",
        "lower-priority capacity exception",
        "emergency-containment exception",
        "emergency containment or",
    ):
        assert prohibited_exception not in combined_policy


def test_deterministic_fixture_exercises_priority_order_and_p2_rollover():
    fixture = FIXTURE_PATH.read_text(encoding="utf-8")

    assert "Scenario: Deterministic P0/P1/P2 milestone queue and rollover" in fixture
    for issue in ("#201", "#202", "#203", "#204", "#205"):
        assert issue in fixture
    assert "Dispatch order for M1: `#201` → `#202` → `#203`" in fixture
    assert "`#203` → `#204`" not in fixture
    assert "move #204 and #205 to M2" in fixture
    assert "both remain open" in fixture
    assert "ask the user to confirm M2's outcome" in fixture
    assert "must not retroactively relabel M1" in fixture
