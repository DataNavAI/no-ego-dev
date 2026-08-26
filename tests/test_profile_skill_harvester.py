import importlib.util
import json
import os
import re
import subprocess
import sys
import time
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
        "Advances an observed package digest only after the update is merged",
    ):
        assert marker in skill or marker in "\n".join(evaluation["expectations"])
    assert SCRIPT.is_file()


def test_harvested_skill_updates_must_publish_canonically_before_rollout():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = SKILL_DIR / evaluation["parameters"]["fixture"]
    state_machine = SKILL_DIR / "references" / "self-unblocking-publication.md"
    contract = (
        f"{skill}\n{fixture.read_text(encoding='utf-8')}\n"
        f"{state_machine.read_text(encoding='utf-8')}\n"
        f"{evaluation['prompt']}\n"
        + "\n".join(evaluation["expectations"])
    )

    for marker in (
        "No live-only harvest completion",
        "canonical publication is a prerequisite to rollout",
        "absent from the canonical repository",
        "must not be deployed directly",
        "merged into the remote default branch",
    ):
        assert marker in contract

    assert "live profile rollout is not publication" in contract.lower()
    assert "state must not advance" in contract.lower()
    assert "must not replace the prior observed digest" in contract.lower()
    assert "remain `newly_observed`" in contract
    assert "recorded separately" in contract.lower()
    assert "merged or stable-rejection disposition" not in contract

    boundaries = (
        SKILL_DIR / "references" / "controller-to-profile-rollout-boundaries.md"
    ).read_text(encoding="utf-8")
    propagation = (
        SKILL_DIR / "references" / "live-source-freeze-and-target-sync.md"
    ).read_text(encoding="utf-8")
    assert "cannot be overridden into distribution rollout" in boundaries
    assert "No user scope override" in boundaries
    assert "never source rollout bytes from a candidate worktree" in boundaries
    assert "Never use the candidate worktree as the rollout source" in propagation
    assert "candidate worktree may be used as the rollout source" not in propagation
    assert "explicit owner overrides after a known negative gate" not in skill
    assert "never authorize rollout of the failed candidate" in skill


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


def test_initialization_cleanup_preserves_owner_replaced_after_validation(tmp_path, monkeypatch):
    module = _lease_module()
    lock_dir = tmp_path / "owner-race.lock"
    lock_dir.mkdir()
    owner_path = lock_dir / "owner.json"
    owner_path.write_text(json.dumps({"pid": 123, "token": "ours"}), encoding="utf-8")
    original_read = module._read_owner_file

    def replace_after_read(path):
        owner = original_read(path)
        owner_path.write_text(json.dumps({"pid": 999, "token": "unknown"}), encoding="utf-8")
        return owner

    monkeypatch.setattr(module, "_read_owner_file", replace_after_read)

    assert not module.cleanup_initializing(lock_dir, 123, "ours")
    assert json.loads(owner_path.read_text(encoding="utf-8")) == {"pid": 999, "token": "unknown"}


def test_cleanup_owned_restores_unknown_owner_without_claim_artifacts(tmp_path):
    module = _lease_module()
    lock_dir = tmp_path / "unknown-owner.lock"
    lock_dir.mkdir()
    owner_path = lock_dir / "owner.json"
    unknown = {"pid": 999, "token": "unknown"}
    owner_path.write_text(json.dumps(unknown), encoding="utf-8")

    assert not module.cleanup_owned(lock_dir, 123, "ours")
    assert json.loads(owner_path.read_text(encoding="utf-8")) == unknown
    assert sorted(path.name for path in lock_dir.iterdir()) == ["owner.json"]


def test_cleanup_owned_restores_authenticated_owner_when_extra_artifact_blocks_removal(tmp_path):
    module = _lease_module()
    lock_dir = tmp_path / "extra-artifact.lock"
    lock_dir.mkdir()
    owner = {"pid": 123, "token": "ours", "expires_at": "2026-08-24T00:00:00Z"}
    owner_path = lock_dir / "owner.json"
    owner_path.write_text(json.dumps(owner), encoding="utf-8")
    (lock_dir / "unexpected.log").write_text("preserve", encoding="utf-8")

    assert not module.cleanup_owned(lock_dir, 123, "ours")
    assert json.loads(owner_path.read_text(encoding="utf-8")) == owner
    assert (lock_dir / "unexpected.log").read_text(encoding="utf-8") == "preserve"
    assert sorted(path.name for path in lock_dir.iterdir()) == ["owner.json", "unexpected.log"]
    assert not list(tmp_path.glob(".lease-owner-backup-*"))


