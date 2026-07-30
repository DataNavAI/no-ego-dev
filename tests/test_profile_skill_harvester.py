import importlib.util
import json
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "profile-skill-harvester"
SCRIPT = SKILL_DIR / "scripts" / "inventory.py"


def _module():
    spec = importlib.util.spec_from_file_location("profile_skill_inventory", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _package(root: Path, name: str, body: str = "base") -> Path:
    package = root / "skills" / name
    package.mkdir(parents=True)
    (package / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: test\n---\n\n# {name}\n\n{body}\n",
        encoding="utf-8",
    )
    (package / "EVAL.yaml").write_text("prompt: test\nexpectations: [test]\n", encoding="utf-8")
    return package


def test_profile_skill_harvester_package_contract():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = SKILL_DIR / evaluation["parameters"]["fixture"]

    assert fixture.is_file()
    for marker in (
        "No last-write-wins merges",
        "Product stage",
        "discovery",
        "mvp",
        "growing",
        "mature",
        "regulated/enterprise",
        "Precedence rules",
        "isolated worktree",
        "Complete packages move together",
        "Initial enrollment is a baseline",
        "Advances external inventory state only after merge",
    ):
        assert marker in skill or marker in "\n".join(evaluation["expectations"])
    assert SCRIPT.is_file()


def test_inventory_detects_divergent_complete_packages(tmp_path):
    module = _module()
    repo = tmp_path / "repo"
    profile = tmp_path / "profile"
    source = _package(repo, "example", "source")
    live = _package(profile, "example", "live")
    (live / "references").mkdir()
    (live / "references" / "stage.md").write_text("mvp\n", encoding="utf-8")

    source_packages, source_errors = module.discover(repo / "skills")
    profile_packages, profile_errors = module.discover(profile / "skills")

    assert not source_errors
    assert not profile_errors
    assert source_packages["example"].digest != profile_packages["example"].digest
    assert profile_packages["example"].file_count == 3

    state = tmp_path / "state" / "state.json"
    module.atomic_json_write(
        state,
        {
            "profiles": {
                "ned": {
                    "example": {
                        "digest": profile_packages["example"].digest,
                    }
                }
            }
        },
    )
    assert json.loads(state.read_text(encoding="utf-8"))["profiles"]["ned"]["example"]["digest"]
    assert state.stat().st_mode & 0o777 == 0o600
    assert source.is_dir()


def test_inventory_rejects_duplicate_frontmatter_names(tmp_path):
    module = _module()
    root = tmp_path / "profile"
    _package(root, "first")
    second = _package(root, "second")
    (second / "SKILL.md").write_text(
        "---\nname: first\ndescription: duplicate\n---\n\n# Duplicate\n",
        encoding="utf-8",
    )

    packages, errors = module.discover(root / "skills")

    assert "first" in packages
    assert any("duplicate skill name" in error for error in errors)
