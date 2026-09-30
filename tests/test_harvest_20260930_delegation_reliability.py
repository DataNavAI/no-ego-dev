import hashlib
from pathlib import Path

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "delegation-reliability"
LIVENESS_REFERENCE_SHA256 = (
    "a996498ed33b66cc314a814918208dd85a428f200f7c822cafc1d67d0c203a15"
)


def read(relative: str) -> str:
    return (PACKAGE / relative).read_text(encoding="utf-8")


def test_harvest_adopts_liveness_reference_and_links_every_curated_control() -> None:
    skill = read("SKILL.md")
    assert "version: 1.14.11" in skill

    references = (
        "cron-controller-liveness-audit.md",
        "external-tracker-kanban-reconciliation.md",
        "boundary-matrix-review.md",
        "remediation-closure-matrix.md",
        "visual-product-review-remediation.md",
        "single-worker-pr-first-controller.md",
        "ambiguous-privacy-classifier.md",
    )
    for name in references:
        assert (PACKAGE / "references" / name).is_file(), name
        assert f"references/{name}" in skill

    liveness_bytes = (PACKAGE / "references/cron-controller-liveness-audit.md").read_bytes()
    assert hashlib.sha256(liveness_bytes).hexdigest() == LIVENESS_REFERENCE_SHA256


def test_harvest_scopes_specialized_controls_without_replacing_canonical_defaults() -> None:
    skill = read("SKILL.md")
    for canonical_control in (
        "Hook-only mode (preferred when the user rejects queue duplication)",
        "Parallel independent work is the default",
        "A periodic tick is not evidence of a worker deficit",
        "Never use tracker-only work to fill capacity",
    ):
        assert canonical_control in skill

    required_boundaries = (
        "only when unattended continuation must survive restarts",
        "only when an owner explicitly requires one global worker and all pull requests before issues",
        "only for runnable UI/design pull requests",
        "only after a privacy, schema, parser, normalization, timeout, or concurrency finding",
        "must not replace hook-only continuation",
        "must not serialize independent work by default",
    )
    for boundary in required_boundaries:
        assert boundary in skill

    package_paths = {path.name.lower() for path in PACKAGE.rglob("*") if path.is_file()}
    forbidden_product_local_files = {
        "kpop-batch-release-reconciliation.md",
        "kpop-batch-review-escape-ledger.md",
        "parallel-artist-expansion.md",
        "artist-wave-recovery.md",
    }
    assert package_paths.isdisjoint(forbidden_product_local_files)


def test_harvest_eval_exercises_liveness_hierarchy_and_scope_boundaries() -> None:
    spec = load_eval(PACKAGE / "EVAL.harvest-20260930.yaml")
    document = yaml.safe_load(read("EVAL.harvest-20260930.yaml"))
    fixture = read(document["parameters"]["fixture"])
    surface = "\n".join([document["prompt"], *spec.expectations, fixture]).lower()

    for evidence in (
        "worker lifecycle evidence",
        "controller output history",
        "job metadata",
        "cli execution history",
    ):
        assert evidence in surface
    assert surface.index("worker lifecycle evidence") < surface.index(
        "controller output history"
    ) < surface.index("job metadata") < surface.index("cli execution history")

    boundaries = (
        "restart-durable external-tracker/kanban",
        "explicit single-worker pr-first",
        "runnable ui/design",
        "privacy/parser boundary matrix",
    )
    assert sum(boundary in surface for boundary in boundaries) >= 2
    assert "empty execution table is not evidence that the controller never ran" in surface
    assert "frequent schedule is not worker maintenance" in surface
