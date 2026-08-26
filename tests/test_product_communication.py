from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "product-communication"


def test_product_communication_package_contract():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = SKILL_DIR / evaluation["parameters"]["fixture"]

    assert re.search(r"^name: product-communication$", skill, re.MULTILINE)
    assert re.search(r"^version: 1\.3\.3$", skill, re.MULTILINE)
    assert fixture.is_file()

    for reference in (
        "references/5w1h-concise-blocker-examples.md",
        "references/decision-ready-message-examples.md",
        "references/multi-profile-policy-propagation.md",
    ):
        assert (SKILL_DIR / reference).is_file()


def test_product_communication_requires_exact_human_action_contract():
    texts = [
        path.read_text(encoding="utf-8")
        for path in SKILL_DIR.rglob("*")
        if path.is_file()
    ]
    contract = "\n".join(texts)

    for marker in (
        "Human action needed:",
        "Human action needed: None",
        "only human-owned tasks",
        "cannot safely perform it",
        "Markdown checklist",
        "actor or role",
        "timing or urgency",
        "fresh runtime",
    ):
        assert marker.lower() in contract.lower()

    assert not re.search(r"^\s*(?:\*\*)?Action needed:", contract, re.MULTILINE)


def test_product_communication_eval_covers_human_action_and_rollout_claims():
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (SKILL_DIR / evaluation["parameters"]["fixture"]).read_text(
        encoding="utf-8"
    )
    expectations = "\n".join(evaluation["expectations"])

    assert "Human action needed" in expectations
    assert "None when no person must act" in expectations
    assert "cannot safely perform it" in expectations
    assert "Markdown checklist" in expectations
    assert "all profiles" in expectations
    assert "multiple people" in fixture
    assert "separately completable checklist" in fixture
    assert "canonical-byte" in fixture
