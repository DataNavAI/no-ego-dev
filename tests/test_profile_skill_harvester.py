import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "profile-skill-harvester"
SCRIPT = SKILL_DIR / "scripts" / "inventory.py"
LEASE_SCRIPT = SKILL_DIR / "scripts" / "lease_lock.py"


def _module():
    spec = importlib.util.spec_from_file_location("profile_skill_inventory", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _lease_module():
    spec = importlib.util.spec_from_file_location("profile_skill_lease_lock", LEASE_SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _lease_args(lock_dir: Path) -> SimpleNamespace:
    return SimpleNamespace(
        lock_dir=str(lock_dir),
        lease_seconds=30,
        session_id="pytest-init",
        controller_profile=None,
        provider=None,
        model=None,
        worktree=None,
        branch=None,
        pr=None,
    )


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


def test_harvester_resumes_and_self_unblocks_existing_publication_before_new_inventory():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    reference_path = SKILL_DIR / "references" / "self-unblocking-publication.md"

    assert reference_path.is_file()
    contract = f"{skill}\n{reference_path.read_text(encoding='utf-8')}".lower()
    for marker in (
        "resume-before-inventory",
        "classify_failed_check",
        "repair_candidate",
        "write_evidence_commit",
        "review_final_tree",
        "guarded_merge",
        "post_merge_ci",
        "rollout",
        "release_lock",
        "manual-test-gate",
        "--match-head-commit",
        "bounded retry",
        "lease ttl",
    ):
        assert marker in contract

    release_index = contract.index("release_lock")
    assert "every terminal path" in contract[release_index - 500 : release_index + 1000]
    evidence_index = contract.index("write_evidence_commit")
    final_review_index = contract.index("review_final_tree")
    guarded_merge_index = contract.index("guarded_merge")
    assert evidence_index < final_review_index < guarded_merge_index
    assert "code-only approval" in contract
    assert "does not approve" in contract
    assert "new inventory" in contract
    assert "existing pr" in contract


def test_lease_lock_requires_exact_token_release_and_cleans_up(tmp_path):
    lock_dir = tmp_path / "harvest.lock"
    keeper = subprocess.Popen(
        [sys.executable, str(LEASE_SCRIPT), "hold", "--lock-dir", str(lock_dir),
         "--lease-seconds", "30", "--session-id", "pytest"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        assert keeper.stdout is not None
        acquired = json.loads(keeper.stdout.readline())
        assert acquired["status"] == "acquired"
        owner = json.loads((lock_dir / "owner.json").read_text(encoding="utf-8"))
        assert owner["pid"] == keeper.pid
        assert owner["token"] == acquired["token"]
        assert acquired["token"].startswith("lock_")
        assert owner["expires_at"] > owner["started_at"]

        wrong = subprocess.run(
            [sys.executable, str(LEASE_SCRIPT), "release", "--lock-dir", str(lock_dir),
             "--pid", str(keeper.pid), "--token", "wrong-token"],
            capture_output=True, text=True, timeout=10,
        )
        assert wrong.returncode != 0
        assert lock_dir.is_dir()

        released = subprocess.run(
            [sys.executable, str(LEASE_SCRIPT), "release", "--lock-dir", str(lock_dir),
             "--pid", str(keeper.pid), "--token", acquired["token"]],
            capture_output=True, text=True, timeout=10,
        )
        assert released.returncode == 0, released.stderr
        keeper.wait(timeout=10)
        assert not lock_dir.exists()
    finally:
        if keeper.poll() is None:
            keeper.terminate()
            keeper.wait(timeout=10)


def test_lease_lock_self_expires(tmp_path):
    lock_dir = tmp_path / "expiring.lock"
    completed = subprocess.run(
        [sys.executable, str(LEASE_SCRIPT), "hold", "--lock-dir", str(lock_dir),
         "--lease-seconds", "1", "--session-id", "pytest-expiry"],
        capture_output=True, text=True, timeout=10,
    )
    assert completed.returncode == 124
    assert json.loads(completed.stdout.splitlines()[0])["status"] == "acquired"
    assert not lock_dir.exists()


def test_lease_lock_socket_creation_failure_removes_new_unowned_directory(tmp_path, monkeypatch):
    module = _lease_module()
    lock_dir = tmp_path / "socket-failure.lock"

    def fail_socket(*_args):
        raise OSError("forced socket creation failure")

    monkeypatch.setattr(module.socket, "socket", fail_socket)
    with pytest.raises(OSError, match="forced socket creation failure"):
        module.hold(_lease_args(lock_dir))
    assert not lock_dir.exists()


def test_lease_lock_bind_failure_removes_new_unowned_directory(tmp_path, monkeypatch):
    module = _lease_module()
    lock_dir = tmp_path / "bind-failure.lock"

    class FailingSocket:
        def setsockopt(self, *_args):
            return None

        def bind(self, *_args):
            raise OSError("forced bind failure")

        def close(self):
            return None

    monkeypatch.setattr(module.socket, "socket", lambda *_args: FailingSocket())
    with pytest.raises(OSError, match="forced bind failure"):
        module.hold(_lease_args(lock_dir))
    assert not lock_dir.exists()


def test_lease_lock_owner_write_failure_removes_new_unowned_directory(tmp_path, monkeypatch):
    module = _lease_module()
    lock_dir = tmp_path / "write-failure.lock"

    def fail_write(*_args, **_kwargs):
        raise OSError("forced owner write failure")

    monkeypatch.setattr(module, "write_json_atomic", fail_write)
    with pytest.raises(OSError, match="forced owner write failure"):
        module.hold(_lease_args(lock_dir))
    assert not lock_dir.exists()


def _unsafe_policy_sentence(sentence: str) -> bool:
    action = re.compile(
        r"\b(?:kill|signal(?:s|ed|ing)?|terminat\w*|stop(?!-)|send\s+(?:a\s+)?sig(?:term|kill)|shut\s+down)\b",
        re.IGNORECASE,
    )
    subject = re.compile(r"\b(?:pid|keeper|process|worker|owner\s+record)\b", re.IGNORECASE)
    safe_before = re.compile(
        r"\b(?:never|do(?:es)?\s+not|must\s+not|prohibit\w*|unsafe|without|rather\s+than|instead\s+of|may\s+be|pid\s+reuse\s+could)\b",
        re.IGNORECASE,
    )
    no_subject_before = re.compile(
        r"\bno\s+(?:live\s+)?(?:pid|keeper|process|worker)\b(?:\s+\w+){0,4}\s*$",
        re.IGNORECASE,
    )
    for clause in re.split(r"[;,]", sentence):
        if not subject.search(clause):
            continue
        for match in action.finditer(clause):
            if clause[max(0, match.start() - 5) : match.start()].lower().endswith("self-"):
                continue
            prefix = clause[: match.start()]
            bounded_prefix = prefix[-80:]
            if not safe_before.search(bounded_prefix) and not no_subject_before.search(bounded_prefix):
                return True
    return False


def _policy_files(root: Path) -> list[Path]:
    return sorted({*root.rglob("*.md"), *root.rglob("EVAL*.yaml")})


def test_policy_contradiction_classifier_rejects_adversarial_direct_signaling():
    unsafe = (
        "Stop the keeper using its recorded PID.",
        "Send SIGTERM to the keeper PID.",
        "Never log the token; terminate the keeper process directly.",
        "Terminate the keeper process because leaving it is unsafe.",
        "Kill the worker referenced by the owner record.",
        "If no productive work remains terminate the keeper process with SIGTERM.",
    )
    safe = (
        "Never signal a PID from owner metadata.",
        "Do not send SIGTERM to the keeper PID.",
        "The keeper may self-terminate after authenticated release.",
        "No process is signaled from stale PID metadata.",
    )
    assert all(_unsafe_policy_sentence(sentence) for sentence in unsafe)
    assert not any(_unsafe_policy_sentence(sentence) for sentence in safe)


def test_policy_contradiction_scan_includes_eval_yaml(tmp_path):
    (tmp_path / "nested").mkdir()
    markdown = tmp_path / "SKILL.md"
    evaluation = tmp_path / "EVAL.yaml"
    alternate = tmp_path / "nested" / "EVAL.security.yaml"
    unrelated = tmp_path / "nested" / "config.yaml"
    for path in (markdown, evaluation, alternate, unrelated):
        path.write_text("policy\n", encoding="utf-8")

    assert _policy_files(tmp_path) == sorted((evaluation, alternate, markdown))


def test_package_policy_never_directs_pid_based_keeper_termination():
    unsafe = []
    for path in _policy_files(SKILL_DIR):
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for sentence in re.split(r"(?<=[.!?])\s+", line):
                if _unsafe_policy_sentence(sentence):
                    unsafe.append(f"{path.relative_to(SKILL_DIR)}:{line_number}: {sentence}")

    assert unsafe == [], "Direct PID/keeper termination guidance:\n" + "\n".join(unsafe)


def test_lease_lock_never_signals_an_unverified_live_pid(tmp_path):
    lock_dir = tmp_path / "harvest.lock"
    lock_dir.mkdir()
    sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
    try:
        (lock_dir / "owner.json").write_text(
            json.dumps(
                {
                    "pid": sleeper.pid,
                    "token": "lock_foreign-process",
                    "session_id": "stale-session",
                    "expires_at": "2000-01-01T00:00:00Z",
                }
            ),
            encoding="utf-8",
        )
        released = subprocess.run(
            [
                sys.executable,
                str(LEASE_SCRIPT),
                "release",
                "--lock-dir",
                str(lock_dir),
                "--pid",
                str(sleeper.pid),
                "--token",
                "lock_foreign-process",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        assert released.returncode == 0, released.stderr
        assert sleeper.poll() is None
        assert not lock_dir.exists()
    finally:
        if sleeper.poll() is None:
            sleeper.terminate()
        sleeper.wait(timeout=5)


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
