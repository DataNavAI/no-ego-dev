from pathlib import Path
import re

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"

VERSIONS = {
    "issue-monitor": "1.17.0",
    "profile-skill-harvester": "1.5.61",
    "subagent-driven-development": "1.12.10",
    "architect": "0.2.12",
    "qa": "0.3.1",
    "spec-compliance-review": "1.8.9",
    "product-communication": "1.4.1",
    "devops": "0.7.5",
}


def package_text(skill: str) -> str:
    package = SKILLS / skill
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml"}
    ).lower()


def assert_terms(skill: str, *terms: str) -> None:
    text = package_text(skill)
    missing = [term for term in terms if term.lower() not in text]
    assert not missing, f"{skill} is missing curated contracts: {missing}"


def test_curated_package_versions_and_production_eval_schema() -> None:
    for skill, version in VERSIONS.items():
        skill_text = (SKILLS / skill / "SKILL.md").read_text(encoding="utf-8")
        assert f"version: {version}" in skill_text
        spec = load_eval(SKILLS / skill / "EVAL.yaml")
        assert spec.expectations
        assert (SKILLS / skill / "evaldata" / "README.md").is_file()


def test_issue_monitor_authority_focus_resume_and_cleanup_contracts() -> None:
    assert_terms(
        "issue-monitor",
        "authority matrix",
        "github issue authority",
        "github pr authority",
        "official hermes kanban authority",
        "hermes cron authority",
        "exact-sha review validity",
        "one issue ↔ one kanban lineage",
        "resume the linked draft pr",
        "refs #",
        "closes #",
        "explicit reprioritization",
        "verified blocker",
        "exact task-owned disposable",
        "no live owner",
        "no unpushed commits",
        "preserve evidence",
        "competing-authority rejection",
    )


def test_issue_monitor_switches_refs_to_closes_only_at_merge_ready() -> None:
    package = SKILLS / "issue-monitor"
    skill = (package / "SKILL.md").read_text(encoding="utf-8")
    eval_text = (package / "EVAL.yaml").read_text(encoding="utf-8")
    fixture = (package / "evaldata" / "README.md").read_text(encoding="utf-8")

    required = (
        "use `Refs #<issue>` while the PR is draft or pending",
        "switch the PR body to `Closes #<issue>` only once exact-head approval and required CI make it merge-ready",
        "guarded merge and closure verification",
    )
    for phrase in required:
        assert phrase in skill
    assert "- issue link and `Closes #N`;" not in skill
    assert "only then uses Closes" not in eval_text
    assert "only then uses `Closes`" not in fixture
    assert "switches from Refs to Closes when exact-head approval and required CI make the PR merge-ready" in eval_text


def test_issue_monitor_user_updates_use_canonical_product_communication_envelope() -> None:
    package = SKILLS / "issue-monitor"
    skill = (package / "SKILL.md").read_text(encoding="utf-8")
    fixture = (package / "evaldata" / "README.md").read_text(encoding="utf-8")
    for surface in (skill, fixture):
        assert "Purpose:" not in surface
        assert "Action needed:" not in surface
        assert "natural project-specific opening" in surface
        assert "Executive summary:" in surface
        assert "Human action needed:" in surface
        assert "Detailed information:" in surface


