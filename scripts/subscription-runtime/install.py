"""Build-time installation of immutable subscription plugins and official clients.

No user profiles/credentials or shell rc files are touched. Run in an immutable
Linux image build, before exposing subscription providers to the NED API.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import platform
import shutil
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).parent


def archive(entry):
    if not entry["url"].startswith("https://"):
        raise ValueError("release archives require HTTPS")
    with urllib.request.urlopen(entry["url"], timeout=120) as response:  # noqa: S310 - fixed HTTPS release lock, checksum verified
        data = response.read(200 * 1024 * 1024 + 1)
    if len(data) > 200 * 1024 * 1024:
        raise ValueError("archive too large")
    if "sha256" in entry:
        good = hashlib.sha256(data).hexdigest() == entry["sha256"]
    elif "sha512hex" in entry:
        good = hashlib.sha512(data).hexdigest() == entry["sha512hex"]
    else:
        good = base64.b64encode(hashlib.sha512(data).digest()).decode() == entry["sha512"]
    if not good:
        raise ValueError("archive checksum mismatch")
    return tarfile.open(fileobj=io.BytesIO(data), mode="r:gz")


def patch_antigravity(directory):
    file = directory / "process.py"
    text = file.read_text()
    original = 'os.getenv("ANTIGRAVITY_CONFIG_DIR", "").strip()'
    if text.count(original) != 3 or text.count('env = _filtered_parent_env()') != 1:
        raise ValueError("unsupported Antigravity plugin interface")
    text = text.replace(original, 'token_directory()')
    text = text.replace('env = _filtered_parent_env()', 'env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "TERM": "xterm", "SSH_CONNECTION": "127.0.0.1 10000 127.0.0.1 22", "AGY_CLI_DISABLE_AUTO_UPDATE": "true"}')
    text = text.replace('logger = logging.getLogger(__name__)', 'from .ned_scope import token_directory\n\nlogger = logging.getLogger(__name__)')
    file.write_text(text)
    shutil.copyfile(ROOT / "antigravity-scope.py", directory / "ned_scope.py")
    # Let Hermes validate/store the profile-local scope setting.
    manifest = directory / "plugin.yaml"
    manifest.write_text(manifest.read_text() + '\nconfig_schema:\n  ned_config_dir:\n    type: string\n    default: ""\n')


def install(hermes_root, binary_dir, plugins_only=False):
    if not plugins_only and platform.system() != "Linux":
        raise ValueError("subscription runtime currently supports Linux file-based OAuth storage")
    lock = json.loads((ROOT / "lock.json").read_text())
    arch = platform.machine()
    if not plugins_only:
        binary_dir.mkdir(parents=True, exist_ok=True)
    for name, command in ([] if plugins_only else [("claude", "claude"), ("antigravity", "agy")]):
        entry = lock[name]["platforms"][arch]
        target = binary_dir / command
        if target.exists() or target.is_symlink():
            raise ValueError("refusing to overwrite an existing vendor client")
        with archive(entry) as source:
            member = source.getmember(entry["member"])
            if not member.isfile() or member.size > 600 * 1024 * 1024:
                raise ValueError("invalid client archive")
            with source.extractfile(member) as input_file, target.open("xb") as output:
                shutil.copyfileobj(input_file, output)
            for notice in source.getmembers():
                basename = Path(notice.name).name
                if notice.isfile() and notice.size <= 1048576 and basename.lower().startswith(("license", "notice", "copying")):
                    notices = binary_dir.parent / "share" / "ned-subscription-runtime" / name
                    notices.mkdir(parents=True, exist_ok=True)
                    with source.extractfile(notice) as input_file, (notices / basename).open("xb") as output:
                        shutil.copyfileobj(input_file, output)
        target.chmod(0o755)
    plugins = hermes_root / "plugins" / "model-providers"
    plugins.mkdir(parents=True, exist_ok=True)
    for entry in lock["plugins"]:
        target = plugins / entry["name"]
        if target.exists() or target.is_symlink():
            raise ValueError("refusing to overwrite an existing provider plugin")
        with tempfile.TemporaryDirectory() as temporary, archive(entry) as source:
            source.extractall(temporary, filter="data")
            roots = list(Path(temporary).iterdir())
            if len(roots) != 1 or not roots[0].is_dir():
                raise ValueError("unsupported plugin archive")
            shutil.copytree(roots[0] / entry["subdir"], target)
            if not (target / "LICENSE").exists() and (roots[0] / "LICENSE").is_file():
                shutil.copyfile(roots[0] / "LICENSE", target / "LICENSE")
        if entry["name"] == "antigravity-subscription-directsdk":
            patch_antigravity(target)
    (hermes_root / "ned-subscription-runtime.json").write_text(json.dumps(lock, indent=2) + '\n')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--hermes-root", required=True, type=Path)
    parser.add_argument("--bin-dir", type=Path)
    parser.add_argument("--plugins-only", action="store_true")
    args = parser.parse_args()
    if not args.plugins_only and args.bin_dir is None:
        parser.error("--bin-dir is required when installing clients")
    install(args.hermes_root, args.bin_dir, args.plugins_only)