def test_stale_initialization_reclamation_is_bounded_and_fail_closed(tmp_path):
    module = _lease_module()
    fresh = tmp_path / "fresh.lock"
    fresh.mkdir()
    assert not module.reclaim_stale_initialization(fresh)
    assert fresh.exists()

    old = time.time() - module.MAX_LEASE_SECONDS - 120
    stale_empty = tmp_path / "stale-empty.lock"
    stale_empty.mkdir()
    os.utime(stale_empty, (old, old))
    assert module.reclaim_stale_initialization(stale_empty)
    assert not stale_empty.exists()

    stale_malformed = tmp_path / "stale-malformed.lock"
    stale_malformed.mkdir()
    malformed = stale_malformed / "owner.json"
    malformed.write_text("not-json", encoding="utf-8")
    os.utime(malformed, (old, old))
    os.utime(stale_malformed, (old, old))
    assert module.reclaim_stale_initialization(stale_malformed)
    assert not stale_malformed.exists()

    stale_valid = tmp_path / "stale-valid.lock"
    stale_valid.mkdir()
    valid_owner = stale_valid / "owner.json"
    valid_owner.write_text(json.dumps({"pid": 1, "token": "valid"}), encoding="utf-8")
    os.utime(valid_owner, (old, old))
    os.utime(stale_valid, (old, old))
    assert not module.reclaim_stale_initialization(stale_valid)
    assert json.loads(valid_owner.read_text(encoding="utf-8")) == {"pid": 1, "token": "valid"}

    stale_with_extra = tmp_path / "stale-extra.lock"
    stale_with_extra.mkdir()
    malformed_extra = stale_with_extra / "owner.json"
    malformed_extra.write_text("not-json", encoding="utf-8")
    extra = stale_with_extra / "unknown"
    extra.write_text("preserve", encoding="utf-8")
    os.utime(malformed_extra, (old, old))
    os.utime(extra, (old, old))
    os.utime(stale_with_extra, (old, old))
    assert not module.reclaim_stale_initialization(stale_with_extra)
    assert malformed_extra.read_text(encoding="utf-8") == "not-json"
    assert extra.read_text(encoding="utf-8") == "preserve"

    stale_symlink = tmp_path / "stale-symlink.lock"
    stale_symlink.mkdir()
    target = tmp_path / "target.json"
    target.write_text("not-json", encoding="utf-8")
    symlink_owner = stale_symlink / "owner.json"
    symlink_owner.symlink_to(target)
    os.utime(stale_symlink, (old, old))
    assert not module.reclaim_stale_initialization(stale_symlink)
    assert symlink_owner.is_symlink()


def test_stale_malformed_claim_discards_itself_when_canonical_owner_is_replaced(tmp_path, monkeypatch):
    module = _lease_module()
    lock_dir = tmp_path / "stale-race.lock"
    lock_dir.mkdir()
    owner_path = lock_dir / "owner.json"
    owner_path.write_text("not-json", encoding="utf-8")
    old = time.time() - module.MAX_LEASE_SECONDS - 120
    os.utime(owner_path, (old, old))
    os.utime(lock_dir, (old, old))
    replacement = {"pid": 999, "token": "replacement"}
    original_read = module._read_owner_file

    def replace_after_validation(path):
        try:
            return original_read(path)
        finally:
            owner_path.write_text(json.dumps(replacement), encoding="utf-8")

    monkeypatch.setattr(module, "_read_owner_file", replace_after_validation)

    assert not module.reclaim_stale_initialization(lock_dir)
    assert json.loads(owner_path.read_text(encoding="utf-8")) == replacement
    assert sorted(path.name for path in lock_dir.iterdir()) == ["owner.json"]
    assert not list(tmp_path.glob(".lease-owner-backup-*"))

    monkeypatch.setattr(module, "_read_owner_file", original_read)
    assert module.cleanup_owned(lock_dir, 999, "replacement")
    assert not lock_dir.exists()


