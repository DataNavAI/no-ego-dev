"""Credential-free target/archive and real-journal transaction regression cases."""
import argparse
import importlib.util
import hashlib
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[4]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, REPO / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


local = load('deploy_local', 'scripts/deploy-aws-staging.py')
remote = load('deploy_remote', 'scripts/aws-staging/remote.py')
OLD = {'id': 'a' * 64, 'image': 'sha256:' + 'b' * 64, 'revision': 'c' * 40}
COMMIT = 'd' * 40
ORIGINAL = {'profile': 'synthetic edited config/auth', 'database': 'synthetic task/WAL state',
            'projects': 'synthetic project files'}


class TargetCases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'source'
        self.repo.mkdir()
        def git(*args):
            command = [shutil.which('git'), '-C', str(self.repo), *args]
            return subprocess.check_output(command, stderr=subprocess.DEVNULL, text=True).strip()  # noqa: S603 -- synthetic local Git fixture argv
        self.git = git
        git('init', '-q')
        git('config', 'user.email', 'synthetic@example.invalid')
        git('config', 'user.name', 'Synthetic fixture')
        (self.repo / 'tracked').write_text('committed bytes')
        git('add', 'tracked')
        git('commit', '-qm', 'synthetic')
        self.commit = git('rev-parse', 'HEAD')
        for name in ('key', 'hosts'):
            (self.root / name).write_text('synthetic fixture')
            (self.root / name).chmod(0o600)

    def args(self):
        return argparse.Namespace(account='123456789012', region='us-west-2', instance='staging',
                                  ssh_key=str(self.root / 'key'), known_hosts=str(self.root / 'hosts'),
                                  commit=self.commit, apply=False, recover=False, force=False,
                                  health_timeout=180, profile=None)

    def test_validation_and_archive_exclude_dirty_and_untracked_bytes(self):
        args = self.args()
        local.validate(args, self.repo)
        (self.repo / 'tracked').write_text('dirty bytes')
        (self.repo / 'runtime.env').write_text('SYNTHETIC_ONLY')
        destination = self.root / 'source.tar'
        local.archive_commit(self.repo, self.commit, destination)
        with tarfile.open(destination) as archive:
            self.assertEqual(archive.getnames(), ['tracked'])
            self.assertEqual(archive.extractfile('tracked').read(), b'committed bytes')

    def test_invalid_arguments_fail_before_external_mutation(self):
        variants = [('account', '123'), ('region', 'us-west-2;unsafe'), ('instance', 'stage/other'),
                    ('commit', 'main'), ('commit', '0' * 40), ('health_timeout', 0),
                    ('force', True), ('ssh_key', str(self.repo / 'tracked'))]
        for name, value in variants:
            with self.subTest(name=name, value=value):
                args = self.args()
                setattr(args, name, value)
                with self.assertRaises(local.DeploymentError):
                    local.validate(args, self.repo)
        (self.root / 'key').chmod(0o644)
        with self.assertRaises(local.DeploymentError):
            local.validate(self.args(), self.repo)
        (self.root / 'key').unlink()
        (self.root / 'key').symlink_to(self.root / 'hosts')
        with self.assertRaises(local.DeploymentError):
            local.validate(self.args(), self.repo)

    def test_account_and_staging_identity_checked_with_read_calls_only(self):
        instance = {'name': 'staging', 'state': {'name': 'running'}, 'username': 'ubuntu',
                    'publicIpAddress': '192.0.2.10', 'tags': [{'key': 'environment', 'value': 'staging'}]}
        for mutation in (None, 'account', 'tag', 'state', 'address', 'user'):
            with self.subTest(mutation=mutation):
                calls = []
                item = json.loads(json.dumps(instance))
                if mutation == 'tag':
                    item['tags'] = []
                if mutation == 'state':
                    item['state']['name'] = 'stopped'
                if mutation == 'address':
                    item['publicIpAddress'] = 'bad;host'
                if mutation == 'user':
                    item['username'] = 'root'
                def aws(args, **_):
                    calls.append(args)
                    if 'get-caller-identity' in args:
                        return json.dumps({'Account': '000000000000' if mutation == 'account' else '123456789012'})
                    self.assertIn('get-instance', args)
                    return json.dumps({'instance': item})
                if mutation:
                    with self.assertRaises(local.DeploymentError):
                        local.target(self.args(), aws)
                else:
                    self.assertEqual(local.target(self.args(), aws), 'ubuntu@192.0.2.10')
                self.assertEqual(len(calls), 1 if mutation == 'account' else 2)

    def test_command_failure_does_not_echo_external_output(self):
        with self.assertRaises(local.DeploymentError) as raised:
            local.run([sys.executable, '-c', 'import sys; print("SYNTHETIC_SECRET"); sys.exit(1)'])
        self.assertNotIn('SYNTHETIC_SECRET', str(raised.exception))


