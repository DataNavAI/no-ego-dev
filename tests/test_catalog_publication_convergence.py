from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def expectations(relative: str) -> str:
    data = yaml.safe_load(read(relative))
    return "\n".join(data["expectations"])


def test_project_manager_prevents_tracker_driven_controller_churn():
    skill = read("skills/project-manager/SKILL.md")
    eval_text = expectations("skills/project-manager/EVAL.yaml")

    for marker in (
        "Material-transition tracker rule",
        "Do not create a repository commit or PR for a routine worker start",
        "Periodic reconciliation is a lost-event watchdog",
        "released product capability, not worker occupancy",
    ):
        assert marker in skill

    assert "does not commit tracker or STATUS changes for routine worker review CI or no-change transitions" in eval_text
    assert "measures released product capability rather than worker occupancy or commit volume" in eval_text


def test_delegation_reliability_scopes_base_invalidation_and_refill():
    skill = read("skills/delegation-reliability/SKILL.md")
    eval_text = expectations("skills/delegation-reliability/EVAL.yaml")

    for marker in (
        "Material base-advance rule",
        "A documentation-only or tracker-only base advance does not by itself require a full rerun",
        "Never use tracker-only work to fill capacity",
        "A periodic tick is not evidence of a worker deficit",
        "one final exact current-base/current-head approval",
    ):
        assert marker in skill

    assert "does not invalidate all candidate evidence for an unrelated documentation-only base advance" in eval_text
    assert "does not refill capacity merely because a periodic controller tick occurred" in eval_text


def test_serialized_catalog_publication_converges_without_false_publication():
    skill = read("skills/serialized-catalog-publication/SKILL.md")
    eval_text = expectations("skills/serialized-catalog-publication/EVAL.yaml")
    fixture = read("skills/serialized-catalog-publication/evaldata/README.md")

    for marker in (
        "Mode selection",
        "In **strict serial mode**, maintain a single active artist lane",
        "In **non-serial mode**, isolated candidate lanes may research and close evidence in parallel",
        "only one candidate may occupy the promotion lane at a time",
        "BLOCKED_EXTERNAL_AWAITING_OWNER_DEFERRAL",
        "Promotion-lane convergence",
        "Staging is not production",
        "Do not commit routine queue or lease transitions to the product default branch",
    ):
        assert marker in skill

    assert "asks once for explicit owner deferral instead of retrying or manufacturing checkpoint work" in eval_text
    assert "does not count merged or staging verified work as production publication" in eval_text
    assert "staging has nine artists while production has eight" in fixture
    assert "- Starting a second artist while the current one is blocked without explicit owner deferral." not in skill
    assert "In strict serial mode, starting a second artist" in skill
    assert "This does not prohibit isolated research/evidence work in non-serial mode" in skill
