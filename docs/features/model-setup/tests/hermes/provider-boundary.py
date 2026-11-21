"""Test-only network boundary for the real pinned Hermes auth implementation."""
# ruff: noqa: S101 -- assertions intentionally fail this deterministic test boundary.
import base64
import json
import os
import runpy
import sys
import time

sys.path.insert(0, os.environ["NED_HERMES_SOURCE"])
from hermes_cli import auth_codex  # noqa: E402 -- import from the exact test-provisioned source.


def response(value):
    class Response:
        status_code = 200
        headers = {}

        def json(self):
            return value
    return Response()


def post(url, **kwargs):
    if url.endswith("/deviceauth/usercode"):
        assert kwargs["json"]["client_id"] == auth_codex.CODEX_OAUTH_CLIENT_ID
        return response({"user_code": "NED-TEST", "device_auth_id": "private-device-id", "interval": 3})
    assert url == auth_codex.CODEX_OAUTH_TOKEN_URL
    assert kwargs["data"]["code"] == "private-code"
    assert kwargs["data"]["code_verifier"] == "private-verifier"
    payload = base64.urlsafe_b64encode(json.dumps({"exp": int(time.time()) + 3600, "https://api.openai.com/auth": {"chatgpt_account_id": "synthetic-account"}}).encode()).decode().rstrip("=")
    return response({"access_token": "e30." + payload + ".synthetic", "refresh_token": "private-refresh-token"})


class Client:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def post(self, url, **kwargs):
        assert url == "https://auth.openai.com/api/accounts/deviceauth/token"
        assert kwargs["json"]["device_auth_id"] == "private-device-id"
        return response({"authorization_code": "private-code", "code_verifier": "private-verifier"})


auth_codex._codex_login_post = post
auth_codex._codex_http_client = lambda **kwargs: Client()
auth_codex.time.sleep = lambda _: None
runpy.run_path(sys.argv[2], run_name="__main__")
