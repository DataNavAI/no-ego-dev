import json
from pathlib import Path
import subprocess
import unittest

import pytest

from eval_runner.container import ROOT, credential_text, run_container
from eval_runner.container_entry import redact_selected_credentials

checks = unittest.TestCase()


@pytest.fixture
def package(tmp_path, monkeypatch):
    directory = tmp_path / "sample"
    directory.mkdir()
    (directory / "SKILL.md").write_text("---\nname: sample\ndescription: Synthetic engine fixture\n---\n")
    (directory / "evaldata").mkdir()
    (directory / "evaldata/verify.py").write_text("print('synthetic engine boundary')\n")
    evaluation = directory / "EVAL.yaml"
    evaluation.write_text("prompt: Synthetic engine fixture\nexpectations: [Synthetic]\nparameters:\n"
                          "  verification_script: evaldata/verify.py\n  expected_artifacts: [artifact.txt]\n")
    credential = tmp_path / "provider.env"
    credential.write_text("OPENROUTER_API_KEY=synthetic-provider-secret\n")
    credential.chmod(0o600)
    monkeypatch.setattr("eval_runner.container.shutil.which", lambda _name: "/synthetic/docker")
    return evaluation, credential, tmp_path / "reports"


class DockerBoundary:
    def __init__(self, failure=None):
        self.failure = failure
        self.calls = []
        self.resources = {"container": set(), "volume": set()}
        self.image_label = ""
        self.failed_once = False
        self.copied_credentials = None

    def __call__(self, argv, **_options):
        arguments = argv[1:]
        if arguments[:1] == ["--context"]:
            arguments = arguments[2:]
        self.calls.append(arguments)
        if arguments[0] == "cp" and arguments[-1].endswith(":/opt/ned-eval-credentials"):
            self.copied_credentials = {filename.name: filename.read_text() for filename in Path(arguments[1]).iterdir()}
        if self.failure == "daemon":
            raise RuntimeError("synthetic private provider failure")
        stdout = ""
        if arguments[0] == "info":
            stdout = "linux"
        elif arguments[0] == "build":
            if self.failure == "build":
                return subprocess.CompletedProcess(argv, 1, "", "synthetic-provider-secret")
            self.image_label = arguments[arguments.index("--label") + 1].split("=", 1)[1]
        elif arguments[:2] == ["image", "inspect"]:
            if "{{.Id}}" not in arguments and not self.image_label:
                return subprocess.CompletedProcess(argv, 1, "", "")
            stdout = "sha256:" + "a" * 64 if "{{.Id}}" in arguments else self.image_label
        elif arguments[:2] == ["volume", "create"]:
            self.resources["volume"].add(arguments[-1])
            if self.failure == "partial-volume" and not self.failed_once:
                self.failed_once = True
                raise subprocess.TimeoutExpired(argv, 1)
        elif arguments[0] == "run":
            self.resources["container"].add(arguments[arguments.index("--name") + 1])
        elif arguments[0] == "inspect":
            stdout = "unhealthy" if self.failure == "health" else "healthy"
        elif arguments[0] in self.resources and arguments[1] == "ls":
            stdout = "\n".join(sorted(self.resources[arguments[0]]))
        elif arguments[0] in self.resources and arguments[1] == "rm":
            if self.failure == "cleanup":
                return subprocess.CompletedProcess(argv, 1, "", "synthetic-provider-secret")
            self.resources[arguments[0]].discard(arguments[-1])
        elif "eval_runner.cli" in arguments:
            if self.failure == "interrupt":
                raise KeyboardInterrupt()
            if self.failure == "timeout":
                raise subprocess.TimeoutExpired(argv, 1)
            if self.failure == "agent":
                return subprocess.CompletedProcess(argv, 2, "", "synthetic-provider-secret")
        elif arguments[-1] == "export" and self.failure == "export":
            return subprocess.CompletedProcess(argv, 1, "", "synthetic-provider-secret")
        elif arguments[0] == "cp" and ":/projects/eval-export/" in arguments[1]:
            if self.failure == "copy":
                return subprocess.CompletedProcess(argv, 1, "", "synthetic-provider-secret")
            destination = Path(arguments[2])
            if destination.name == "result.json":
                destination.write_text(json.dumps({"passed": self.failure not in {"verifier", "agent"},
                                                   "infrastructure_failure": False}))
            else:
                destination.write_text("Synthetic evaluation-engine report only")
        return subprocess.CompletedProcess(argv, 0, stdout, "")


@pytest.mark.parametrize("failure,expected", [(None, 0), ("agent", 2), ("verifier", 2),
                                               ("health", 3), ("partial-volume", 3),
                                               ("timeout", 3), ("interrupt", 130), ("cleanup", 3),
                                               ("build", 3), ("export", 3), ("copy", 3)])
