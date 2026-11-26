"""Expose the pinned Hermes browser without downloading a duplicate browser."""
from pathlib import Path
import subprocess

browsers = list(Path('/opt/hermes/tools').glob('chromium-*/chrome-linux*/chrome'))
if len(browsers) != 1:
    raise SystemExit('Expected exactly one browser in the pinned Hermes image')
browser = browsers[0]
result = subprocess.run([str(browser), '--version'], check=True, capture_output=True, text=True, timeout=15)  # noqa: S603 -- fixed pinned-image browser path, no shell
if not result.stdout.startswith('Google Chrome for Testing '):
    raise SystemExit('Pinned Hermes browser is not Google Chrome for Testing')
Path('/usr/local/bin/google-chrome').symlink_to(browser)
