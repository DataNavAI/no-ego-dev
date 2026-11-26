"""Offline actual-image tool integration suite. Run as hermes; no runtime credentials."""
from contextlib import contextmanager
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading


@contextmanager
def fixture_server():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 -- stdlib HTTP handler interface
            body = b'<html><body><output id="result">pending</output><script>document.querySelector("output").textContent="NED_BROWSER_"+(6*7)</script></body></html>'
            self.send_response(200)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}/'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def main():
    results = []
    with tempfile.TemporaryDirectory(prefix='ned-tools-') as temporary:
        root = Path(temporary)
        env = {**os.environ, 'HOME': str(root), 'HERMES_HOME': str(root / 'hermes'),
               'AWS_EC2_METADATA_DISABLED': 'true', 'AWS_CONFIG_FILE': str(root / 'aws-config'),
               'AWS_SHARED_CREDENTIALS_FILE': str(root / 'aws-credentials'),
               'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
               'npm_config_cache': str(root / 'npm-cache')}
        for key in list(env):
            if key.startswith(('AWS_ACCESS_', 'AWS_SECRET_', 'AWS_SESSION_', 'NPM_TOKEN', 'NODE_AUTH_TOKEN')):
                del env[key]

        def run(argv, *, cwd=root, expected=0, timeout=30):
            executable = shutil.which(argv[0], path=env.get('PATH'))
            if not executable:
                raise RuntimeError(f'Missing required tool: {argv[0]}')
            result = subprocess.run([executable, *argv[1:]], cwd=cwd, env=env,  # noqa: S603 -- synthetic fixed commands and test-owned paths, no shell interpolation
                                    capture_output=True, text=True, timeout=timeout, check=False)
            if result.returncode != expected:
                raise RuntimeError(f'{argv[0]} failed (expected {expected}, got {result.returncode})')
            return result.stdout.strip()

        def require(condition, name):
            if not condition:
                raise RuntimeError(name)

        def case(name, action):
            try:
                action()
            except Exception as error:
                print(json.dumps({'case': name, 'result': 'fail', 'error': str(error)}), flush=True)
                raise SystemExit(1) from None
            results.append(name)
            print(json.dumps({'case': name, 'result': 'pass'}), flush=True)

        case('shell/coreutils', lambda: require(run(['bash', '-c',
             'printf "alpha\\nbeta\\n" > lines; test "$(sed -n 2p lines | awk \'{print toupper($0)}\')" = BETA; '
             'test "$(find . -name lines | wc -l)" -eq 1; test "$(printf abc | base64 -w0)" = YWJj; timeout 2 true']) == '', 'shell pipeline'))

        def git():
            run(['git', 'init', '-q', 'repo'])
            repo = root / 'repo'
            (repo / 'sample').write_text('NED_SEARCH_42\n')
            run(['git', 'add', 'sample'], cwd=repo)
            run(['git', '-c', 'user.name=NED Fixture', '-c', 'user.email=fixture@example.invalid',
                 'commit', '-qm', 'synthetic'], cwd=repo)
            require(run(['git', 'show', 'HEAD:sample'], cwd=repo) == 'NED_SEARCH_42', 'Git roundtrip')
            require(run(['rg', '--no-heading', 'NED_SEARCH_42', 'sample'], cwd=repo) == 'NED_SEARCH_42', 'ripgrep match')
            run(['rg', 'absent-pattern', 'sample'], cwd=repo, expected=1)
        case('git/ripgrep', git)

        def archive():
            (root / 'payload').write_bytes(b'NED_ARCHIVE\x00\xff')
            run(['tar', '-czf', 'payload.tar.gz', 'payload'])
            (root / 'unpacked').mkdir()
            run(['tar', '-xzf', 'payload.tar.gz', '-C', 'unpacked'])
            require((root / 'unpacked/payload').read_bytes() == (root / 'payload').read_bytes(), 'tar/gzip roundtrip')
            digest = run(['openssl', 'dgst', '-sha256', 'payload']).split()[-1]
            require(digest == hashlib.sha256((root / 'payload').read_bytes()).hexdigest(), 'OpenSSL digest')
            run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(root / 'key')])
            require(run(['ssh-keygen', '-y', '-f', str(root / 'key')]).split()[:2] == (root / 'key.pub').read_text().split()[:2], 'OpenSSH key roundtrip')
        case('archive/crypto/ssh', archive)

        def compiler():
            (root / 'main.c').write_text('#include <stdio.h>\nint main(void){puts("NED_C_42");}\n')
            (root / 'main.cpp').write_text('#include <iostream>\nint main(){std::cout<<"NED_CPP_42";}\n')
            (root / 'Makefile').write_text('all:\n\tgcc main.c -o c-app\n\tg++ main.cpp -o cpp-app\n')
            run(['make'])
            require(run([str(root / 'c-app')]) == 'NED_C_42', 'C execution')
            require(run([str(root / 'cpp-app')]) == 'NED_CPP_42', 'C++ execution')
        case('gcc/g++/make', compiler)

        def python():
            require(run(['python', '-c', 'import sqlite3; c=sqlite3.connect(":memory:"); c.execute("create table t(n)"); c.execute("insert into t values(42)"); print(c.execute("select n from t").fetchone()[0])']) == '42', 'Hermes Python SQLite')
            require(run(['/opt/ned/python/bin/python', '-c', 'import yaml; print(yaml.safe_load(yaml.safe_dump({"n":42}))["n"])']) == '42', 'NED Python YAML')
            run(['/opt/ned/python/bin/python', '-m', 'pip', 'check'])
        case('python/sqlite/yaml', python)

        def node():
            require(run(['node', '--input-type=commonjs', '-e',
                 'const D=require("/opt/ned/node_modules/better-sqlite3");const d=new D(":memory:");d.exec("create table t(n);insert into t values(42)");console.log(d.prepare("select n from t").get().n);d.close()']) == '42', 'Node native SQLite')
            package = root / 'package'
            package.mkdir()
            (package / 'package.json').write_text(json.dumps({'name': 'ned-tool-fixture', 'version': '1.0.0', 'bin': {'ned-tool-fixture': 'cli.js'}}))
            (package / 'cli.js').write_text('#!/usr/bin/env node\nconsole.log("NED_NPM_42")\n')
            (package / 'cli.js').chmod(0o755)
            run(['npm', 'pack', '--ignore-scripts', '--offline'], cwd=package)
            consumer = root / 'consumer'
            consumer.mkdir()
            run(['npm', 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund',
                 str(package / 'ned-tool-fixture-1.0.0.tgz')], cwd=consumer)
            require(run(['npx', '--offline', '--no', 'ned-tool-fixture'], cwd=consumer) == 'NED_NPM_42', 'npm/npx local package execution')
        case('node/npm/npx/native-sqlite', node)

        def media():
            run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.1', str(root / 'tone.wav')])
            info = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(root / 'tone.wav')]))
            require(info['streams'][0]['codec_name'] == 'pcm_s16le' and info['streams'][0]['channels'] == 1, 'FFmpeg encode/probe')
        case('ffmpeg/ffprobe', media)

        def cli():
            base = json.loads(Path('/opt/ned/package.json').read_text())['version']
            revision = json.loads(Path('/opt/ned/build-info.json').read_text())['revision']
            require(run(['ned', '--version']) == base + '+' + (revision[:7] if revision else 'unknown'), 'NED CLI version')
            require('usage' in run(['hermes', '--help']).lower(), 'Hermes CLI help')
            run(['browser-harness', '--help'])
            skeleton = json.loads(run(['aws', 'ec2', 'describe-regions', '--generate-cli-skeleton', 'input']))
            require('RegionNames' in skeleton, 'AWS CLI offline model')
        case('ned/hermes/browser-harness/aws', cli)

        def browser():
            require(run(['google-chrome', '--version']).startswith('Google Chrome for Testing '), 'Chrome identity')
            with fixture_server() as url:
                require('pending' in run(['curl', '--fail', '--silent', '--max-time', '5', '--noproxy', '*', url]), 'curl local HTTP')
                # Test-owned offline container only: Chrome sandbox is unavailable under
                # ordinary Docker seccomp. This flag is not a production browser policy.
                dom = run(['google-chrome', '--headless', '--no-sandbox', '--disable-dev-shm-usage',
                           '--disable-background-networking', '--no-first-run', '--no-proxy-server',
                           '--user-data-dir=' + str(root / 'chrome'), '--dump-dom', url], timeout=45)
                require('<output id="result">NED_BROWSER_42</output>' in dom, 'Chrome JavaScript DOM rendering')
                shot = root / 'page.png'
                run(['google-chrome', '--headless', '--no-sandbox', '--disable-dev-shm-usage',
                     '--disable-background-networking', '--no-first-run', '--no-proxy-server',
                     '--user-data-dir=' + str(root / 'chrome-shot'), '--screenshot=' + str(shot), url], timeout=45)
                require(shot.read_bytes().startswith(b'\x89PNG\r\n\x1a\n') and shot.stat().st_size > 100, 'Chrome screenshot')
        case('curl/chrome-javascript/screenshot', browser)
    print(json.dumps({'result': 'pass', 'cases': results, 'cleanup': 'temporary fixtures removed'}))


if __name__ == '__main__':
    main()