def _unsafe_policy_sentence(sentence: str) -> bool:
    action = re.compile(
        r"\b(?:kill(?:s|ed|ing)?|signal(?:s|ed|ing)?|terminat\w*|stop(?!-)(?:s|ped|ping)?|send\s+(?:a\s+)?sig(?:term|kill)|shut(?:s|ting)?\s+down)\b",
        re.IGNORECASE,
    )
    subject = re.compile(r"\b(?:pid|keeper|process|worker|owner\s+record)\b", re.IGNORECASE)
    direct_negation_before = re.compile(
        r"\b(?:never|do(?:es)?\s+not|must\s+not|prohibit\w*)\b"
        r"(?:\s+(?:send|sends|use|restart|or|a|an|the|any|direct|directly|live|recorded|stale|owner|keeper|process|worker|pid|from|by|based|only|on|metadata|to)){0,8}\s*$",
        re.IGNORECASE,
    )
    action_modifier_before = re.compile(
        r"(?:\b(?:without|instead\s+of)\s*|\brather\s+than(?:\s+blindly\s+calling\s+os\.)?\s*|\bunsafe(?:\s+(?:direct|pid|keeper|process)){0,3}\s*|\bpid\s+reuse\s+could\s*)$",
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
            bounded_prefix = prefix[-120:]
            if (
                not direct_negation_before.search(bounded_prefix)
                and not action_modifier_before.search(bounded_prefix)
                and not no_subject_before.search(bounded_prefix)
            ):
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
        "The keeper process may be terminated directly.",
        "Without exposing the token terminate the keeper process directly.",
        "The owner record may be stale so terminate the keeper process with SIGTERM.",
        "Instead of deleting the log terminate the keeper process directly.",
        "Without exposing the token the keeper process can be killed directly.",
        "Without exposing the token the keeper process can be stopped directly.",
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


def test_review_policy_has_no_fixed_round_cap():
    policy_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in _policy_files(SKILL_DIR)
    ).lower()
    for forbidden in ("no round 4", "final allowed review", "final bounded negative review"):
        assert forbidden not in policy_text
    assert "there is no fixed round limit" in policy_text
    assert "round 4 and later" in policy_text
    assert "approval-convergence mode" in policy_text


def test_mvp_analytics_is_stage_scoped_not_unconditionally_required():
    mvp_dir = ROOT / "skills" / "mvp-planning"
    policy_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted({*mvp_dir.rglob("*.md"), *mvp_dir.rglob("EVAL*.yaml")})
    ).lower()
    assert "analytics is required infrastructure" not in policy_text
    assert "must make these the primary product-health outputs" not in policy_text
    for required in (
        "not required yet",
        "minimal measurement",
        "growing-product controls",
        "structured analytics is not mandatory",
    ):
        assert required in policy_text


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


