from pathlib import Path
import re

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def corpus(skill: str) -> str:
    package = SKILLS / skill
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml"}
    ).lower()


def version(skill: str) -> tuple[int, ...]:
    text = (SKILLS / skill / "SKILL.md").read_text(encoding="utf-8")
    frontmatter = yaml.safe_load(text.split("---", 2)[1])
    return tuple(int(part) for part in frontmatter["version"].split("."))


def assert_markers(skill: str, markers: tuple[str, ...]) -> None:
    text = corpus(skill)
    for marker in markers:
        assert marker in text, f"{skill} is missing harvested contract: {marker}"


def test_immutable_candidate_verification_harvests_recovery_receipt_and_boundary_contracts():
    assert version("immutable-candidate-verification") > (1, 0, 64)
    assert_markers(
        "immutable-candidate-verification",
        (
            "exact-sha recovery",
            "archive execution hygiene",
            "exact-base child pr",
            "candidate ledger",
            "approval registration",
            "tamper-evident receipt",
            "checksum-pinned installer",
            "lineage recovery",
            "opaque persistent-id migration",
            "security-boundary canonicalization",
            "approval-convergence mode",
            "never approve by exhaustion",
            "domain-scoped recipes",
            "rejects a retroactive lineage",
        ),
    )


def test_integrator_harvests_provider_scoped_safe_integration_contracts():
    assert version("integrator") > (0, 1, 0)
    assert_markers(
        "integrator",
        (
            "market-data contract",
            "least-privilege repository and oauth probe",
            "secure secret handoff",
            "consent and tracking",
            "source licensing and feed policy",
            "human-gated messaging acceptance",
            "attributed api fallback",
            "configured-state evidence",
            "provider/domain scoped",
            "rejects dashboard-only analytics evidence",
        ),
    )
    assert not (SKILLS / "integrator" / "templates" / "figma-mcp-profile-wrapper.sh").exists()


def test_integrator_never_authorizes_secret_values_or_tokens_in_persisted_chat():
    text = (SKILLS / "integrator" / "SKILL.md").read_text(encoding="utf-8").lower()

    assert not re.search(
        r"if chat is the only path[^\n]*request[^\n]*(?:token|api key|credential|secret)",
        text,
    ), "integrator must not authorize a chat fallback for credential values"
    assert "agents may request secret metadata or locators only, never secret bytes" in text
    assert "directly into an approved secret store" in text


def test_integrator_eval_rejects_chat_credential_value_handoff():
    spec = load_eval(SKILLS / "integrator" / "EVAL.yaml")
    expectations = " ".join(spec.expectations).lower()
    fixture = spec.fixture_text.lower()

    assert "rejects any request for secret bytes in chat" in expectations
    assert "chat credential trap" in fixture
    assert "direct entry into an approved secret store" in fixture


def test_play_store_publisher_harvests_bound_credential_and_release_identity_contracts():
    assert version("play-store-publisher") > (0, 3, 0)
    assert_markers(
        "play-store-publisher",
        (
            "non-secret credential inventory",
            "consumer binding",
            "exact aab",
            "review submission",
            "multi-track identity",
            "policy-rejection resubmission",
            "binding and readback",
            "date-based version",
            "explicit project policy",
            "rejects a track mismatch",
        ),
    )


def test_product_manager_harvests_scope_visual_interface_measurement_and_convergence_contracts():
    assert version("product-manager") > (0, 3, 5)
    assert_markers(
        "product-manager",
        (
            "one problem",
            "exactly one primary cuj",
            "must-ship",
            "manual/internal",
            "parking lot",
            "visual mock options",
            "before prd freeze",
            "supported-device-interfaces.yaml",
            "executable coverage",
            "stable analytics definitions",
            "google trends",
            "relative signal",
            "explicit consent",
            "stop-loss",
            "canonical terminology",
            "feedback-to-work",
            "scope-reset reconciliation",
            "ranked source coverage",
            "no fixed round limit",
            "approval-convergence mode",
            "rejects paid smoke execution without approval",
        ),
    )


def test_product_manager_scopes_primary_journeys_by_product_role_topology():
    text = corpus("product-manager")

    assert "suitable single-audience mvps" in text
    assert "prefer one primary cuj" in text
    assert "smallest complete set of co-primary role journeys" in text
    assert "cross-role handoffs" in text
    assert "inherently multi-sided" in text
    assert "regulated" in text
    assert "for an mvp, select **one problem** for one primary audience and **exactly one primary cuj**" not in text
    assert "prd has one primary cuj" not in text


def test_product_manager_scopes_visual_artifacts_to_material_visual_surfaces():
    text = corpus("product-manager")

    assert "material visual interface" in text
    assert "api/backend/cli" in text
    assert "interface examples/contracts" in text
    assert "not blocked by unavailable visual tools" in text
    assert "for a new product or visually meaningful feature" not in text


def test_product_manager_eval_fixture_covers_positive_and_boundary_product_types():
    package = SKILLS / "product-manager"
    spec = load_eval(package / "EVAL.yaml")
    expectations = " ".join(spec.expectations).lower()
    fixture = spec.fixture_text.lower()

    assert "single-audience" in expectations
    assert "co-primary role journeys" in expectations
    assert "cross-role handoffs" in expectations
    assert "material visual interface" in expectations
    assert "interface examples/contracts" in expectations
    assert "single-audience visual mvp" in fixture
    assert "multi-sided regulated workflow" in fixture
    assert "non-visual api/backend/cli" in fixture


def test_project_knowledge_organization_harvests_canonical_discovery_and_handoff_contracts():
    assert version("project-knowledge-organization") > (0, 1, 0)
    assert_markers(
        "project-knowledge-organization",
        (
            "canonical source discovery",
            "archive/import distinction",
            "tracked path",
            "ancestry",
            "isolated git handoff",
            "readback",
            "mixed-repository reduction",
            "role-readable operations",
            "source-readiness manifest",
            "shared canonical repository",
            "unlinked google doc",
            "api fallback",
            "regulated/catalog lifecycle",
            "rejects treating an archive as canonical",
        ),
    )
    assert "clinic" not in corpus("project-knowledge-organization")


def test_qa_harvests_supported_interface_and_candidate_bound_browser_contracts_without_nested_skill():
    assert version("qa") > (0, 2, 0)
    assert_markers(
        "qa",
        (
            "website qa routing",
            "supported-interface matrix",
            "candidate-bound browser evidence",
            "cross-engine playwright",
            "capability parity",
            "immutable ui evidence",
            "responsive",
            "focus order",
            "production analytics cdp",
            "generated/static accessibility",
            "smoke",
            "journey",
            "complete",
            "lifecycle scope",
            "rejects screenshots not bound to the candidate",
        ),
    )
    nested = [p for p in (SKILLS / "qa").rglob("SKILL.md") if p.parent != SKILLS / "qa"]
    assert nested == []


def test_group_b_evals_load_through_production_loader_and_include_positive_and_negative_boundaries():
    for skill in (
        "immutable-candidate-verification",
        "integrator",
        "play-store-publisher",
        "product-manager",
        "project-knowledge-organization",
        "qa",
    ):
        evals = sorted((SKILLS / skill).glob("EVAL*.yaml"))
        assert evals
        for eval_path in evals:
            spec = load_eval(eval_path)
            joined = " ".join(spec.expectations).lower()
            assert any(word in joined for word in ("requires", "includes", "verifies"))
            assert any(word in joined for word in ("rejects", "does not", "blocks", "never"))
            assert spec.fixture_text
