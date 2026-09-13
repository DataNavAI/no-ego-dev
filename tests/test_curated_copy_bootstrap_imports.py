from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

from eval_runner.core import _prompt_with_fixture, load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def package_text(name: str) -> str:
    package = SKILLS / name
    assert package.is_dir(), f"missing canonical package: {name}"
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(package.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml", ".yml", ".py", ".html", ".js", ".css"}
    )


def test_english_copywriter_is_a_complete_curated_specialist_package() -> None:
    package = SKILLS / "english-copywriter"
    actual = {path.relative_to(package).as_posix() for path in package.rglob("*") if path.is_file()}
    assert {"SKILL.md", "EVAL.yaml", "evaldata/README.md"} <= actual

    content = package_text("english-copywriter")
    for required in (
        "Authoring mode",
        "Specialist review mode",
        "PASS | NEEDS ITERATION | BLOCKED",
        "Omit reversible nits entirely",
        "binding review",
        "canonical reviewer",
        "references/interactive-copy-truth-probes.md",
        "references/fact-source-and-state-copy-closure.md",
        "references/candidate-documentation-evidence-claims.md",
    ):
        assert required in content
    for forbidden in ("PASS WITH MINOR POLISH", "BTS", "Juno", "Nix", "Ari"):
        assert forbidden not in content

    spec = load_eval(package / "EVAL.yaml")
    assert spec.fixture_path == package / "evaldata" / "README.md"
    rendered = _prompt_with_fixture(spec)
    assert spec.fixture_text in rendered
    assert "PASS | NEEDS ITERATION | BLOCKED" in rendered
    assert "binding candidate approval" in rendered


def test_product_bootstrap_is_prototype_scoped_and_self_contained() -> None:
    package = SKILLS / "product-bootstrap"
    actual = {path.relative_to(package).as_posix() for path in package.rglob("*") if path.is_file()}
    assert {
        "SKILL.md",
        "EVAL.yaml",
        "evaldata/SCENARIO.md",
        "evaldata/starter/BENCHMARK.md",
        "evaldata/starter/README.md",
        "evaldata/starter/index.html",
        "evaldata/starter/app.js",
        "evaldata/starter/styles.css",
        "evaldata/starter/verify.py",
    } <= actual

    content = package_text("product-bootstrap")
    for required in (
        "prototype only",
        "product-manager",
        "mvp-planning",
        "Product stage",
        "Learning decision",
        "Feedback path",
        "Mocked/manual inventory",
        "prototype limitations",
        "isolated workspace",
        "python3 verify.py",
    ):
        assert required in content
    for forbidden in (
        "knoomdevbot",
        "eval/product-bootstrap-benchmark",
        "/tmp/no-ego-dev-product-bootstrap-skill-eval",
        "rm -rf",
    ):
        assert forbidden not in content

    spec = load_eval(package / "EVAL.yaml")
    assert spec.fixture_path == package / "evaldata" / "SCENARIO.md"
    assert spec.parameters["working_directory"] == "~/product-bootstrap-workspace"
    assert spec.parameters["verification_command"] == "python3 verify.py"
    rendered = _prompt_with_fixture(spec)
    assert spec.fixture_text in rendered
    assert "deterministic post-agent verifier" in rendered


def test_product_bootstrap_setup_delivers_a_fresh_failing_fixture(tmp_path: Path) -> None:
    package = SKILLS / "product-bootstrap"
    spec = load_eval(package / "EVAL.yaml")
    assert len(spec.setup_commands) == 1
    assert spec.teardown_commands == []

    isolated_home = tmp_path / "isolated-home"
    isolated_home.mkdir()
    env = os.environ.copy()
    env["HOME"] = str(isolated_home)
    env["HERMES_HOME"] = str(isolated_home)
    subprocess.run(spec.setup_commands[0], cwd=package, env=env, shell=True, check=True)

    workspace = isolated_home / "product-bootstrap-workspace"
    assert workspace.is_dir()
    assert (workspace / "BENCHMARK.md").is_file()
    assert (workspace / "verify.py").is_file()
    assert workspace.resolve() != (package / "evaldata" / "starter").resolve()

    baseline = subprocess.run(
        [sys.executable, "verify.py"],
        cwd=workspace,
        text=True,
        capture_output=True,
        check=False,
    )
    assert baseline.returncode == 1
    assert "VERIFICATION FAILED" in baseline.stdout
