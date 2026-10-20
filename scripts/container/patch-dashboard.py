"""Apply a guarded root-route compatibility fix to the pinned Hermes dashboard."""
import hashlib
from pathlib import Path
import sys


def patch_dashboard(path):
    path = Path(path)
    original = path.read_bytes()
    # Source identity belongs to the official digest pinned in Dockerfile.
    expected = "7f4143db80fcb1ef667ff9faed9076f334b73b55a78dfb781bacc932845be13e"
    if hashlib.sha256(original).hexdigest() != expected:
        raise ValueError("Pinned Hermes dashboard source changed; review the compatibility patch")
    source = original.decode()
    source = source.replace(
        "from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response",
        "from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response",
    )
    anchor = '    async def serve_spa(full_path: str, request: Request):\n        prefix = _normalise_prefix(request.headers.get("x-forwarded-prefix"))\n'
    if source.count(anchor) != 1:
        raise ValueError("Pinned dashboard SPA entry point is ambiguous")
    source = source.replace(anchor, anchor + '''        # NED: canonicalize the entry route before React profile initialization.
        if full_path == "":
            target = prefix + "/sessions"
            if request.url.query:
                target += "?" + request.url.query
            return RedirectResponse(target, status_code=302, headers=_NO_STORE)
''')
    path.write_text(source)


if __name__ == "__main__":
    patch_dashboard(sys.argv[1])
