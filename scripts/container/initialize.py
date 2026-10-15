"""Seed only an empty, container-owned Hermes home; never overwrite operator state."""
import json
from pathlib import Path
import shutil
import sys

import yaml


def initialize(source, target, workspace):
    source = Path(source).resolve()
    target = Path(target)
    if target.is_symlink():
        raise ValueError("Profile path must not be a symlink")
    target.mkdir(parents=True, exist_ok=True)
    marker = target / ".ned-container.json"
    if marker.exists():
        if marker.is_symlink() or json.loads(marker.read_text()).get("schema") != 1:
            raise ValueError("Invalid container profile marker")
        return
    if any(target.iterdir()):
        raise ValueError("Refusing nonempty profile without container marker; use a fresh volume")
    manifest = yaml.safe_load((source / "distribution.yaml").read_text())
    owned = manifest["distribution_owned"] + ["distribution.yaml"]
    for name in owned:
        path = source / name
        if Path(name).is_absolute() or ".." in Path(name).parts or not path.exists():
            raise ValueError("Invalid or missing distribution component")
        if path.is_symlink() or (path.is_dir() and any(p.is_symlink() for p in path.rglob("*"))):
            raise ValueError("Symlink distribution components are forbidden")
    # Exclusive reservation: simultaneous or interrupted first-use fails closed.
    lock = target / ".ned-initializing"
    with lock.open("x") as handle:
        handle.write("Initialization in progress; remove only after restoring a fresh volume\n")
    for name in owned:
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():  # overlapping owned directory entries
            continue
        if (source / name).is_dir():
            shutil.copytree(source / name, destination, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        else:
            shutil.copy2(source / name, destination)
    config = yaml.safe_load((target / "config.yaml").read_text())
    config.setdefault("terminal", {})["cwd"] = workspace
    (target / "config.yaml").write_text(yaml.safe_dump(config, sort_keys=False))
    marker.write_text(json.dumps({"schema": 1, "distribution": manifest["name"], "version": manifest["version"]}) + "\n")
    lock.unlink()


if __name__ == "__main__":
    try:
        initialize(sys.argv[1], sys.argv[2], sys.argv[3])
    except (OSError, ValueError, KeyError, TypeError, yaml.YAMLError):
        print("NED profile initialization failed; use a fresh writable volume or restore its backup.", file=sys.stderr)
        sys.exit(1)