class FakeDriver:
    """Docker boundary fixture; durable state enables actual process-loss recovery."""
    def __init__(self, root, fail=None):
        self.root, self.fail, self.calls = root, fail, []
        self.file = root / 'fixture-state.json'
        self.state = json.loads(self.file.read_text()) if self.file.exists() else {
            'data': dict(ORIGINAL), 'revision': OLD['revision'], 'running': True,
            'old_retained': False, 'foreign': False}
        self.save()

    def save(self):
        self.file.write_text(json.dumps(self.state))

    def preflight(self):
        self.calls.append('preflight')
        return {**OLD, 'revision': self.state['revision']}

    def build(self, commit):
        self.calls.append('build')
        if self.fail == 'build':
            raise RuntimeError('fixture build failure')
        return 'sha256:' + '9' * 64

    def stop(self, _):
        self.calls.append('stop')
        self.state['running'] = False
        self.save()

    def backup(self, _, snapshot):
        self.calls.append('backup')
        if self.fail == 'backup':
            raise RuntimeError('fixture incomplete backup')
        (snapshot / 'fixture.json').write_text(json.dumps(self.state['data']))
        return {volume: '1' * 64 for volume in remote.VOLUMES}

    def replace(self, journal, commit, image):
        self.calls.append('replace')
        self.state.update(revision=commit, running=True, old_retained=True)
        self.state['data'] = {name: 'candidate changed ' + name for name in ORIGINAL}
        self.save()
        if self.fail == 'crash':
            os._exit(99)
        # Successful fixture preserves data; failed/crashed candidate models a migration.
        if self.fail is None:
            self.state['data'] = dict(ORIGINAL)
            self.save()

    def ready(self, _):
        self.calls.append('ready')
        if self.fail in ('readiness', 'restore') and self.state['revision'] == COMMIT:
            raise RuntimeError('fixture readiness failure')
        if self.fail == 'signal' and self.state['revision'] == COMMIT:
            raise InterruptedError('fixture remote signal')
        if not self.state['running']:
            raise RuntimeError('fixture service stopped')

    def rollback(self, journal, snapshot):
        self.calls.append('rollback')
        if self.fail == 'restore' or self.state['foreign']:
            raise RuntimeError('fixture recovery unsafe')
        if journal['phase'] != 'prepared':
            self.state['data'] = json.loads((snapshot / 'fixture.json').read_text())
        self.state.update(revision=OLD['revision'], running=True, old_retained=False)
        self.save()

    def discard_old(self, _):
        self.calls.append('discard_old')
        if self.fail == 'cleanup':
            raise InterruptedError('fixture interrupted after commit')
        self.state['old_retained'] = False
        self.save()