def test_owned_container_lifecycle_never_turns_failure_into_a_pass(package, failure, expected):
    evaluation, credential, output = package
    boundary = DockerBoundary(failure)
    code, directory = run_container(evaluation, output, credential, context="synthetic-context",
                                    execute=boundary, pause=lambda _seconds: None)
    checks.assertEqual(code, expected)
    receipt = json.loads((directory / "receipt.json").read_text())
    checks.assertEqual(receipt["cleanup_verified"], failure != "cleanup")
    checks.assertNotIn("synthetic-provider-secret", (directory / "receipt.json").read_text())
    if failure != "cleanup":
        checks.assertEqual(boundary.resources, {"container": set(), "volume": set()})
    launch = next((call for call in boundary.calls if call[0] == "run"), None)
    if launch:
        checks.assertNotIn("-p", launch)
        checks.assertNotIn("--privileged", launch)
        checks.assertEqual(len([argument for argument in launch if argument == "-v"]), 3)
        checks.assertTrue(all("ned-eval-" in launch[index + 1] for index, argument in enumerate(launch) if argument == "-v"))
    if failure is None:
        agent = next(index for index, call in enumerate(boundary.calls) if "eval_runner.cli" in call)
        exported = next(index for index, call in enumerate(boundary.calls) if call[-1] == "export")
        checks.assertLess(agent, exported)
        checks.assertEqual(receipt["image_id"], "sha256:" + "a" * 64)
        checks.assertEqual({name.name for name in directory.iterdir()}, {"receipt.json", "result.json", "report.html", "report.md"})


def test_credentials_and_output_preflight_fail_before_docker(package):
    evaluation, credential, output = package
    boundary = DockerBoundary()
    for text in ("PATH=/untrusted\n", "NED_DATABASE_URL=/untrusted\n", "OPENROUTER_API_KEY=\n", ""):
        credential.write_text(text)
        with checks.assertRaises(ValueError):
            run_container(evaluation, output, credential, execute=boundary)
    credential.write_text("OPENROUTER_API_KEY=synthetic-provider-secret\n")
    credential.chmod(0o644)
    with checks.assertRaises(ValueError):
        credential_text(credential, "openrouter")
    credential.chmod(0o600)
    link = credential.with_name("linked.env")
    link.symlink_to(credential)
    with checks.assertRaises(ValueError):
        credential_text(link, "openrouter")
    with checks.assertRaises(ValueError):
        run_container(evaluation, ROOT / ".forbidden-eval-output", credential, execute=boundary)
    checks.assertEqual(boundary.calls, [])


def test_unreachable_daemon_is_infrastructure_failure_not_behavioral_pass(package):
    evaluation, credential, output = package
    code, directory = run_container(evaluation, output, credential, execute=DockerBoundary("daemon"))
    checks.assertEqual(code, 3)
    receipt = json.loads((directory / "receipt.json").read_text())
    checks.assertEqual(receipt["status"], "infrastructure_failed")
    checks.assertFalse(receipt["cleanup_verified"])


def test_missing_docker_and_unsafe_package_never_execute_an_agent(package, monkeypatch):
    evaluation, credential, output = package
    boundary = DockerBoundary()
    monkeypatch.setattr("eval_runner.container.shutil.which", lambda _name: None)
    with checks.assertRaises(RuntimeError):
        run_container(evaluation, output, credential, execute=boundary)
    (evaluation.parent / ".env").write_text("synthetic forbidden runtime state")
    with checks.assertRaises(ValueError):
        run_container(evaluation, output, credential, execute=boundary)
    checks.assertEqual(boundary.calls, [])


def test_workflow_stages_declared_skills_without_exporting_a_host_profile(package, tmp_path, monkeypatch):
    evaluation, credential, output = package
    repository = tmp_path / "repository"
    repository.mkdir()
    (repository / "distribution.yaml").write_text("name: synthetic-runtime\n")
    (repository / "config.yaml").write_text("model:\n  provider: openrouter\n  default: synthetic-model\n")
    skill = repository / "skills/sample"
    skill.parent.mkdir()
    evaluation.parent.rename(skill)
    workflow = repository / "workflows/sample-workflow"
    workflow.mkdir(parents=True)
    selected = workflow / "EVAL.yaml"
    selected.write_text("prompt: Synthetic engine workflow\nexpectations: [Synthetic]\nparameters:\n"
                        "  skills: [sample]\n  verification_script: skills/sample/evaldata/verify.py\n"
                        "  expected_artifacts: [artifact.txt]\n")
    monkeypatch.setattr("eval_runner.container.ROOT", repository)
    boundary = DockerBoundary()
    code, _directory = run_container(selected, output, credential, image="explicit-image", execute=boundary)
    checks.assertEqual(code, 0)
    copied = [call for call in boundary.calls if call[0] == "cp"]
    checks.assertTrue(any(call[-1].endswith(":/opt/ned/skills/sample") for call in copied))
    checks.assertTrue(any(call[-1].endswith(":/opt/ned/workflows/sample-workflow") for call in copied))
    checks.assertFalse(any(call[:2] == ["image", "rm"] for call in boundary.calls))
    selected.write_text(selected.read_text().replace("skills: [sample]", "skills: ['../escape']"))
    with checks.assertRaises(ValueError):
        run_container(selected, output, credential, execute=DockerBoundary())