def test_issue_monitor_behavioral_eval_is_redaction_safe_without_weakening_production_controls() -> None:
    package = SKILLS / "issue-monitor"
    production = (package / "SKILL.md").read_text(encoding="utf-8")
    assert "secret scan" in production
    assert "fresh reviewer tokens" in production

    eval_doc = yaml.safe_load((package / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (package / eval_doc["parameters"]["fixture"]).read_text(encoding="utf-8")
    behavioral_surface = "\n".join(
        [eval_doc["prompt"], *eval_doc["expectations"], fixture]
    )
    credential_shaped_words = re.findall(
        r"\b(?:token\w*|secret\w*|credential\w*|password\w*|session[_ -]?id|api[_ -]?key)\b",
        behavioral_surface,
        flags=re.IGNORECASE,
    )
    assert not credential_shaped_words
    assert "private-data scan" in behavioral_surface
    assert "model usage accounting" in behavioral_surface
    assert "official heartbeat JSON" in behavioral_surface
    assert "lifecycle-backed active-worker lease" in behavioral_surface
    for required_prompt_rule in (
        "Open with the affected product or release outcome",
        "durably persist separate per-generation, per-bundle, and per-attempt model usage accounting",
        "omit reversible nits and return every independently discoverable material finding with sufficient correction direction",
        "why it was not reasonably discoverable in Round 1",
        "fail closed before substantive Round-3 review",
    ):
        assert required_prompt_rule in eval_doc["prompt"]


def test_harvester_rollout_copies_never_enter_discovery_roots() -> None:
    assert_terms(
        "profile-skill-harvester",
        "outside every active skills discovery root",
        "same-filesystem adjacent",
        "exactly one targeted frontmatter identity",
        "failed-swap",
        "duplicate retirement",
        "verified-merge-only rollout source",
    )
    for reference in (
        "references/transactional-profile-rollout.md",
        "references/live-source-freeze-and-target-sync.md",
    ):
        text = (SKILLS / "profile-skill-harvester" / reference).read_text(
            encoding="utf-8"
        ).lower()
        assert "outside every active skills discovery root" in text
        assert "exactly one targeted frontmatter identity" in text


def test_subagent_reuse_preflight_is_scoped_and_preserves_independent_review() -> None:
    assert_terms(
        "subagent-driven-development",
        "existing-solution/reuse preflight",
        "major capabilities",
        "lockfiles",
        "internal apis",
        "approved dependencies",
        "adopt",
        "configure",
        "extend",
        "wrap",
        "build_new",
        "material unmet constraint",
        "not_applicable",
        "implementer/review packet",
        "independent composite review",
        "tasks=[...]",
    )


def test_architect_api_consumer_and_operational_dataset_contracts() -> None:
    assert_terms(
        "architect",
        "request → response → retained caller state → next action",
        "opaque backend continuation",
        "raw canonical",
        "cache revalidation",
        "immediately before writes",
        "idempotency",
        "uncertain readback",
        "no blind retry",
        "current contract",
        "future design",
        "purpose",
        "minimization",
        "linkability",
        "aggregate outputs",
    )


def test_qa_api_assisted_journey_matrix_contracts() -> None:
    assert_terms(
        "qa",
        "api-assisted journey matrix",
        "pagination boundaries",
        "malformed continuation",
        "cache hit",
        "cache miss",
        "cache expiry",
        "stale selection",
        "duplicate submit",
        "timeout",
        "malformed-success",
        "5xx",
        "readback",
        "raw id",
        "display label",
        "prohibited fields",
    )


def test_spec_audit_reference_and_adversarial_probes() -> None:
    reference = SKILLS / "spec-compliance-review" / "references" / "api-to-consumer-contract-audit.md"
    assert reference.is_file()
    assert_terms(
        "spec-compliance-review",
        "api-to-consumer-contract-audit.md",
        "continuation",
        "stale cache",
        "display-as-id",
        "consumer state loss",
        "catalog membership",
        "double submit",
        "ambiguous write",
        "readback",
    )


def test_product_communication_live_guidance_contract() -> None:
    assert_terms(
        "product-communication",
        "live guided configuration",
        "requested visible field",
        "do not silently revise",
        "verified contradiction",
        "pause",
        "retained work",
        "replaced work",
        "one complete replacement path",
        "current-compatible",
        "future architecture",
    )


def test_devops_third_party_mutation_boundary() -> None:
    assert_terms(
        "devops",
        "third-party mutation boundary",
        "exact account",
        "project",
        "environment",
        "inventory before mutation",
        "explicit production authority",
        "allowlisted mutations",
        "read back",
        "non-secret receipt",
        "remove temporary files",
        "revoke or rotate",
        "bounded credentials",
    )
