from __future__ import annotations

from pathlib import Path
import re


ROOT = Path.cwd()


def read(name: str) -> str:
    path = ROOT / name
    return path.read_text(encoding="utf-8") if path.is_file() else ""


html = read("index.html")
script = read("app.js")
styles = read("styles.css")
readme = read("README.md")
checks = {
    "prototype stage disclosure": bool(re.search(r"prototype", html, re.I)),
    "intake form": 'id="intake-form"' in html,
    "client and pet inputs": all(token in html for token in ('name="clientName"', 'name="petName"')),
    "service input": 'name="serviceType"' in html,
    "handoff summary": 'id="handoff-summary"' in html,
    "feedback path": bool(re.search(r"mailto:|feedback", html, re.I)),
    "form interaction": "addEventListener" in script and "intake-form" in script,
    "generated output": "handoff-summary" in script and "textContent" in script,
    "responsive styling": "@media" in styles,
    "Product stage documentation": "Product stage" in readme,
    "Learning decision documentation": "Learning decision" in readme,
    "Feedback path documentation": "Feedback path" in readme,
    "Mocked/manual inventory documentation": "Mocked/manual inventory" in readme,
    "Prototype limitations documentation": "Prototype limitations" in readme,
}
failed = [name for name, passed in checks.items() if not passed]
if failed:
    print("VERIFICATION FAILED")
    for name in failed:
        print(f"- {name}")
    raise SystemExit(1)
print(f"VERIFICATION PASSED ({len(checks)} checks)")
