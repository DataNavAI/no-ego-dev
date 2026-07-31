import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "identity-for-agent"
POLICY = SKILL / "references" / "profile-credential-policy.yaml"
GUARD = SKILL / "scripts" / "ifa_profile_guard.py"
INTENDED_PROFILES = {"ned", "nedxned", "alphaned", "kiaened"}
PROFILE_BOUND_GOOGLE = {"ned", "nedxned", "alphaned", "alphaaoi", "kiaened"}


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def test_distribution_installs_complete_identity_for_agent_skill():
    distribution = load_yaml(ROOT / "distribution.yaml")

    assert "skills/identity-for-agent/" in distribution["distribution_owned"]
    assert set(distribution["identity_for_agent"]["install_profiles"]) == INTENDED_PROFILES
    assert distribution["identity_for_agent"]["credential_policy"] == (
        "skills/identity-for-agent/references/profile-credential-policy.yaml"
    )
    assert (SKILL / "SKILL.md").is_file()
    assert (SKILL / "EVAL.yaml").is_file()
    assert (SKILL / "evaldata" / "README.md").is_file()
    assert POLICY.is_file()


def test_profile_policy_has_deterministic_isolated_google_stores_and_no_fallback():
    policy = load_yaml(POLICY)
    profiles = policy["profiles"]

    assert set(profiles) == PROFILE_BOUND_GOOGLE
    for profile_name, profile in profiles.items():
        assert profile["store_path"] == (
            f"~/.hermes/state/identity-for-agent/profiles/{profile_name}/store.json"
        )
        assert profile["owner"] == "current-os-user"
        assert profile["google"]["grant"] == "profile-bound"
        assert profile["google"]["shareable"] is False
        assert profile["account_binding"]["required"] == [
            "profile",
            "provider",
            "account",
            "authorized_at",
        ]

    defaults = policy["defaults"]
    assert defaults["cross_profile_access"] == "deny"
    assert defaults["global_store_fallback"] is False
    assert defaults["token_symlinks"] == "forbidden"
    assert defaults["directory_mode"] == "0700"
    assert defaults["file_mode"] == "0600"
    assert profiles["kiaened"]["sharing_role"] == "isolated"
    assert not any(path.is_symlink() for path in SKILL.rglob("*"))


def test_explicit_sharing_is_profile_independent_and_removal_safe():
    policy = load_yaml(POLICY)
    sharing = policy["explicit_sharing"]

    assert sharing["enabled_by_default"] is False
    assert sharing["policy_required"] is True
    assert sharing["store_path_template"] == (
        "~/.hermes/state/identity-for-agent/shared/{grant_id}/store.json"
    )
    assert sharing["required_metadata"] == [
        "grant_id",
        "provider",
        "account",
        "source_profile",
        "approved_profiles",
        "authorized_at",
    ]
    assert sharing["profile_removal"] == (
        "remove profile approval only; preserve the grant while another approved profile remains"
    )
    assert "kiaened" in sharing["forbidden_sources"]
    assert "kiaened" in sharing["forbidden_consumers"]
    assert "google" in sharing["forbidden_providers"]


def test_skill_requires_profile_attribution_and_guarded_store_selection():
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")

    assert GUARD.is_file()
    assert "python \"$IFA_GUARD\" \"$HERMES_PROFILE\" run request <provider>" in text
    assert "Do not invoke `ifa` directly" in text
    assert "Never use IFA's implicit global store path" in text
    assert "missing or unsupported HERMES_PROFILE" in text


def install_skill(tmp_path: Path) -> Path:
    installed = tmp_path / "profile" / "skills" / "identity-for-agent"
    shutil.copytree(SKILL, installed)
    return installed


