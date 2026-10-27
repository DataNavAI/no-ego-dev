#!/usr/bin/env python3
"""Deploy a committed NED image to an existing dedicated AWS staging host."""
import argparse
import ipaddress
import json
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import uuid

REPO = Path(__file__).resolve().parent.parent


class DeploymentError(Exception):
    """A safe operator-facing failure, never subprocess/provider output."""


def run(args, **kwargs):
    try:
        command = [shutil.which(args[0]) or args[0], *args[1:]]
        return subprocess.run(command, check=True, capture_output=True, timeout=120,  # noqa: S603 -- validated argv, fixed executables, no shell
                              **kwargs).stdout
    except (subprocess.SubprocessError, OSError):
        raise DeploymentError('External command failed; no output disclosed. Check access or use --recover after interruption.') from None


def validate(args, repo=REPO):
    if not re.fullmatch(r'[0-9]{12}', args.account):
        raise DeploymentError('--account must be a 12-digit AWS account ID')
    if not re.fullmatch(r'[a-z]{2}(?:-[a-z]+)+-[0-9]', args.region):
        raise DeploymentError('Invalid AWS region')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,62}', args.instance):
        raise DeploymentError('Invalid instance name')
    if args.recover:
        if args.commit or args.apply or args.force:
            raise DeploymentError('--recover cannot deploy a revision')
    elif not args.commit or not re.fullmatch(r'[a-f0-9]{40}', args.commit):
        raise DeploymentError('--commit requires an explicit full lowercase commit SHA')
    if args.force and not args.apply:
        raise DeploymentError('--force requires --apply')
    if not 1 <= args.health_timeout <= 600:
        raise DeploymentError('--health-timeout must be between 1 and 600 seconds')
    for name in ('ssh_key', 'known_hosts'):
        path = Path(getattr(args, name)).expanduser().absolute()
        if path.is_symlink() or not path.is_file() or path.is_relative_to(repo):
            raise DeploymentError('SSH files must be regular external files, not symlinks')
        forbidden = 0o077 if name == 'ssh_key' else 0o022
        if path.stat().st_mode & forbidden:
            raise DeploymentError('SSH file permissions are unsafe')
        setattr(args, name, str(path))
    if args.commit:
        actual = run(['git', '-C', str(repo), 'rev-parse', '--verify', args.commit + '^{commit}'], text=True).strip()
        if actual != args.commit:
            raise DeploymentError('Requested commit is unavailable locally')


def target(args, aws=run):
    prefix = ['aws', '--region', args.region]
    if args.profile:
        prefix += ['--profile', args.profile]
    identity = json.loads(aws(prefix + ['sts', 'get-caller-identity', '--output', 'json'], text=True))
    if identity['Account'] != args.account:
        raise DeploymentError('AWS account does not match --account')
    item = json.loads(aws(prefix + ['lightsail', 'get-instance', '--instance-name', args.instance,
                                    '--output', 'json'], text=True))['instance']
    tags = {entry['key']: entry['value'] for entry in item.get('tags', [])}
    if item['name'] != args.instance or tags.get('environment') != 'staging':
        raise DeploymentError('Target is not the explicitly named staging instance')
    if item['state']['name'] != 'running' or item.get('username') != 'ubuntu':
        raise DeploymentError('Target must be a running Ubuntu staging host')
    try:
        address = str(ipaddress.IPv4Address(item['publicIpAddress']))
    except (KeyError, ValueError):
        raise DeploymentError('Target has no valid public IPv4 address') from None
    return 'ubuntu@' + address


def archive_commit(repo, commit, destination):
    with destination.open('wb') as file:
        try:
            command = [shutil.which('git'), '-C', str(repo), 'archive', '--format=tar', commit]
            subprocess.run(command,  # noqa: S603 -- commit validation and dirty-source archive regression cover this boundary
                           stdout=file, stderr=subprocess.PIPE, check=True, timeout=120)
        except (subprocess.SubprocessError, OSError):
            raise DeploymentError('Could not archive the committed source') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--account', required=True)
    parser.add_argument('--region', required=True)
    parser.add_argument('--instance', required=True)
    parser.add_argument('--profile', help='Explicit AWS CLI profile; otherwise current CLI authorization')
    parser.add_argument('--ssh-key', required=True)
    parser.add_argument('--known-hosts', required=True)
    parser.add_argument('--commit')
    parser.add_argument('--apply', action='store_true', help='Apply the otherwise read-only plan')
    parser.add_argument('--recover', action='store_true', help='Recover an interrupted host transaction')
    parser.add_argument('--force', action='store_true', help='Recreate even if the requested revision is healthy')
    parser.add_argument('--health-timeout', type=int, default=180)
    args = parser.parse_args()
    for dependency in ('aws', 'ssh', 'scp', 'git'):
        if not shutil.which(dependency):
            raise DeploymentError('Required command unavailable: ' + dependency)
    validate(args)
    host = target(args)
    options = ['-i', args.ssh_key, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
               '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + args.known_hosts,
               '-o', 'ConnectTimeout=15']
    agent = REPO / 'scripts/aws-staging/remote.py'
    remote_args = ['--health-timeout', str(args.health_timeout)]
    if args.commit:
        remote_args += ['--commit', args.commit]
    if not args.apply and not args.recover:
        command = shlex.join(['sudo', '-n', 'python3', '-', *remote_args])
        result = run(['ssh', *options, host, command], input=agent.read_text(), text=True)
    else:
        upload = '/home/ubuntu/.ned-deploy-' + uuid.uuid4().hex
        with tempfile.TemporaryDirectory(prefix='ned-aws-deploy-') as temporary:
            source = Path(temporary) / 'source.tar'
            if args.commit:
                archive_commit(REPO, args.commit, source)
            run(['ssh', *options, host, 'umask 077; mkdir ' + shlex.quote(upload)], text=True)
            try:
                files = [str(agent)] + ([str(source)] if args.commit else [])
                run(['scp', *options, *files, host + ':' + upload + '/'], text=True)
                remote_args += ['--recover'] if args.recover else ['--apply', '--archive', upload + '/source.tar']
                if args.force:
                    remote_args += ['--force']
                command = shlex.join(['sudo', '-n', 'python3', upload + '/remote.py', *remote_args])
                try:
                    ssh = [shutil.which('ssh'), *options, host, command]
                    result = subprocess.run(ssh, check=True,  # noqa: S603 -- strict pinned SSH, validated target and shlex-quoted remote argv
                                            capture_output=True, text=True, timeout=3600).stdout
                except (subprocess.SubprocessError, OSError):
                    raise DeploymentError('Deployment failed or connection interrupted. Run --recover to verify/restore host state; private snapshots are retained.') from None
            finally:
                # Upload contains only committed public source and this agent, never credentials.
                try:
                    run(['ssh', *options, host, 'rm -rf -- ' + shlex.quote(upload)], text=True)
                except DeploymentError:
                    pass  # A disconnected host may retain this private, non-secret upload.
    receipt = json.loads(result)
    receipt.update(account=args.account, region=args.region, instance=args.instance)
    print(json.dumps(receipt))


if __name__ == '__main__':
    try:
        main()
    except DeploymentError as error:
        print(json.dumps({'status': 'failed', 'error': str(error)}))
        raise SystemExit(1) from None
