from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ".projects/<project>/product/supported-device-interfaces.yaml"


def test_supported_device_interface_template_has_release_qa_contract():
    template_path = ROOT / "skills" / "product-manager" / "templates" / "supported-device-interfaces.yaml"

    data = yaml.safe_load(template_path.read_text())

    assert data["schema_version"] == 1
    assert data["artifact_path"] == ARTIFACT_PATH
    assert data["allowed_support_statuses"] == [
        "supported",
        "planned",
        "intentionally-unsupported",
        "not-applicable",
        "deprecated",
        "undecided",
    ]
    example_ids = {interface["id"] for interface in data["interfaces"]}
    assert {"web-desktop", "mobile-web", "android", "ios"} <= example_ids
    for interface in data["interfaces"]:
        assert "support_status" in interface
        assert interface["qa"]["minimum_test_cases"] >= 1
        assert interface["qa"]["required_before_deploy"] is True
        assert "test_case_ids" in interface["qa"]
        assert "latest_result" in interface["qa"]
        assert "evidence" in interface["qa"]


def test_product_and_project_management_maintain_the_interface_artifact():
    for skill_name in ["product-manager", "project-manager"]:
        skill = (ROOT / "skills" / skill_name / "SKILL.md").read_text()
        evaluation = yaml.safe_load((ROOT / "skills" / skill_name / "EVAL.yaml").read_text())
        expectations = "\n".join(evaluation["expectations"])

        assert ARTIFACT_PATH in skill
        assert "supported device interface" in skill.lower()
        assert "at least one" in skill.lower() and "test case" in skill.lower()
        assert "supported device interface" in expectations.lower()


def test_qa_and_devops_block_deploy_without_per_interface_passes():
    for skill_name in ["qa", "devops"]:
        skill = (ROOT / "skills" / skill_name / "SKILL.md").read_text()
        evaluation = yaml.safe_load((ROOT / "skills" / skill_name / "EVAL.yaml").read_text())
        expectations = "\n".join(evaluation["expectations"])

        assert ARTIFACT_PATH in skill
        assert "at least one" in skill.lower() and "test case" in skill.lower()
        assert "block" in skill.lower() and "deploy" in skill.lower()
        assert "supported device interface" in expectations.lower()
        assert "block" in expectations.lower() and "deploy" in expectations.lower()
