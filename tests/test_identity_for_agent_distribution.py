from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "identity-for-agent"
POLICY = SKILL / "references" / "profile-credential-policy.yaml"
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
        "approved_profiles",
        "authorized_at",
    ]
    assert sharing["profile_removal"] == (
        "remove profile approval only; preserve the grant while another approved profile remains"
    )
    assert "kiaened" in sharing["forbidden_sources"]
    assert "kiaened" in sharing["forbidden_consumers"]
    assert "google" in sharing["forbidden_providers"]


def test_skill_requires_profile_attribution_and_explicit_store_path_on_every_request():
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")

    assert "ifa request <provider> --profile \"$HERMES_PROFILE\" --path \"$IFA_STORE_PATH\"" in text
    assert "Never use IFA's implicit global store path" in text
    assert "Refuse to create a request when `HERMES_PROFILE` is empty" in text
