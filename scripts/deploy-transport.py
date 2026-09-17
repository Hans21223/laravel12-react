"""Transfer verified build assets and execute deployment over a single SSH session."""
import io
import json
import os
import re
import shlex
import subprocess
import tarfile
import tempfile
from pathlib import Path

host, user = os.environ['SSH_HOST'].strip(), os.environ['SSH_USER'].strip()
sha, stage = os.environ['DEPLOY_SHA'], os.environ['DEPLOY_STAGE']
assert re.fullmatch(r'[a-zA-Z0-9.-]+', host), 'Invalid SSH hostname'
assert re.fullmatch(r'[a-zA-Z0-9_-]+', user), 'Invalid SSH username'
assert re.fullmatch(r'[a-f0-9]{40}', sha), 'Invalid commit'
assert re.fullmatch(r'/tmp/anaheim-[0-9]+-[0-9]+', stage), 'Invalid staging path'

with tempfile.TemporaryDirectory(prefix='anaheim-deploy-') as directory:
    work = Path(directory)
    key = work / 'id_deploy'
    key.write_text(os.environ['SSH_PRIVATE_KEY'].strip() + '\n')
    key.chmod(0o600)
    bundle = work / 'build.tar.gz'
    with tarfile.open(bundle, 'w:gz') as archive:
        for name in ['public/build', 'scripts/deploy-server.sh', 'scripts/deploy-database.php', 'scripts/configure-profile-uploads.py']:
            archive.add(name, arcname=name)
        secret = os.environ.get('INITIAL_MANAGER_HASH', '').encode()
        info = tarfile.TarInfo('initial-manager.hash')
        info.size, info.mode = len(secret), 0o600
        archive.addfile(info, io.BytesIO(secret))
        # Optional SMTP credentials travel inside the SSH stream and are removed right after configuration.
        username, password = os.environ.get('AE_MAIL_USERNAME', ''), os.environ.get('AE_MAIL_PASSWORD', '')
        # A single GMAIL secret may hold "address password" (or "address:password") instead of only the app password.
        combined = re.fullmatch(r'\s*([^\s:,;]+@[^\s:,;]+)[\s:,;]+(.+?)\s*', password, re.S)
        if combined:
            username, password = combined.groups()
        mail = json.dumps({'username': username if password else '', 'password': password}).encode()
        info = tarfile.TarInfo('mail-credentials.json')
        info.size, info.mode = len(mail), 0o600
        archive.addfile(info, io.BytesIO(mail))
    quoted_stage = shlex.quote(stage)
    command = (
        f'set -eu; umask 077; mkdir -p {quoted_stage}; '
        f'tar -xzf - -C {quoted_stage}; '
        f'export DEPLOY_SHA={shlex.quote(sha)} DEPLOY_STAGE={quoted_stage} AE_MAIL_CREDENTIALS={quoted_stage}/mail-credentials.json; '
        f'export INITIAL_MANAGER_HASH="$(cat {quoted_stage}/initial-manager.hash)"; '
        f'rm -- {quoted_stage}/initial-manager.hash; '
        f'status=0; bash {quoted_stage}/scripts/deploy-server.sh || status=$?; '
        f'rm -f -- {quoted_stage}/mail-credentials.json; exit $status'
    )
    with bundle.open('rb') as source:
        subprocess.run([
            'ssh', '-i', str(key), '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
            '-o', 'StrictHostKeyChecking=accept-new', '-o', f'UserKnownHostsFile={work / "known_hosts"}',
            '-o', 'ConnectTimeout=30', '-o', 'ServerAliveInterval=15',
            '-o', 'ServerAliveCountMax=4', f'{user}@{host}', command,
        ], stdin=source, check=True, timeout=720)
