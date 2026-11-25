"""Provide a read-only candidate CLI locator to a disposable skill evaluation."""
import json
import os
from pathlib import Path

candidate = Path(__file__).resolve().parents[3] / "bin" / "ned.js"
if not candidate.is_file():
    raise RuntimeError("Run this behavioral evaluation from a NED source checkout with its CLI available")
home = Path(os.environ["HERMES_HOME"])
(home / "preview-candidate.json").write_text(json.dumps({"cli": str(candidate)}), encoding="utf-8")
