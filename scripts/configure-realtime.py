#!/usr/bin/python3
"""Run Laravel Reverb for this app behind the verified Nginx site. Secrets stay in .env and are never printed."""
import grp
import importlib.util
import os
import re
import secrets
import shutil
import subprocess
from pathlib import Path

DOMAIN = 'helldriver.csbootstrap.com'
APP = Path('/var/www/Helldriver.csbootstrap.com/laravel12-react')
PORT = 8391
UNIT = Path('/etc/systemd/system/ae-reverb.service')
MARKER = '# Anaheim Electronics realtime (Reverb)'

if os.geteuid() != 0:
    raise SystemExit('Root required.')
backup = Path(os.environ['AE_BACKUP_DIR'])
spec = importlib.util.spec_from_file_location('uploads', Path(__file__).with_name('configure-profile-uploads.py'))
uploads = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uploads)

# 1. Port must be free or already served by this app's Reverb unit.
listening = subprocess.run(['ss', '-ltnpH', f'sport = :{PORT}'], text=True, capture_output=True, check=True).stdout
active = subprocess.run(['systemctl', 'is-active', '--quiet', UNIT.name]).returncode == 0
if listening.strip() and not active:
    raise SystemExit(f'Port {PORT} is used by another service; refusing to start Reverb.')

# 2. Environment: keep existing credentials, generate them once.
env = APP / '.env'
text = env.read_text()
current = dict(re.findall(r'^(REVERB_APP_(?:ID|KEY|SECRET))=(.*)$', text, re.M))
settings = {
    'BROADCAST_CONNECTION': 'reverb',
    'REVERB_APP_ID': current.get('REVERB_APP_ID') or str(secrets.randbelow(900000) + 100000),
    'REVERB_APP_KEY': current.get('REVERB_APP_KEY') or secrets.token_hex(10),
    'REVERB_APP_SECRET': current.get('REVERB_APP_SECRET') or secrets.token_hex(24),
    'REVERB_HOST': '127.0.0.1',
    'REVERB_PORT': str(PORT),
    'REVERB_SCHEME': 'http',
    'REVERB_SERVER_HOST': '127.0.0.1',
    'REVERB_SERVER_PORT': str(PORT),
    'REVERB_PUBLIC_HOST': DOMAIN,
    'REVERB_PUBLIC_PORT': '443',
    'REVERB_PUBLIC_SCHEME': 'https',
    'REVERB_ALLOWED_ORIGINS': DOMAIN,
}
for key, value in settings.items():
    pattern = r'^' + key + r'=.*$'
    text = re.sub(pattern, lambda _: key + '=' + value, text, flags=re.M) if re.search(pattern, text, re.M) else text.rstrip('\n') + '\n' + key + '=' + value + '\n'
env.write_text(text)
os.chown(env, 0, grp.getgrnam('www-data').gr_gid)
env.chmod(0o640)

# 3. systemd service running as www-data on localhost only.
php = shutil.which('php') or '/usr/bin/php'
unit = f"""[Unit]
Description=Anaheim Electronics realtime server (Laravel Reverb)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory={APP}
ExecStart={php} artisan reverb:start --host=127.0.0.1 --port={PORT}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
"""
if not UNIT.exists() or UNIT.read_text() != unit:
    if UNIT.exists():
        shutil.copy2(UNIT, backup / 'ae-reverb.service')
    UNIT.write_text(unit)
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', UNIT.name], check=True, capture_output=True)

# 4. Nginx: proxy /app/ WebSocket connections on the verified site only.
location = f"""
    {MARKER}
    location /app/ {{
        proxy_pass http://127.0.0.1:{PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 120s;
    }}
"""


def add_location(config):
    edits, matched = [], 0
    for start, opening, end in uploads.server_blocks(config):
        block = config[start:end]
        names = re.search(r'^\s*server_name\s+([^;]+);', block, re.M)
        root = re.search(r'^\s*root\s+([^;]+);', block, re.M)
        if not names or DOMAIN not in names[1].lower().split() or not root or root[1].strip().strip('"\'') != uploads.ROOT:
            continue
        matched += 1
        if MARKER not in block:
            edits.append(opening)
    for opening in reversed(edits):
        config = config[:opening] + location + config[opening:]
    return config, matched


dump = subprocess.run(['nginx', '-T'], capture_output=True, text=True, check=True).stdout
candidates = []
for name in sorted(set(re.findall(r'^# configuration file ([^:\n]+):$', dump, re.M))):
    path = Path(name).resolve()
    if not path.is_relative_to('/etc/nginx'):
        continue
    before = path.read_text()
    after, matched = add_location(before)
    if matched:
        candidates.append((path, before, after))
if len(candidates) != 1:
    raise SystemExit('Expected exactly one Nginx file for the verified application root.')
path, before, after = candidates[0]
if before != after:
    (backup / 'nginx-before-realtime.conf').write_text(before)
    try:
        path.write_text(after)
        subprocess.run(['nginx', '-t'], check=True, capture_output=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except BaseException:
        path.write_text(before)
        raise
print('REALTIME_CONFIGURED: Reverb on localhost, WebSockets proxied at /app/ for the verified site.')
