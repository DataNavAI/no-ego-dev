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
    paths = [path for path in SKILL_DIR.rglob("*") if path.is_file()]
    texts = [path.read_text(encoding="utf-8") for path in paths]
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

    markdown = "\n".join(
        path.read_text(encoding="utf-8")
        for path in paths
        if path.suffix == ".md"
    )
    no_action_lines = [
        line.strip()
        for line in markdown.splitlines()
        if line.strip().startswith("**Human action needed:** None")
    ]
    assert len(no_action_lines) >= 5
    assert all(line == "**Human action needed:** None" for line in no_action_lines)

    single_action_lines = [
        line.strip()
        for line in markdown.splitlines()
        if line.strip().startswith("**Human action needed:**")
        and line.strip() not in {"**Human action needed:**", "**Human action needed:** None"}
    ]
    assert single_action_lines
    assert all("cannot" in line.lower() for line in single_action_lines)
    assert all("unblock" in line.lower() for line in single_action_lines)

    checklist_lines = [
        line.strip()
        for line in markdown.splitlines()
        if line.strip().startswith("- [ ] **<human owner/role>")
    ]
    assert checklist_lines
    assert all("cannot" in line.lower() for line in checklist_lines)
    assert all(
        "unblock" in line.lower() or "enable" in line.lower()
        for line in checklist_lines
    )

    propagation = (SKILL_DIR / "references/multi-profile-policy-propagation.md").read_text(
        encoding="utf-8"
    )
    for marker in (
        "complete eval-backed package",
        "remote default branch",
        "open PR is not publication",
        "stop before target mutation",
    ):
        assert marker in propagation


def test_product_communication_eval_covers_human_action_and_rollout_claims():
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (SKILL_DIR / evaluation["parameters"]["fixture"]).read_text(
        encoding="utf-8"
    )
    expectations = "\n".join(evaluation["expectations"])

    assert "Human action needed" in expectations
    assert "None when no person must act" in expectations
    assert "exact None" in expectations
    assert "cannot safely perform it" in expectations
    assert "Markdown checklist" in expectations
    assert "all profiles" in expectations
    assert "multiple people" in fixture
    assert "separately completable checklist" in fixture
    assert "canonical-byte" in fixture


def test_canonical_user_message_emitters_follow_product_communication_contract():
    roots = (
        ROOT / "skills" / "project-manager",
        ROOT / "skills" / "issue-monitor",
        ROOT / "skills" / "play-store-publisher",
    )
    files = [
        path
        for root in roots
        for path in root.rglob("*")
        if path.is_file() and path.suffix in {".md", ".yaml"}
    ]
    files.append(
        ROOT
        / "skills"
        / "delegation-reliability"
        / "references"
        / "active-subagent-visibility.md"
    )
    contract = "\n".join(path.read_text(encoding="utf-8") for path in files)

    assert "Human action needed:" in contract
    assert "natural" in contract.lower()
    assert "why automation cannot" in contract.lower()
    assert not re.search(
        r"^\s*(?:[-*]\s*)?(?:`|\*\*)?Purpose:", contract, re.MULTILINE
    )
    assert not re.search(
        r"^\s*(?:[-*]\s*)?(?:`|\*\*)?Action needed:", contract, re.MULTILINE
    )
    assert "<strong>Purpose:</strong>" not in contract
