"""On-demand real Docker acceptance for TC-003/004; no host profiles or keys."""
import argparse
import datetime
import http.cookiejar
import json
from pathlib import Path
import platform
import secrets
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[4]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--context", help="Docker context (default: current Docker context)")
    parser.add_argument("--image", help="Reuse an existing image; otherwise build a test image")
    parser.add_argument("--expected-architecture", choices=("amd64", "arm64"), help="Require native host/daemon/image/binary execution for this architecture")
    args = parser.parse_args()
    executable = shutil.which("docker")
    if not executable:
        raise RuntimeError("Docker is required; no acceptance cases were run")
    cli = [executable] + (["--context", args.context] if args.context else [])
    identity = "ned-image-test-" + secrets.token_hex(8)
    name = identity
    image = args.image or identity + ":test"
    volumes = [identity + "-" + part for part in ("profile", "db", "projects", "unrelated")]
    containers = [name, name + "-noauth", name + "-unrelated", name + "-seed"]
    stage = "Docker prerequisite"
    clean = []
    built = False
    resource_names = {"containers": containers, "volumes": volumes}
    print(json.dumps({"test_resources": resource_names}), flush=True)

    def command(*arguments, timeout=180, check=True):
        result = subprocess.run(  # noqa: S603 - fixed Docker executable, argv, no shell
            cli + list(arguments), capture_output=True, text=True,
            timeout=timeout, check=False, cwd=ROOT,
        )
        if check and result.returncode != 0:
            # Docker stderr can contain operator config. Never print arbitrary output.
            raise RuntimeError(f"{stage}: Docker command failed (exit {result.returncode})")
        return result

    def docker(*arguments, **kwargs):
        return command(*arguments, **kwargs).stdout.strip()

    def interrupted(signum, _frame):
        raise InterruptedError(f"Acceptance interrupted by signal {signum}")

    original_signals = {signum: signal.getsignal(signum) for signum in (signal.SIGINT, signal.SIGTERM)}
    for signum in original_signals:
        signal.signal(signum, interrupted)

    try:
        aliases = {"x86_64": "amd64", "amd64": "amd64", "AMD64": "amd64", "aarch64": "arm64", "arm64": "arm64"}
        host_architecture = aliases.get(platform.machine(), platform.machine())
        daemon_raw = docker("info", "--format", "{{.Architecture}}")
        daemon_architecture = aliases.get(daemon_raw, daemon_raw)
        if args.expected_architecture and (host_architecture != args.expected_architecture or daemon_architecture != args.expected_architecture):
            raise RuntimeError("Host and Docker daemon must match the requested native architecture")
        assert docker("info", "--format", "{{.OSType}}") == "linux"  # noqa: S101
        if not args.image:
            stage = "Image build"
            # No auth input exists during build; context uses the committed allowlist.
            docker("build", "-t", image, ".", timeout=1800)
            built = True
        image_id = docker("image", "inspect", image, "--format", "{{.Id}}")
        image_architecture = docker("image", "inspect", image, "--format", "{{.Architecture}}")
        if args.expected_architecture:
            assert image_architecture == args.expected_architecture  # noqa: S101
        with tempfile.TemporaryDirectory(prefix=identity + "-") as temp:
            envfile = Path(temp) / "runtime.env"
            password = secrets.token_urlsafe(32)
            envfile.touch(mode=0o600)
            envfile.write_text("HERMES_DASHBOARD_BASIC_AUTH_USERNAME=acceptance\n"
                               "HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=" + password + "\n")
            com_origin = "http://127.0.0.1:8787"

            def launch():
                docker("run", "-d", "--name", name, "--env-file", str(envfile),
                       "-e", "NED_COM_ORIGIN=" + com_origin,
                       "-p", "127.0.0.1::9119", "-p", "127.0.0.1::8787",
                       "-v", volumes[0] + ":/opt/data", "-v", volumes[1] + ":/var/lib/ned",
                       "-v", volumes[2] + ":/projects", image)

            def healthy():
                deadline = time.monotonic() + 180
                while time.monotonic() < deadline:
                    # Docker's cached health status may precede the current restart.
                    current = command("exec", name, "node", "/opt/ned/scripts/container/health.mjs", check=False)
                    state = json.loads(docker("inspect", name))[0]["State"]
                    if not state["Running"]:
                        raise RuntimeError("Container exited before readiness")
                    if current.returncode == 0 and state["Health"]["Status"] == "healthy":
                        return
                    time.sleep(0.25)
                raise RuntimeError("Live service readiness exceeded 180 seconds")

            def http_checks():
                dashboard = "http://" + docker("port", name, "9119/tcp")
                com = "http://" + docker("port", name, "8787/tcp")
                client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

                def get(url, headers=None):
                    try:
                        with client.open(urllib.request.Request(url, headers=headers or {}), timeout=5) as response:  # noqa: S310 - URLs originate from loopback-only Docker port mappings
                            return response.status, response.read()
                    except urllib.error.HTTPError as error:
                        return error.code, error.read()

                def com_get(path, headers=None):
                    # Random Docker host ports avoid collisions; requests must use
                    # the configured external authority, including on recreation.
                    return get(com + path, {"Host": urllib.parse.urlsplit(com_origin).netloc, **(headers or {})})

                assert get(dashboard + "/")[0] == 200  # noqa: S101 - executable test assertions
                health = json.loads(get(dashboard + "/api/health")[1])
                assert health["ok"] is True and health["auth_required"] is True  # noqa: S101
                assert get(dashboard + "/api/config")[0] == 401  # noqa: S101
                payload = json.dumps({"provider": "basic", "username": "acceptance", "password": password}).encode()
                request = urllib.request.Request(dashboard + "/auth/password-login", data=payload,  # noqa: S310 - loopback-only Docker dashboard URL
                                                 headers={"Content-Type": "application/json", "Origin": dashboard})  # noqa: S310 - loopback-only Docker dashboard URL
                with client.open(request, timeout=5) as response:
                    assert response.status == 200 and json.load(response)["ok"]  # noqa: S101
                with client.open(dashboard + "/?profile=default&qa=landing", timeout=5) as response:  # noqa: S310 - loopback-only dashboard
                    landing = urllib.parse.urlsplit(response.url)
                    assert response.status == 200 and landing.path == "/sessions"  # noqa: S101
                    assert urllib.parse.parse_qs(landing.query) == {"profile": ["default"], "qa": ["landing"]}  # noqa: S101
                assert get(dashboard + "/sessions?profile=default")[0] == 200  # noqa: S101
                assert get(dashboard + "/api/config")[0] == 200  # noqa: S101
                assert com_get("/")[0] == 200  # noqa: S101
                status, body = com_get("/api/health")
                assert status == 200 and json.loads(body) == {"status": "ok", "service": "nedcom"}  # noqa: S101
                for headers in ({"Host": "evil.example"}, {"Origin": "https://evil.example"}):
                    assert com_get("/api/health", headers)[0] == 403  # noqa: S101
                status, body = com_get("/api/projects")
                assert status == 200  # noqa: S101
                return json.loads(body)

            stage = "TC-003 fresh startup and authenticated HTTP"
            launch()
            healthy()
            node_architecture = docker("exec", name, "node", "-p", "process.arch")
            node_architecture = {"x64": "amd64", "arm64": "arm64"}.get(node_architecture, node_architecture)
            if args.expected_architecture:
                assert node_architecture == args.expected_architecture  # noqa: S101
            assert http_checks() == {"projects": []}  # noqa: S101
            assert docker("exec", "--user", "hermes", name, "ned", "--version") == json.loads((ROOT / "package.json").read_text())["version"]  # noqa: S101
            docker("exec", "--user", "hermes", name, "/opt/ned/python/bin/python", "-c",
                   'import yaml,pathlib;h=pathlib.Path("/opt/data");m=yaml.safe_load((h/"distribution.yaml").read_text());'
                   'assert all((h/p).exists() for p in m["distribution_owned"]);'
                   'assert yaml.safe_load((h/"config.yaml").read_text())["terminal"]["cwd"]=="/projects"')
            docker("exec", "--user", "hermes", name, "sh", "-c",
                   'mkdir -p /projects/acceptance; printf synthetic > /projects/acceptance/sentinel;'
                   'printf synthetic > /opt/data/operator-sentinel; printf "\\n# retained\\n" >> /opt/data/config.yaml;'
                   'ned task init --project /projects/acceptance --json')
            task = json.loads(docker("exec", "--user", "hermes", name, "ned", "task", "create",
                                    "Container image acceptance", "--project", "/projects/acceptance", "--json"))
            stage = "TC-004 supervised recovery"
            for service in ("dashboard", "ned-com"):
                service_path = "/run/service/" + service
                before = docker("exec", name, "/command/s6-svstat", "-o", "pid", service_path)
                docker("exec", name, "/opt/ned/python/bin/python", "-c",
                       'import pathlib,pwd,sys;rows=pathlib.Path("/proc/"+sys.argv[1]+"/status").read_text().splitlines();'
                       'uids=next(row.split()[1:] for row in rows if row.startswith("Uid:"));'
                       'assert all(int(uid)==pwd.getpwnam("hermes").pw_uid for uid in uids)', before)
                docker("exec", name, "/command/s6-svc", "-k", service_path)
                deadline = time.monotonic() + 60
                while time.monotonic() < deadline:
                    after = docker("exec", name, "/command/s6-svstat", "-o", "pid", service_path)
                    if after.isdigit() and after != "0" and after != before:
                        break
                    time.sleep(0.25)
                else:
                    raise RuntimeError(f"{service}: no replacement process within 60 seconds")
                healthy()
                http_checks()
            stage = "TC-004 graceful shutdown and retained volumes"
            started = time.monotonic()
            docker("stop", "--timeout", "30", name)
            stop_seconds = time.monotonic() - started
            assert stop_seconds < 30 and docker("inspect", name, "--format", "{{.State.ExitCode}}") == "0"  # noqa: S101
            docker("rm", name)
            com_origin = "http://127.0.0.1:8790"
            launch()
            healthy()
            assert http_checks()["projects"][0]["displayPath"] == "/projects/acceptance"  # noqa: S101
            retained = json.loads(docker("exec", "--user", "hermes", name, "ned", "task", "list", "--project", "/projects/acceptance", "--json"))
            assert retained[0]["id"] == task["id"]  # noqa: S101
            for location in ("/projects/acceptance/sentinel", "/opt/data/operator-sentinel"):
                assert docker("exec", "--user", "hermes", name, "cat", location) == "synthetic"  # noqa: S101
            assert "# retained" in docker("exec", "--user", "hermes", name, "tail", "-2", "/opt/data/config.yaml")  # noqa: S101
            stage = "TC-003 missing authentication"
            noauth = command("run", "--name", containers[1], image, check=False, timeout=60)
            assert noauth.returncode != 0 and docker("inspect", containers[1], "--format", "{{.State.ExitCode}}") != "0"  # noqa: S101
            stage = "TC-004 unrelated profile refusal"
            docker("run", "--name", containers[3], "--entrypoint", "sh", "-v", volumes[3] + ":/check", image,
                   "-c", "printf unchanged > /check/sentinel")
            unrelated = command("run", "--name", containers[2], "--env-file", str(envfile),
                                "-v", volumes[3] + ":/opt/data", image, check=False, timeout=60)
            assert unrelated.returncode != 0  # noqa: S101
            docker("rm", containers[3])
            content = docker("run", "--name", containers[3], "--entrypoint", "sh", "-v", volumes[3] + ":/check", image,
                             "-c", "test ! -e /check/SOUL.md && cat /check/sentinel")
            assert content == "unchanged"  # noqa: S101
            receipt = {"result": "pass", "cases": ["TC-003", "TC-004"], "image_id": image_id,
                       "tested_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       "stop_seconds": round(stop_seconds, 2), "platform": daemon_raw,
                       "host_architecture": host_architecture, "docker_architecture": daemon_architecture,
                       "image_architecture": image_architecture, "node_architecture": node_architecture,
                       "expected_architecture": args.expected_architecture,
                       "native_execution": host_architecture == daemon_architecture == image_architecture == node_architecture,
                       "com_origins": ["http://127.0.0.1:8787", com_origin],
                       "dashboard_root": "authenticated /sessions redirect with query retained",
                       "observations": "Actual authenticated dashboard and COM HTTP/perimeter, complete profile/CLI, service replacement, clean shutdown, retained state and negative startup passed; no model calls."}
    except Exception as error:
        raise RuntimeError(f"{stage}: acceptance failed ({type(error).__name__}); no pass recorded") from None
    finally:
        # Ignore further signals only while bounded, resource-scoped cleanup executes.
        for signum in original_signals:
            signal.signal(signum, signal.SIG_IGN)
        for container in containers:
            command("rm", "-f", "-v", container, timeout=30, check=False)
        for volume in volumes:
            command("volume", "rm", volume, timeout=30, check=False)
        # Failed inspect is not proof of absence when Docker itself is unavailable.
        # Require a successful inventory before reporting cleanup as complete.
        for arguments, owned in ((["container", "ls", "-a", "--format", "{{.Names}}"], containers),
                                 (["volume", "ls", "--format", "{{.Name}}"], volumes)):
            inventory = command(*arguments, timeout=30, check=False)
            if inventory.returncode != 0:
                clean.append("Docker inventory unavailable")
            else:
                clean.extend(sorted(set(inventory.stdout.splitlines()) & set(owned)))
        if built:
            command("image", "rm", image, timeout=30, check=False)
        for signum, original in original_signals.items():
            signal.signal(signum, original)
        if clean:
            raise RuntimeError("Cleanup incomplete for owned resources: " + ", ".join(clean))
    receipt["cleanup"] = "owned containers, volumes and synthetic runtime credentials removed"
    print(json.dumps(receipt), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, InterruptedError) as failure:
        raise SystemExit(str(failure)) from None