def run_guard(
    installed: Path,
    home: Path,
    *args: str,
    fake_ifa: Path | None = None,
    active_profile: str | None = None,
):
    env = {
        **os.environ,
        "HOME": str(home),
        "HERMES_PROFILE": active_profile if active_profile is not None else (args[0] if args else ""),
    }
    if fake_ifa:
        env["IFA_EXECUTABLE"] = str(fake_ifa)
    return subprocess.run(
        [sys.executable, str(installed / "scripts" / "ifa_profile_guard.py"), *args],
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def fake_ifa(tmp_path: Path) -> tuple[Path, Path]:
    log = tmp_path / "ifa-argv.json"
    executable = tmp_path / "fake-ifa"
    executable.write_text(
        "#!/usr/bin/env python3\n"
        "import json, os, sys\n"
        "open(os.environ['IFA_TEST_LOG'], 'w').write(json.dumps(sys.argv[1:]))\n",
        encoding="utf-8",
    )
    executable.chmod(0o755)
    return executable, log


def test_installed_guard_enforces_profile_path_and_denies_global_fallback(tmp_path, monkeypatch):
    installed = install_skill(tmp_path)
    home = tmp_path / "home"
    executable, log = fake_ifa(tmp_path)
    monkeypatch.setenv("IFA_TEST_LOG", str(log))

    own_store = home / ".hermes/state/identity-for-agent/profiles/ned/store.json"
    own_store.parent.mkdir(parents=True, mode=0o700)
    own_store.write_text("{}", encoding="utf-8")
    own_store.chmod(0o600)
    result = run_guard(installed, home, "ned", "run", "status", fake_ifa=executable)
    assert result.returncode == 0, result.stderr
    assert json.loads(log.read_text()) == ["status", "--path", str(own_store)]

    result = run_guard(installed, home, "ned", "run", "request", "github", fake_ifa=executable)
    request_args = json.loads(log.read_text())
    assert request_args[:2] == ["request", "github"]
    assert request_args[-4:] == ["--profile", "ned", "--path", str(own_store)]

    log.unlink()
    result = run_guard(
        installed,
        home,
        "nedxned",
        "run",
        "status",
        fake_ifa=executable,
        active_profile="ned",
    )
    assert result.returncode != 0
    assert "profile attribution mismatch" in result.stderr
    assert not log.exists()

    other_store = home / ".hermes/state/identity-for-agent/profiles/nedxned/store.json"
    result = run_guard(
        installed, home, "ned", "run", "status", "--path", str(other_store), fake_ifa=executable
    )
    assert result.returncode != 0
    assert "caller-supplied --path" in result.stderr
    assert not log.exists()

    (home / ".ifa").mkdir(parents=True)
    (home / ".ifa/store.json").write_text("global", encoding="utf-8")
    result = run_guard(installed, home, "", "run", "status", fake_ifa=executable)
    assert result.returncode != 0
    assert "profile" in result.stderr.lower()
    assert not log.exists()


def test_installed_guard_rejects_runtime_store_and_token_symlinks(tmp_path, monkeypatch):
    installed = install_skill(tmp_path)
    home = tmp_path / "home"
    executable, log = fake_ifa(tmp_path)
    monkeypatch.setenv("IFA_TEST_LOG", str(log))
    runtime = home / ".hermes/state/identity-for-agent/profiles/ned"
    runtime.mkdir(parents=True)
    target = tmp_path / "credential-target"
    target.write_text("secret", encoding="utf-8")

    (runtime / "store.json").symlink_to(target)
    result = run_guard(installed, home, "ned", "run", "status", fake_ifa=executable)
    assert result.returncode != 0
    assert "symlink" in result.stderr.lower()

    (runtime / "store.json").unlink()
    (runtime / "store.json").write_text("{}", encoding="utf-8")
    (runtime / "google-token.json").symlink_to(target)
    result = run_guard(installed, home, "ned", "run", "status", fake_ifa=executable)
    assert result.returncode != 0
    assert "symlink" in result.stderr.lower()


def test_shared_grant_authorization_and_profile_removal_preserve_remaining_consumer(
    tmp_path, monkeypatch
):
    installed = install_skill(tmp_path)
    home = tmp_path / "home"
    shared = home / ".hermes/state/identity-for-agent/shared/team-gh"
    shared.mkdir(parents=True)
    store = shared / "store.json"
    store.write_text("{}", encoding="utf-8")
    metadata = shared / "grant.json"
    metadata.write_text(
        json.dumps(
            {
                "grant_id": "team-gh",
                "provider": "github",
                "account": "team",
                "source_profile": "ned",
                "approved_profiles": ["ned", "nedxned"],
                "authorized_at": "2026-07-31T00:00:00Z",
            }
        ),
        encoding="utf-8",
    )

    executable, log = fake_ifa(tmp_path)
    monkeypatch.setenv("IFA_TEST_LOG", str(log))
    result = run_guard(
        installed, home, "ned", "run", "--grant-id", "team-gh", "status", "github", fake_ifa=executable
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(log.read_text())[-2:] == ["--path", str(store)]

    result = run_guard(installed, home, "ned", "remove-profile")
    assert result.returncode == 0, result.stderr
    assert store.exists()
    assert json.loads(metadata.read_text())["approved_profiles"] == ["nedxned"]

    denied = run_guard(installed, home, "ned", "run", "--grant-id", "team-gh", "status", fake_ifa=executable)
    assert denied.returncode != 0
    grant = json.loads(metadata.read_text())
    grant.update(provider="google", approved_profiles=["nedxned"])
    metadata.write_text(json.dumps(grant), encoding="utf-8")
    denied = run_guard(
        installed, home, "nedxned", "run", "--grant-id", "team-gh", "status", fake_ifa=executable
    )
    assert denied.returncode != 0
    denied = run_guard(
        installed, home, "kiaened", "run", "--grant-id", "team-gh", "status", fake_ifa=executable
    )
    assert denied.returncode != 0


def test_shared_grant_provider_mismatch_is_denied_without_invoking_ifa(tmp_path, monkeypatch):
    installed = install_skill(tmp_path)
    home = tmp_path / "home"
    shared = home / ".hermes/state/identity-for-agent/shared/team-gh"
    shared.mkdir(parents=True)
    (shared / "store.json").write_text("{}", encoding="utf-8")
    (shared / "grant.json").write_text(
        json.dumps(
            {
                "grant_id": "team-gh",
                "provider": "github",
                "account": "team",
                "source_profile": "ned",
                "approved_profiles": ["nedxned"],
                "authorized_at": "2026-07-31T00:00:00Z",
            }
        ),
        encoding="utf-8",
    )
    executable, log = fake_ifa(tmp_path)
    monkeypatch.setenv("IFA_TEST_LOG", str(log))

    denied = run_guard(
        installed,
        home,
        "nedxned",
        "run",
        "--grant-id",
        "team-gh",
        "status",
        "google",
        fake_ifa=executable,
    )

    assert denied.returncode != 0
    assert "provider" in denied.stderr.lower()
    assert not log.exists()

    denied = run_guard(
        installed,
        home,
        "nedxned",
        "run",
        "--grant-id",
        "team-gh",
        "request",
        "github",
        fake_ifa=executable,
    )

    assert denied.returncode != 0
    assert "operation" in denied.stderr.lower()
    assert not log.exists()


def test_google_env_is_denied_without_invoking_ifa(tmp_path, monkeypatch):
    installed = install_skill(tmp_path)
    home = tmp_path / "home"
    executable, log = fake_ifa(tmp_path)
    monkeypatch.setenv("IFA_TEST_LOG", str(log))

    denied = run_guard(installed, home, "ned", "run", "env", "google", fake_ifa=executable)

    assert denied.returncode != 0
    assert "google" in denied.stderr.lower()
    assert "export" in denied.stderr.lower()
    assert not log.exists()
