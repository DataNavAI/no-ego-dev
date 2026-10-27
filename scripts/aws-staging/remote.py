"""Dedicated Lightsail staging update transaction. Runtime data stays on the host."""
import argparse
import base64
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import shutil
import subprocess
import tarfile
import time
import urllib.error
import urllib.request
import uuid

VOLUMES = ('ned-staging-profile', 'ned-staging-database', 'ned-staging-projects')
DESTINATIONS = ('/opt/data', '/var/lib/ned', '/projects')
NAME = 'ned-staging'
URL = 'https://staging.ned.datanav.app'
TERMINAL = ('committed', 'rolled_back')


def atomic(path, value):
    temp = path.with_suffix('.tmp')
    with os.fdopen(os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as file:
        json.dump(value, file)
        file.flush()
        os.fsync(file.fileno())
    os.replace(temp, path)
    directory = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


@contextmanager
def locked(root):
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (root / 'deploy.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Another staging deployment owns the lock') from None
        yield


def require(condition):
    if not condition:
        raise RuntimeError('Staging identity or acceptance condition failed')


def validate_journal(root, journal):
    require(journal['version'] == 1)
    require(re.fullmatch(r'[a-f0-9]{32}', journal['transaction']))
    require(re.fullmatch(r'[a-f0-9]{64}', journal['old']['id']))
    require(re.fullmatch(r'sha256:[a-f0-9]{64}', journal['old']['image']))
    require(journal['rollback_name'] == NAME + '-rollback-' + journal['transaction'])
    require(journal['phase'] in ('prepared', 'backed_up', 'replacing', *TERMINAL))
    require(not root.is_symlink())
    if journal['phase'] in ('backed_up', 'replacing', 'committed') or 'snapshot_hashes' in journal:
        require(set(journal['snapshot_hashes']) == set(VOLUMES))
        require(all(re.fullmatch(r'[a-f0-9]{64}', value) for value in journal['snapshot_hashes'].values()))


def recover(driver, root):
    path = root / 'deployment.json'
    journal = json.loads(path.read_text())
    validate_journal(root, journal)
    if journal['phase'] == 'committed':
        driver.ready(180)
        driver.discard_old(journal)
    if journal['phase'] in TERMINAL:
        return {'status': journal['phase'], 'changed': False}
    driver.rollback(journal, root / 'snapshots' / journal['transaction'])
    driver.ready(180)
    journal['phase'] = 'rolled_back'
    atomic(path, journal)
    return {'status': 'rolled_back', 'changed': True}


def deploy(driver, root, commit, force=False, timeout=180):
    path = root / 'deployment.json'
    if path.exists():
        previous = json.loads(path.read_text())
        validate_journal(root, previous)
        if previous['phase'] not in TERMINAL:
            raise RuntimeError('Interrupted deployment: run --recover before deploying')
        if previous['phase'] == 'committed':
            driver.discard_old(previous)
    old = driver.preflight()
    if old['revision'] == commit and not force:
        driver.ready(timeout)
        return {'status': 'unchanged', 'commit': commit}
    # A build failure cannot stop or alter the existing container.
    driver.build(commit)
    transaction = uuid.uuid4().hex
    journal = {'version': 1, 'transaction': transaction, 'old': old,
               'rollback_name': NAME + '-rollback-' + transaction, 'phase': 'prepared'}
    snapshot = root / 'snapshots' / transaction
    snapshot.mkdir(mode=0o700, parents=True)
    atomic(path, journal)
    try:
        driver.stop(old['id'])
        journal['snapshot_hashes'] = driver.backup(old, snapshot)
        directory = os.open(snapshot, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        journal['phase'] = 'backed_up'
        atomic(path, journal)
        journal['phase'] = 'replacing'
        atomic(path, journal)
        driver.replace(journal, commit)
        driver.ready(timeout)
        # Commit durably before deleting the old container. Completed backups remain private.
        journal['phase'] = 'committed'
        atomic(path, journal)
    except BaseException:
        try:
            recover(driver, root)
        except BaseException:
            raise RuntimeError('Deployment failed; recovery required: rerun --recover') from None
        raise RuntimeError('Deployment failed; previous container and data restored') from None
    driver.discard_old(journal)
    return {'status': 'deployed', 'commit': commit, 'snapshot': str(snapshot)}


class Driver:
    def __init__(self, root, commit=None, archive=None):
        self.root, self.commit, self.archive = root, commit, archive

    def run(self, *args, timeout=120):
        # Never propagate subprocess output: Docker inspect/env/build errors can contain secrets.
        command = [shutil.which(args[0]) or args[0], *args[1:]]
        return subprocess.run(command, check=True, capture_output=True, text=True,  # noqa: S603 -- fixed tools and validated argv; no shell
                              timeout=timeout).stdout.strip()

    def docker(self, *args, **kwargs):
        return self.run('docker', *args, **kwargs)

    def inspect(self, name):
        command = [shutil.which('docker'), 'inspect', name]
        result = subprocess.run(command, capture_output=True, text=True,  # noqa: S603 -- inspect only a fixed name or recorded container ID
                                timeout=30)
        if result.returncode:
            if 'no such object' in result.stderr.lower() or 'no such container' in result.stderr.lower():
                return None
            raise RuntimeError('Docker inspection failed')
        return json.loads(result.stdout)[0]

    def exclusive(self, allowed):
        for volume in VOLUMES:
            users = self.docker('ps', '-aq', '--no-trunc', '--filter', 'volume=' + volume).split()
            if any(user not in allowed for user in users):
                raise RuntimeError('An unrelated container owns a staging volume')

    def preflight(self):
        for filename in ('runtime.env', 'com-password.env'):
            path = self.root / filename
            if path.is_symlink() or not path.is_file() or path.stat().st_mode & 0o077:
                raise RuntimeError('Missing or nonprivate runtime secret file')
        item = self.inspect(NAME)
        if not item or not item['State']['Running']:
            raise RuntimeError('Expected running staging container is missing')
        mounts = {(m.get('Name'), m['Destination']) for m in item['Mounts']}
        if mounts != set(zip(VOLUMES, DESTINATIONS)):
            raise RuntimeError('Unsupported staging mounts')
        if item['HostConfig']['Privileged'] or item['HostConfig']['NetworkMode'] == 'host':
            raise RuntimeError('Unsupported privileged staging container')
        ports = item['HostConfig']['PortBindings']
        expected = {str(port) + '/tcp': [{'HostIp': '127.0.0.1', 'HostPort': str(port)}]
                    for port in (8787, 9119)}
        if ports != expected:
            raise RuntimeError('Unsupported staging ports')
        self.exclusive({item['Id']})
        self.run('systemctl', 'is-active', 'caddy')
        self.docker('buildx', 'version')
        self.ready(1)
        return {'id': item['Id'], 'image': item['Image'],
                'revision': item['Config'].get('Labels', {}).get('org.opencontainers.image.revision')}

    def build(self, commit):
        source = self.root / 'sources' / (commit + '-' + uuid.uuid4().hex)
        source.mkdir(mode=0o700, parents=True)
        with tarfile.open(self.archive) as archive:
            archive.extractall(source, filter='data')
        self.docker('buildx', 'build', '--load', '--label',
                    'org.opencontainers.image.revision=' + commit,
                    '-t', 'ned-staging:' + commit, str(source), timeout=1800)
        image = json.loads(self.docker('image', 'inspect', 'ned-staging:' + commit))[0]
        require(image['Config']['Labels']['org.opencontainers.image.revision'] == commit)

    def stop(self, identity):
        self.docker('stop', '--time', '30', identity, timeout=60)
        item = self.inspect(identity)
        if not item or item['State']['Running']:
            raise RuntimeError('Container did not stop')

    def backup(self, old, snapshot):
        hashes = {}
        self.exclusive({old['id']})
        for volume in VOLUMES:
            self.docker('run', '--rm', '--network', 'none', '--user', 'root', '--entrypoint',
                        'tar', '-v', volume + ':/data:ro', '-v', str(snapshot) + ':/backup',
                        old['image'], '--numeric-owner', '--acls', '--xattrs', '-cpf',
                        '/backup/' + volume + '.tar', '-C', '/data', '.', timeout=600)
            archive = snapshot / (volume + '.tar')
            archive.chmod(0o600)
            with archive.open('rb') as file:
                os.fsync(file.fileno())
            with archive.open('rb') as file:
                hashes[volume] = hashlib.file_digest(file, 'sha256').hexdigest()
        return hashes

    def replace(self, journal, commit):
        self.docker('rename', journal['old']['id'], journal['rollback_name'])
        args = ['run', '-d', '--name', NAME, '--restart', 'unless-stopped', '--stop-timeout',
                '30', '--env-file', str(self.root / 'runtime.env'), '--shm-size=256m',
                '--label', 'com.ned.deployment=' + journal['transaction']]
        for port in (8787, 9119):
            args += ['-p', '127.0.0.1:' + str(port) + ':' + str(port)]
        for volume, destination in zip(VOLUMES, DESTINATIONS):
            args += ['-v', volume + ':' + destination]
        self.docker(*args, 'ned-staging:' + commit)

    def rollback(self, journal, snapshot):
        old = self.inspect(journal['old']['id'])
        if not old or old['Image'] != journal['old']['image']:
            raise RuntimeError('Original container identity is unavailable')
        current = self.inspect(NAME)
        allowed = {old['Id']}
        if current and current['Id'] != old['Id']:
            if current['Config'].get('Labels', {}).get('com.ned.deployment') != journal['transaction']:
                raise RuntimeError('Unknown replacement container; manual recovery required')
            allowed.add(current['Id'])
        self.exclusive(allowed)
        if journal['phase'] != 'prepared':
            # Validate every snapshot before deleting any candidate or restoring any volume.
            for volume in VOLUMES:
                archive = snapshot / (volume + '.tar')
                if archive.is_symlink() or not archive.is_file():
                    raise RuntimeError('A required snapshot is unavailable')
                with archive.open('rb') as file:
                    require(hashlib.file_digest(file, 'sha256').hexdigest() == journal['snapshot_hashes'][volume])
                with tarfile.open(archive) as file:
                    file.getmembers()
            if current and current['Id'] != old['Id']:
                self.stop(current['Id'])
                self.docker('rm', current['Id'])
            if old['State']['Running']:
                self.stop(old['Id'])
            for volume in VOLUMES:
                self.docker('run', '--rm', '--network', 'none', '--user', 'root', '--entrypoint',
                            '/bin/sh', '-v', volume + ':/data', '-v', str(snapshot) + ':/backup:ro',
                            old['Image'], '-ec',
                            'find /data -mindepth 1 -delete; tar --numeric-owner --acls --xattrs -xpf "$1" -C /data',
                            'restore', '/backup/' + volume + '.tar', timeout=600)
        if old['Name'] != '/' + NAME:
            self.docker('rename', old['Id'], NAME)
        self.docker('start', old['Id'])

    def ready(self, timeout):
        end = time.monotonic() + timeout
        while True:
            item = self.inspect(NAME)
            if item and item['State']['Running'] and item['State'].get('Health', {}).get('Status') == 'healthy':
                break
            if time.monotonic() >= end:
                raise RuntimeError('Staging readiness deadline expired')
            time.sleep(min(2, max(0, end - time.monotonic())))
        for url, key, value in (('http://127.0.0.1:8787/api/health', 'service', 'nedcom'),
                                ('http://127.0.0.1:9119/api/health', 'auth_required', True)):
            code, body = self.http(url)
            require(code == 200 and json.loads(body)[key] == value)
        require(self.http('http://127.0.0.1:9119/api/config')[0] == 401)
        require(self.http(URL + '/api/health')[0] == 401)
        values = {}
        for line in (self.root / 'com-password.env').read_text().splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                key, value = line.removeprefix('export ').split('=', 1)
                values[key.strip()] = value.strip().strip('\"\'')
        token = base64.b64encode((values['NED_COM_USERNAME'] + ':' + values['NED_COM_PASSWORD']).encode()).decode()
        headers = {'Authorization': 'Basic ' + token}
        code, body = self.http(URL + '/api/health', headers)
        require(code == 200 and json.loads(body)['service'] == 'nedcom')
        require(self.http(URL + '/api/health', {**headers, 'Origin': 'https://invalid.example'})[0] == 403)

    @staticmethod
    def http(url, headers=None):
        require(url.startswith(('http://127.0.0.1:8787/', 'http://127.0.0.1:9119/', URL + '/')))
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *_):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        try:
            response = opener.open(urllib.request.Request(url, headers=headers or {}), timeout=10)  # noqa: S310 -- exact loopback/canonical HTTPS allowlist above; redirects disabled
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, response.read()

    def discard_old(self, journal):
        item = self.inspect(journal['old']['id'])
        if item is None:
            return
        if item['Name'] != '/' + journal['rollback_name'] or item['Image'] != journal['old']['image'] or item['State']['Running']:
            raise RuntimeError('Original container cleanup identity mismatch')
        self.docker('rm', item['Id'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit')
    parser.add_argument('--archive')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--recover', action='store_true')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--health-timeout', type=int, default=180)
    args = parser.parse_args()
    root = Path('/opt/ned-staging')
    if not 1 <= args.health_timeout <= 600:
        raise RuntimeError('Invalid readiness deadline')
    if args.apply and (not re.fullmatch(r'[a-f0-9]{40}', args.commit or '') or not args.archive):
        raise RuntimeError('Explicit immutable source archive is required')
    if root.is_symlink():
        raise RuntimeError('Staging root cannot be a symlink')
    driver = Driver(root, args.commit, args.archive)
    if not args.apply and not args.recover:
        journal = root / 'deployment.json'
        if journal.exists() and json.loads(journal.read_text())['phase'] not in TERMINAL:
            raise RuntimeError('Interrupted deployment: run --recover before deploying')
        old = driver.preflight()
        print(json.dumps({'status': 'planned', 'current_commit': old['revision']}))
        return
    def interrupted(*_):
        raise InterruptedError('Deployment interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGHUP, interrupted)
    with locked(root):
        result = recover(driver, root) if args.recover else deploy(
            driver, root, args.commit, args.force, args.health_timeout)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        message = str(error) if isinstance(error, RuntimeError) else 'Deployment operation failed; inspect private host state'
        print(json.dumps({'status': 'failed', 'error': message}))
        raise SystemExit(1) from None