class TransactionCases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_success_and_same_revision_noop(self):
        driver = FakeDriver(self.root)
        self.assertEqual(remote.deploy(driver, self.root, COMMIT)['status'], 'deployed')
        self.assertLess(driver.calls.index('build'), driver.calls.index('stop'))
        self.assertEqual(json.loads((self.root / 'deployment.json').read_text())['snapshot_image'], 'sha256:' + '9' * 64)
        self.assertEqual(driver.state['data'], ORIGINAL)
        self.assertFalse(driver.state['old_retained'])
        driver.calls.clear()
        self.assertEqual(remote.deploy(driver, self.root, COMMIT)['status'], 'unchanged')
        self.assertEqual(driver.calls, ['discard_old', 'preflight', 'ready'])

    def test_build_and_incomplete_backup_do_not_restore_partial_data(self):
        for fail in ('build', 'backup'):
            with self.subTest(fail=fail), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                driver = FakeDriver(root, fail)
                with self.assertRaises(RuntimeError):
                    remote.deploy(driver, root, COMMIT)
                self.assertEqual(driver.state['data'], ORIGINAL)
                self.assertTrue(driver.state['running'])
                self.assertNotIn('replace', driver.calls)
                if fail == 'build':
                    self.assertNotIn('stop', driver.calls)
                else:
                    self.assertEqual(remote.recover(FakeDriver(root), root)['status'], 'rolled_back')

    def test_readiness_failure_and_signal_restore_all_data(self):
        for fail in ('readiness', 'signal'):
            with self.subTest(fail=fail), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                driver = FakeDriver(root, fail)
                with self.assertRaisesRegex(RuntimeError, 'previous container and data restored'):
                    remote.deploy(driver, root, COMMIT)
                self.assertEqual(driver.state['data'], ORIGINAL)
                self.assertEqual(driver.state['revision'], OLD['revision'])
                self.assertEqual(json.loads((root / 'deployment.json').read_text())['phase'], 'rolled_back')

    def test_failed_recovery_retains_journal_and_blocks_next_deploy(self):
        driver = FakeDriver(self.root, 'restore')
        with self.assertRaisesRegex(RuntimeError, 'recovery required'):
            remote.deploy(driver, self.root, COMMIT)
        self.assertEqual(json.loads((self.root / 'deployment.json').read_text())['phase'], 'replacing')
        self.assertTrue(list((self.root / 'snapshots').glob('*/fixture.json')))
        with self.assertRaisesRegex(RuntimeError, '--recover'):
            remote.deploy(driver, self.root, COMMIT)

    def test_real_process_loss_is_recovered_by_new_controller(self):
        result = subprocess.run([sys.executable, __file__, 'crash', str(self.root)], capture_output=True)  # noqa: S603 -- owned fixture subprocess, intentional hard exit
        self.assertEqual(result.returncode, 99)
        driver = FakeDriver(self.root)
        self.assertNotEqual(driver.state['data'], ORIGINAL)
        self.assertEqual(remote.recover(driver, self.root)['status'], 'rolled_back')
        self.assertEqual(driver.state['data'], ORIGINAL)
        self.assertTrue(driver.state['running'])

    def test_lock_and_journal_identity_fail_closed(self):
        with remote.locked(self.root):
            with self.assertRaisesRegex(RuntimeError, 'lock'):
                with remote.locked(self.root):
                    self.fail('second lock must not enter')
        with self.assertRaises((RuntimeError, KeyError)):
            remote.validate_journal(self.root, {'version': 1, 'transaction': '../outside'})

    def test_interruption_after_durable_commit_can_finish_cleanup(self):
        driver = FakeDriver(self.root, 'cleanup')
        with self.assertRaises(InterruptedError):
            remote.deploy(driver, self.root, COMMIT)
        self.assertEqual(json.loads((self.root / 'deployment.json').read_text())['phase'], 'committed')
        driver = FakeDriver(self.root)
        remote.recover(driver, self.root)
        self.assertFalse(driver.state['old_retained'])
        self.assertEqual(driver.state['revision'], COMMIT)


class BoundaryDriver(remote.Driver):
    def __init__(self, root):
        super().__init__(root)
        self.calls = []
        self.old = {'Id': OLD['id'], 'Image': OLD['image'], 'Name': '/ned-staging-rollback-' + 'e' * 32,
                    'State': {'Running': False}}
        self.current = {'Id': 'f' * 64, 'Config': {'Labels': {'com.ned.deployment': 'e' * 32}}}
        self.users = [self.old['Id'], self.current['Id']]

    def inspect(self, name):
        return self.current if name == remote.NAME else self.old

    def docker(self, *args, **_):
        self.calls.append(args)
        if args[0] == 'ps':
            return '\n'.join(self.users)
        return ''

    def stop(self, identity):
        self.calls.append(('stop', identity))


