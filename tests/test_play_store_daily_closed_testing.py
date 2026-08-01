from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "play-store-publisher"


def test_daily_closed_testing_release_contract_is_complete() -> None:
    skill = (PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    one_time_eval = yaml.safe_load((PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    daily_eval_path = PACKAGE / "EVAL.daily-closed-testing.yaml"
    assert daily_eval_path.is_file()
    daily_eval = yaml.safe_load(daily_eval_path.read_text(encoding="utf-8"))
    daily_fixture = (PACKAGE / daily_eval["parameters"]["fixture"]).read_text(
        encoding="utf-8"
    )
    daily_expectations = "\n".join(daily_eval["expectations"])

    assert "daily" not in one_time_eval["prompt"].lower()
    assert "Daily Closed-Testing Release Loop" in skill
    assert "latest uploaded Play versionCode" in skill
    assert "max(local versionCode, latest uploaded Play versionCode) + 1" in skill
    assert "source commit before the release-only version bump" in skill
    assert "closed testing track" in skill
    assert "Never upload this daily build to production" in skill
    assert "No releasable changes" in skill
    assert "release-only version bump" in skill
    assert "persist the successful source commit" in skill.lower()
    assert "daily" in skill.lower()
    assert "dedicated app-scoped service account" in skill
    assert "without production-release permission" in skill
    assert "fixed-argument uploader" in skill
    assert "credentials unavailable" in skill
    assert ".projects/<project>/product/supported-device-interfaces.yaml" in skill
    assert "exact release candidate" in skill

    lowered = daily_expectations.lower()
    assert "daily" in lowered
    assert "closed testing" in lowered
    assert "versioncode" in lowered
    assert "production" in lowered
    assert "no releasable changes" in lowered
    assert "track override" in lowered
    assert "supported-device-interface" in lowered

    lowered_fixture = daily_fixture.lower()
    for scenario in (
        "no releasable change",
        "prior release-only bump",
        "build failure before upload",
        "accepted upload followed by lost verification",
        "concurrent higher play versioncode",
        "attempted non-closed track",
        "corrupt or missing state",
        "read-back mismatch",
        "repository-controlled argument injection",
    ):
        assert scenario in lowered_fixture
