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

CROSS_ROUND_ORCHESTRATION_SKILLS = REVIEW_ORCHESTRATION_SKILLS + (
    "delegation-reliability",
)


def skill_text(name: str) -> str:
    return (SKILLS / name / "SKILL.md").read_text(encoding="utf-8")


def eval_expectations(name: str) -> str:
    data = yaml.safe_load((SKILLS / name / "EVAL.yaml").read_text(encoding="utf-8"))
    return "\n".join(data["expectations"])


def eval_fixture(name: str) -> str:
    data = yaml.safe_load((SKILLS / name / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = data.get("parameters", {}).get("fixture")
    assert fixture, f"{name} eval must declare a fixture"
    return (SKILLS / name / fixture).read_text(encoding="utf-8")


def package_text(name: str) -> str:
    package = SKILLS / name
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml", ".yml"}
    )


def test_direct_reviewers_use_the_shared_risk_weighted_convergence_protocol() -> None:
    required = (
        "## Risk-weighted review priority",
        "## First-round completeness",
        "## Post-Round-3 approval convergence",
        "hard to reverse",
        "no fixed round limit",
        "Why it was not discoverable in round 1",
    )

    for name in DIRECT_REVIEW_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing {phrase!r}"

        assert "absolute maximum of **10" not in content
        assert "maximum of **10 substantive" not in content


def test_direct_reviewers_require_complete_prior_round_context_and_reconciliation() -> None:
    required = (
        "## Prior-round context continuity",
        "prior exact review report",
        "complete cumulative context",
        "pre-review summary",
        "pre_review_summary_digest",
        "pre_review_summary_artifact",
        "recompute",
        "finding disposition ledger",
        "remediation change map",
        "contradiction check",
        "New material findings",
        "Why it was not discoverable in round 1",
        "material process escape",
    )

    for name in DIRECT_REVIEW_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing prior-round continuity rule {phrase!r}"

        assert "Do not rely on a controller summary instead of the exact prior reports" in content
        assert "Do not reopen a resolved finding" in content


def test_orchestrators_pass_exact_prior_round_context_to_every_fresh_reviewer() -> None:
    required = (
        "prior exact review reports",
        "every preceding generation",
        "pre-review summary",
        "pre_review_summary_digest",
        "pre_review_summary_artifact",
        "recompute",
        "finding disposition ledger",
        "remediation change map",
        "prior-context digest",
        "contradiction check",
        "New material findings",
        "material process escape",
    )

    for name in CROSS_ROUND_ORCHESTRATION_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing review-context handoff {phrase!r}"

        expectations = eval_expectations(name)
        for phrase in (
            "prior exact review reports",
            "cumulative generation order",
            "pre-review summary",
            "closed-schema canonical artifact",
            "recompute",
            "finding disposition ledger",
            "prior-context digest",
            "contradict prior feedback",
            "unrelated new findings",
            "material process escape",
        ):
            assert phrase in expectations, f"{name} eval missing review-context handoff {phrase!r}"


def test_issue_monitor_documents_the_gate_digest_format_exactly() -> None:
    reference = (
        ROOT / "skills" / "issue-monitor" / "references" / "review-round-continuity.md"
    ).read_text(encoding="utf-8").lower()
    assert "exactly 64 lowercase hexadecimal characters" in reference
    assert "immutable pre-review summary" in reference
    assert "pre_review_summary_digest" in reference
    assert "pre_review_summary_artifact" in reference
    assert "exactly one trailing lf" in reference
    assert "recomputes its digest" in reference
    assert "supply the verified artifact to every reviewer" in reference
    assert "sha256:<" not in reference


def test_orchestrator_fixtures_exercise_cross_round_context_delivery() -> None:
    for name in CROSS_ROUND_ORCHESTRATION_SKILLS:
        fixture = eval_fixture(name).lower()
        for phrase in (
            "prior exact review reports",
            "finding disposition ledger",
            "contradictory later-round feedback",
            "unrelated new finding",
            "material process escape",
            "missing cumulative round-3 history",
            "missing or changed pre-review summary",
            "noncanonical",
            "digest-mismatched",
        ):
            assert phrase in fixture, f"{name} fixture missing continuity case {phrase!r}"


def test_shared_implementation_convergence_reference_passes_complete_history() -> None:
    reference = (
        ROOT
        / "skills"
        / "project-manager"
        / "references"
        / "implementation-review-convergence.md"
    ).read_text(encoding="utf-8").lower()
    for phrase in (
        "prior exact review reports",
        "report_history",
        "pre-review summary",
        "pre_review_summary_digest",
        "pre_review_summary_artifact",
        "recompute",
        "finding disposition ledger",
        "remediation change map",
        "prior-context digest",
        "material process escape",
    ):
        assert phrase in reference


def test_review_evals_and_fixtures_exercise_missing_and_contradictory_round_context() -> None:
    for name in DIRECT_REVIEW_SKILLS:
        expectations = eval_expectations(name)
        fixture = (SKILLS / name / "evaldata" / "README.md").read_text(encoding="utf-8")
        for phrase in (
            "prior exact review reports",
            "cumulative generation order",
            "pre-review summary",
            "closed-schema canonical artifact",
            "recompute",
            "finding disposition ledger",
            "contradict prior feedback",
            "unrelated new findings",
            "material process escape",
        ):
            assert phrase in expectations, f"{name} eval missing {phrase!r}"
        for phrase in (
            "Missing prior-round context",
            "Contradictory later-round feedback",
            "Unrelated new finding",
            "Material process escape",
            "Missing cumulative Round-3 history",
            "Missing or changed pre-review summary",
            "noncanonical",
            "digest-mismatched",
        ):
            assert phrase in fixture, f"{name} fixture missing {phrase!r}"


def test_orchestrators_enforce_complete_first_round_and_approval_convergence() -> None:
    required = (
        "Risk-weighted review",
        "first-round completeness",
        "Round 1",
        "Round 2",
        "Round 3",
        "approval-convergence mode",
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
        "approval-convergence mode",
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
    for forbidden in (
        "blocker, high, medium, low",
        "medium/low polish",
        "optional polish",
    ):
        assert forbidden not in ui

    subagent = package_text("subagent-driven-development")
    assert "Deferred reversible nits" not in subagent

    coder = package_text("coder")
    assert "`Critical`, `Important`, and `Minor` findings" not in coder
    assert "A test-strength observation may be Minor" not in coder


def test_round_is_one_candidate_generation_shared_by_all_review_kinds() -> None:
    required = (
        "One review round is one immutable candidate generation",
        "share one candidate generation and round number",
        "candidate SHA, current base SHA, and complete authorized review-bundle manifest",
        "A corrected candidate advances exactly one round",
    )
    for name in REVIEW_ORCHESTRATION_SKILLS:
        content = skill_text(name)
        for phrase in required:
            assert phrase in content, f"{name} missing canonical round rule {phrase!r}"


def test_published_workflow_allows_convergence_but_not_unreviewed_risk_acceptance() -> None:
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

    coder = skill_text("coder")
    assert "Round 4 and later" in coder
    assert "never treat review exhaustion as approval" in coder


def test_all_required_exact_sha_gates_rerun_after_test_only_changes() -> None:
    subagent = skill_text("subagent-driven-development")
    assert "If a follow-up commit changes tests only" not in subagent
    assert "A test-only correction changes the commit SHA" in subagent
    assert "rerun every required exact-SHA review kind" in subagent


def test_direct_reviewers_reject_missing_round_and_bind_later_round_receipts() -> None:
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


def test_round_one_includes_all_material_findings_not_only_blockers() -> None:
    phrase = "all independently discoverable Critical/Important or otherwise material findings"
    for name in REVIEW_ORCHESTRATION_SKILLS:
        assert phrase in skill_text(name), f"{name} narrows Round 1 below material findings"


def test_project_manager_dispatches_fresh_domain_reviewer_leaves() -> None:
    content = skill_text("project-manager")
    for role in ("prd-reviewer", "technical-design-reviewer", "ui-reviewer"):
        assert role in content
    for phrase in (
        "fresh review-only leaf",
        "did not author or edit the candidate",
        "exact artifact identity",
        "durable report location",
    ):
        assert phrase in content


def test_ui_reviewer_is_read_only_and_uses_the_canonical_guideline() -> None:
    content = skill_text("ui-reviewer")
    assert ".projects/<project>/design/ui-guidelines.md" in content
    assert "ui-review-guideline.md" not in content
    for phrase in (
        "fresh review-only leaf",
        "must not create, edit, or update",
        "BLOCKED_MISSING_UI_GUIDELINE",
    ):
        assert phrase in content
    assert "research top comparable services and write the guideline before finalizing the review" not in content


def test_subagent_eval_requires_all_material_round_one_findings() -> None:
    expectations = eval_expectations("subagent-driven-development")
    assert "all independently discoverable Critical/Important or otherwise material findings" in expectations
    assert "all independently discoverable blockers" not in expectations


def test_complete_domain_reviewer_packages_are_publishable() -> None:
    expected = {
        "prd-reviewer": {"SKILL.md", "EVAL.yaml", "evaldata/README.md"},
        "technical-design-reviewer": {"SKILL.md", "EVAL.yaml", "evaldata/README.md"},
        "ui-reviewer": {"SKILL.md", "EVAL.yaml", "evaldata/README.md"},
    }
    for name, required in expected.items():
        package = SKILLS / name
        actual = {str(path.relative_to(package)) for path in package.rglob("*") if path.is_file()}
        assert required <= actual


def test_direct_reviewer_fixtures_require_post_round_three_approval_convergence() -> None:
    for name in DIRECT_REVIEW_SKILLS:
        fixture = (SKILLS / name / "evaldata" / "README.md").read_text(encoding="utf-8")
        assert "Negative scenario" in fixture
        assert "Round 2" in fixture
        assert "Round 4 and later" in fixture
        assert "approval-convergence mode" in fixture
        assert "ITERATION_LIMIT_REACHED" not in fixture


def test_review_packages_remove_the_round_cap_without_weakening_material_gates() -> None:
    for name in (*DIRECT_REVIEW_SKILLS, *REVIEW_ORCHESTRATION_SKILLS):
        content = skill_text(name)
        for phrase in (
            "Round 4 and later",
            "approval-convergence mode",
            "no fixed round limit",
            "material",
            "APPROVED",
        ):
            assert phrase in content, f"{name} missing convergence policy {phrase!r}"
        for forbidden in (
            "No round 4",
            "no Round 4",
            "three-round cap",
            "three-round maximum",
            "three-round lineage",
            "three total review rounds",
            "Round 3 is final",
            "Round 3 is the final",
            "final permitted substantive review",
            "ITERATION_LIMIT_REACHED",
            "BLOCKED_AFTER_ROUND_3",
        ):
            assert forbidden not in package_text(name), (
                f"{name} retains superseded round-cap policy {forbidden!r}"
            )