class RemoteBoundaryCases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.driver = BoundaryDriver(self.root)
        self.journal = {'version': 1, 'transaction': 'e' * 32, 'old': OLD,
                        'rollback_name': remote.NAME + '-rollback-' + 'e' * 32,
                        'phase': 'replacing'}
        self.journal['snapshot_hashes'] = {}
        for volume in remote.VOLUMES:
            path = self.root / (volume + '.tar')
            with tarfile.open(path, 'w'):
                pass
            self.journal['snapshot_hashes'][volume] = hashlib.sha256(path.read_bytes()).hexdigest()

    def test_build_uses_unique_tags_and_snapshot_helper_is_journal_pinned(self):
        source = self.root / 'source.tar'
        with tarfile.open(source, 'w'):
            pass
        driver = remote.Driver(self.root, COMMIT, source)
        calls = []
        image = 'sha256:' + '9' * 64
        def docker(*args, **_):
            calls.append(args)
            if args[:2] == ('image', 'inspect'):
                return json.dumps([{'Id': image, 'Config': {'Labels': {'org.opencontainers.image.revision': COMMIT}}}])
            return ''
        with patch.object(driver, 'docker', side_effect=docker):
            self.assertEqual(driver.build(COMMIT), image)
            self.assertEqual(driver.build(COMMIT), image)
        tags = [call[call.index('-t') + 1] for call in calls if call[0] == 'buildx']
        self.assertEqual(len(set(tags)), 2)
        self.journal['snapshot_image'] = image
        self.driver.rollback(self.journal, self.root)
        restores = [call for call in self.driver.calls if call[0] == 'run']
        self.assertTrue(all(image in call and OLD['image'] not in call for call in restores))

    def test_inspect_missing_container_case_variants_and_daemon_failure(self):
        driver = remote.Driver(self.root)
        for message in ('Error: No such object: synthetic', 'error: no such object: synthetic',
                        'Error response from daemon: No such container: synthetic'):
            result = subprocess.CompletedProcess([], 1, '[]', message)
            with self.subTest(message=message), patch.object(remote.subprocess, 'run', return_value=result):
                self.assertIsNone(driver.inspect('ned-staging'))
        result = subprocess.CompletedProcess([], 1, '', 'Cannot connect to the Docker daemon')
        with patch.object(remote.subprocess, 'run', return_value=result), self.assertRaises(RuntimeError):
            driver.inspect('ned-staging')

    def test_unknown_candidate_and_unrelated_volume_owner_block_recovery(self):
        for variant in ('candidate', 'volume'):
            with self.subTest(variant=variant):
                driver = BoundaryDriver(self.root)
                if variant == 'candidate':
                    driver.current['Config']['Labels'] = {}
                else:
                    driver.users.append('0' * 64)
                with self.assertRaises(RuntimeError):
                    driver.rollback(self.journal, self.root)
                self.assertFalse(any(call[0] in ('stop', 'rm', 'run') for call in driver.calls))

    def test_missing_snapshot_rejects_before_any_destructive_call(self):
        (self.root / (remote.VOLUMES[-1] + '.tar')).unlink()
        with self.assertRaises(RuntimeError):
            self.driver.rollback(self.journal, self.root)
        self.assertFalse(any(call[0] in ('stop', 'rm', 'run') for call in self.driver.calls))

    def test_corrupt_snapshot_rejects_before_any_destructive_call(self):
        (self.root / (remote.VOLUMES[0] + '.tar')).write_bytes(b'corrupt')
        with self.assertRaises(RuntimeError):
            self.driver.rollback(self.journal, self.root)
        self.assertFalse(any(call[0] in ('stop', 'rm', 'run') for call in self.driver.calls))

    def test_real_driver_restores_exact_three_owned_volumes_then_original_container(self):
        self.driver.rollback(self.journal, self.root)
        calls = self.driver.calls
        restore = [call for call in calls if call[0] == 'run']
        self.assertEqual(len(restore), 3)
        for volume, call in zip(remote.VOLUMES, restore):
            self.assertIn(volume + ':/data', call)
            self.assertIn(OLD['image'], call)
            self.assertIn('/backup/' + volume + '.tar', call)
        self.assertLess(next(i for i, c in enumerate(calls) if c[0] == 'stop'),
                        next(i for i, c in enumerate(calls) if c[0] == 'run'))
        self.assertEqual(calls[-1], ('start', OLD['id']))

    def test_secret_headers_cannot_be_sent_to_other_hosts_or_schemes(self):
        for url in ('file:///tmp/private', 'https://evil.example/api/health',
                    'http://staging.ned.datanav.app/api/health',
                    'https://staging.ned.datanav.app.evil.example/api/health'):
            with self.subTest(url=url), self.assertRaises(RuntimeError):
                remote.Driver.http(url, {'Authorization': 'synthetic-only'})


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'crash':
        root = Path(sys.argv[2])
        remote.deploy(FakeDriver(root, 'crash'), root, COMMIT)
    else:
        unittest.main()