def _git(repo: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert completed.returncode == 0, completed.stderr
    return completed.stdout.strip()


def _publish_test_repo(repo: Path, remote: Path) -> str:
    _git(repo, "init", "-q")
    _git(repo, "config", "user.name", "Test")
    _git(repo, "config", "user.email", "test@example.invalid")
    _git(repo, "add", "skills")
    _git(repo, "commit", "-qm", "canonical")
    _git(repo, "branch", "-M", "main")
    remote.mkdir()
    _git(remote, "init", "--bare", "-q")
    _git(remote, "symbolic-ref", "HEAD", "refs/heads/main")
    _git(repo, "remote", "add", "origin", str(remote))
    _git(repo, "push", "-qu", "origin", "main")
    return _git(repo, "rev-parse", "HEAD")


def _canonical_test_profiles(home: Path, body: str) -> dict[str, Path]:
    roots = {
        name: home / ".hermes" / "profiles" / name
        for name in ("ned", "alphaned", "kiaened", "nedxned", "newsned")
    }
    for root in roots.values():
        _package(root, "example", body)
    return roots


def _run_inventory(command: list[str], home: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=10,
        env={**os.environ, "HOME": str(home)},
    )


def test_inventory_record_requires_verified_merge_and_refuses_new_candidate(tmp_path):
    repo = tmp_path / "repo"
    home = tmp_path / "home"
    profiles = _canonical_test_profiles(home, "merged")
    profile = profiles["ned"]
    _package(repo, "example", "merged")
    remote = tmp_path / "remote.git"
    sha = _publish_test_repo(repo, remote)

    state = tmp_path / "state.json"
    profile_args = [
        item
        for name, root in sorted(profiles.items())
        for item in ("--profile", f"{name}={root}")
    ]
    common = [
        sys.executable,
        str(SCRIPT),
        "--repo",
        str(repo),
        *profile_args,
        "--state",
        str(state),
        "--canonical-remote-url",
        str(remote),
    ]
    command = [
        *common,
        "--record",
        "--verified-remote-default-sha",
        sha,
    ]
    unenrolled = _run_inventory(command, home)
    assert unenrolled.returncode != 0
    assert "before explicit --initialize enrollment" in unenrolled.stderr
    assert not state.exists()

    initialized = _run_inventory([*common, "--initialize"], home)
    assert initialized.returncode == 0, initialized.stderr
    recorded = _run_inventory(command, home)
    assert recorded.returncode == 0, recorded.stderr
    saved = json.loads(state.read_text(encoding="utf-8"))
    assert saved["record_mode"] == "verified_remote_default_merge"
    assert saved["verified_remote_default_sha"] == sha

    previous_state = state.read_bytes()

    omitted = _run_inventory(
        [
            sys.executable,
            str(SCRIPT),
            "--repo",
            str(repo),
            "--state",
            str(state),
            "--canonical-remote-url",
            str(remote),
            "--record",
            "--verified-remote-default-sha",
            sha,
        ],
        home,
    )
    assert omitted.returncode != 0
    assert "incomplete or substituted configured profile set" in omitted.stderr
    assert state.read_bytes() == previous_state

    substitute = tmp_path / "substitute"
    _package(substitute, "example", "merged")
    substituted_common = list(common)
    substituted_common[substituted_common.index(f"ned={profile}")] = f"ned={substitute}"
    substituted = _run_inventory(
        [*substituted_common, "--record", "--verified-remote-default-sha", sha],
        home,
    )
    assert substituted.returncode != 0
    assert "incomplete or substituted configured profile set" in substituted.stderr
    assert state.read_bytes() == previous_state

    duplicate = _run_inventory(
        [
            *common,
            "--profile",
            f"ned={substitute}",
            "--record",
            "--verified-remote-default-sha",
            sha,
        ],
        home,
    )
    assert duplicate.returncode != 0
    assert "discovery errors" in duplicate.stderr
    assert state.read_bytes() == previous_state

    wrong_remote_common = list(common)
    wrong_remote_common[wrong_remote_common.index(str(remote))] = str(tmp_path / "other.git")
    wrong_remote = _run_inventory(
        [*wrong_remote_common, "--record", "--verified-remote-default-sha", sha],
        home,
    )
    assert wrong_remote.returncode != 0
    assert "change the enrolled canonical remote" in wrong_remote.stderr
    assert state.read_bytes() == previous_state

    wrong_sha = _run_inventory([*command[:-1], "0" * 40], home)
    assert wrong_sha.returncode != 0
    assert "does not match both origin" in wrong_sha.stderr
    assert state.read_bytes() == previous_state

    (profile / "skills" / "example" / "SKILL.md").write_text(
        "---\nname: example\ndescription: test\n---\n\n# example\n\nunpublished\n",
        encoding="utf-8",
    )
    refused = _run_inventory(command, home)
    assert refused.returncode != 0
    assert "refusing to baseline unpublished or unrolled candidates" in refused.stderr
    assert state.read_bytes() == previous_state

    package = profile / "skills" / "example"
    for child in package.iterdir():
        child.unlink()
    package.rmdir()
    missing_scan = _run_inventory(common, home)
    assert missing_scan.returncode == 0, missing_scan.stderr
    missing_snapshot = json.loads(missing_scan.stdout)
    assert any(
        item["skill"] == "example" and item["classification"] == "missing"
        for item in missing_snapshot["candidates"]
    )
    missing_record = _run_inventory(command, home)
    assert missing_record.returncode != 0
    assert "refusing to baseline unpublished or unrolled candidates" in missing_record.stderr
    assert state.read_bytes() == previous_state

    (repo / "untracked.txt").write_text("dirty\n", encoding="utf-8")
    dirty = _run_inventory(command, home)
    assert dirty.returncode != 0
    assert "worktree is not clean" in dirty.stderr
    assert state.read_bytes() == previous_state


def test_inventory_initial_enrollment_is_explicit_and_nonrepeatable(tmp_path):
    repo = tmp_path / "repo"
    home = tmp_path / "home"
    profiles = _canonical_test_profiles(home, "preexisting-profile-drift")
    _package(repo, "example", "canonical")
    remote = tmp_path / "remote.git"
    _publish_test_repo(repo, remote)
    state = tmp_path / "state.json"
    profile_args = [
        item
        for name, root in sorted(profiles.items())
        for item in ("--profile", f"{name}={root}")
    ]
    command = [
        sys.executable,
        str(SCRIPT),
        "--repo",
        str(repo),
        *profile_args,
        "--state",
        str(state),
        "--canonical-remote-url",
        str(remote),
        "--initialize",
    ]

    initialized = _run_inventory(command, home)
    assert initialized.returncode == 0, initialized.stderr
    saved = json.loads(state.read_text(encoding="utf-8"))
    assert saved["record_mode"] == "initial_enrollment"
    first_bytes = state.read_bytes()

    repeated = _run_inventory(command, home)
    assert repeated.returncode != 0
    assert "refusing to replace an existing inventory" in repeated.stderr
    assert state.read_bytes() == first_bytes


def test_inventory_record_refuses_unchanged_divergence_after_source_merge(tmp_path):
    repo = tmp_path / "repo"
    home = tmp_path / "home"
    profiles = _canonical_test_profiles(home, "version-a")
    _package(repo, "example", "version-a")
    remote = tmp_path / "remote.git"
    _publish_test_repo(repo, remote)
    state = tmp_path / "state.json"
    profile_args = [
        item
        for name, root in sorted(profiles.items())
        for item in ("--profile", f"{name}={root}")
    ]
    common = [
        sys.executable,
        str(SCRIPT),
        "--repo",
        str(repo),
        *profile_args,
        "--state",
        str(state),
        "--canonical-remote-url",
        str(remote),
    ]
    initialized = _run_inventory([*common, "--initialize"], home)
    assert initialized.returncode == 0, initialized.stderr
    old_state = state.read_bytes()

    (repo / "skills" / "example" / "SKILL.md").write_text(
        "---\nname: example\ndescription: test\n---\n\n# example\n\nversion-b\n",
        encoding="utf-8",
    )
    _git(repo, "add", "skills/example/SKILL.md")
    _git(repo, "commit", "-qm", "publish version b")
    _git(repo, "push", "-q", "origin", "main")
    merged_sha = _git(repo, "rev-parse", "HEAD")

    scan = _run_inventory(common, home)
    assert scan.returncode == 0, scan.stderr
    candidates = json.loads(scan.stdout)["candidates"]
    assert candidates
    assert all(item["classification"] == "divergent" for item in candidates)
    assert all(item["newly_observed"] is False for item in candidates)

    refused = _run_inventory(
        [*common, "--record", "--verified-remote-default-sha", merged_sha], home
    )
    assert refused.returncode != 0
    assert "refusing to baseline unpublished or unrolled candidates" in refused.stderr
    assert state.read_bytes() == old_state


def test_inventory_record_refuses_changed_enrolled_default_branch(tmp_path):
    repo = tmp_path / "repo"
    home = tmp_path / "home"
    profiles = _canonical_test_profiles(home, "merged")
    _package(repo, "example", "merged")
    remote = tmp_path / "remote.git"
    sha = _publish_test_repo(repo, remote)
    state = tmp_path / "state.json"
    profile_args = [
        item
        for name, root in sorted(profiles.items())
        for item in ("--profile", f"{name}={root}")
    ]
    common = [
        sys.executable,
        str(SCRIPT),
        "--repo",
        str(repo),
        *profile_args,
        "--state",
        str(state),
        "--canonical-remote-url",
        str(remote),
    ]
    initialized = _run_inventory([*common, "--initialize"], home)
    assert initialized.returncode == 0, initialized.stderr
    old_state = state.read_bytes()

    _git(repo, "checkout", "-qb", "replacement-default")
    _git(repo, "push", "-q", "origin", "HEAD:replacement-default")
    _git(remote, "symbolic-ref", "HEAD", "refs/heads/replacement-default")
    _git(repo, "fetch", "-q", "origin", "replacement-default")
    refused = _run_inventory(
        [*common, "--record", "--verified-remote-default-sha", sha], home
    )
    assert refused.returncode != 0
    assert "change the enrolled symbolic default branch" in refused.stderr
    assert state.read_bytes() == old_state


def test_inventory_requires_valid_eval_backing_and_packaged_fixtures(tmp_path):
    module = _module()
    root = tmp_path / "profile"
    package = _package(root, "example")
    (package / "EVAL.yaml").unlink()
    packages, errors = module.discover(root / "skills")
    assert "example" not in packages
    assert any("missing regular EVAL.yaml" in error for error in errors)

    (package / "EVAL.yaml").write_text(
        "prompt: test\nexpectations: [test]\nparameters:\n  fixture: evaldata/missing.txt\n",
        encoding="utf-8",
    )
    packages, errors = module.discover(root / "skills")
    assert "example" not in packages
    assert any("is not a regular packaged file" in error for error in errors)


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