def test_oauth_home_copies_only_selected_provider_and_preserves_source(package, tmp_path):
    evaluation, _credential, output = package
    home = tmp_path / "private-home"
    home.mkdir(mode=0o700)
    (home / "config.yaml").write_text("model:\n  provider: openai-codex\n  default: synthetic-model\n")
    auth = {"active_provider": "openai-codex", "providers": {
        "openai-codex": {"access_token": "synthetic-selected-token"},
        "openrouter": {"api_key": "synthetic-unselected-secret"}},
        "credential_pool": {"openrouter": [{"key": "synthetic-unselected-pool"}]}}
    (home / "auth.json").write_text(json.dumps(auth))
    (home / "auth.json").chmod(0o600)
    (home / ".env").write_text("OPENROUTER_API_KEY=synthetic-unselected-env\nPATH=/untrusted\n")
    (home / ".env").chmod(0o600)
    (home / "sessions.db").write_text("synthetic-private-session")
    boundary = DockerBoundary()
    code, _directory = run_container(evaluation.parent, output, credential_home=home, execute=boundary)
    checks.assertEqual(code, 0)
    copied = boundary.copied_credentials
    checks.assertEqual(set(copied), {"auth.json", ".env"})
    checks.assertEqual(json.loads(copied["auth.json"])["providers"], {"openai-codex": auth["providers"]["openai-codex"]})
    checks.assertNotIn("synthetic-unselected", str(copied))
    checks.assertEqual(json.loads((home / "auth.json").read_text()), auth)
    checks.assertEqual((home / "sessions.db").read_text(), "synthetic-private-session")
    checks.assertFalse(Path(next(call[1] for call in boundary.calls if call[0] == "cp" and call[-1].endswith(":/opt/ned-eval-credentials"))).exists())
    (home / "auth.json").chmod(0o644)
    rejected = DockerBoundary()
    with checks.assertRaises(ValueError):
        run_container(evaluation, output, credential_home=home, execute=rejected)
    checks.assertEqual(rejected.calls, [])


def test_provider_override_cannot_inherit_another_providers_endpoint(package, tmp_path):
    evaluation, _credential, output = package
    home = tmp_path / "home"
    home.mkdir()
    (home / "config.yaml").write_text("model:\n  provider: openrouter\n  default: synthetic-source\n  base_url: https://old-provider.invalid/v1\n")
    (home / "auth.json").write_text(json.dumps({"providers": {"openai-codex": {"access_token": "synthetic-selected"}}}))
    (home / "auth.json").chmod(0o600)
    with checks.assertRaises(ValueError):
        run_container(evaluation, output, credential_home=home, provider="openai-codex", execute=DockerBoundary())
    boundary = DockerBoundary()
    code, _directory = run_container(evaluation, output, credential_home=home, provider="openai-codex", model="synthetic-model", execute=boundary)
    checks.assertEqual(code, 0)
    prepared = next(command for command in boundary.calls if "prepare" in command)
    checks.assertNotIn("--base-url", prepared)


def test_generic_skill_without_deterministic_verifier_uses_real_evaluator(package):
    evaluation, credential, output = package
    evaluation.write_text("prompt: Synthetic agent task\nexpectations: [Observable synthetic outcome]\n")
    boundary = DockerBoundary()
    code, _directory = run_container(evaluation.parent, output, credential, execute=boundary)
    checks.assertEqual(code, 0)
    checks.assertTrue(any("eval_runner.cli" in command for command in boundary.calls))


def test_private_host_source_staging_exposes_only_public_package_to_hermes(package):
    evaluation, credential, output = package
    evaluation.parent.chmod(0o700)
    evaluation.chmod(0o600)
    boundary = DockerBoundary()
    code, _directory = run_container(evaluation, output, credential, execute=boundary)
    checks.assertEqual(code, 0)
    normalizations = [command for command in boundary.calls if "chmod" in command]
    checks.assertTrue(any(command[-3:] == ["-R", "a+rX", "/opt/ned/skills/sample"] for command in normalizations))
    checks.assertTrue(any(command[-2:] == ["0644", "/opt/ned-eval/entry.py"] for command in normalizations))
    checks.assertTrue(all("credentials" not in command[-1] for command in normalizations))
    checks.assertEqual(evaluation.parent.stat().st_mode & 0o777, 0o700)
    checks.assertEqual(credential.stat().st_mode & 0o777, 0o600)


def test_export_removes_selected_opaque_credentials_even_without_key_labels(tmp_path):
    (tmp_path / "auth.json").write_text(json.dumps({"providers": {"sample": {"access_token": "opaque-oauth-credential"}}}))
    (tmp_path / ".env").write_text('SAMPLE_API_KEY="opaque-api-credential"\n')
    result = redact_selected_credentials({"output": "opaque-oauth-credential opaque-api-credential", "nested": ["safe"]}, tmp_path)
    checks.assertEqual(result, {"output": "[REDACTED] [REDACTED]", "nested": ["safe"]})
    (tmp_path / "auth.json").write_text(json.dumps({"providers": {"sample": {"access_token": "refreshed-oauth-credential"}}}))
    checks.assertEqual(redact_selected_credentials({"output": "refreshed-oauth-credential"}, tmp_path), {"output": "[REDACTED]"})
