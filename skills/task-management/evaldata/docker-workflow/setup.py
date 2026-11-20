import os
from pathlib import Path

import yaml

home = Path(os.environ["HERMES_HOME"]).resolve()
project = home / "workspace"
project.mkdir(mode=0o700, exist_ok=True)
config_path = home / "config.yaml"
config = yaml.safe_load(config_path.read_text())
config.setdefault("terminal", {})["cwd"] = str(project)
config.setdefault("agent", {})["max_turns"] = 40
config_path.write_text(yaml.safe_dump(config, sort_keys=False))
