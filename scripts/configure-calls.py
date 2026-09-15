#!/usr/bin/python3
"""Install this app's authenticated TURN relay. Never expose its shared secret."""
import grp, os, re, secrets, shutil, socket, subprocess
from pathlib import Path

if os.geteuid() != 0: raise SystemExit('Root required.')
backup = Path(os.environ['AE_BACKUP_DIR'])
config = Path('/etc/turnserver.conf')
marker = '# Managed by Anaheim Electronics deployment'
active = subprocess.run(['systemctl', 'is-active', '--quiet', 'coturn']).returncode == 0
if active and config.exists() and marker not in config.read_text():
    raise SystemExit('An existing TURN service is in use; refusing to overwrite its configuration.')
if shutil.which('turnserver') is None:
    subprocess.run(['apt-get', 'update', '-qq'], check=True, timeout=180)
    subprocess.run(['apt-get', 'install', '-y', '-qq', 'coturn'], check=True, timeout=180, env={**os.environ, 'DEBIAN_FRONTEND': 'noninteractive'})
env = Path('.env')
text = env.read_text()
match = re.search(r'^TURN_SECRET=([A-Za-z0-9_-]{40,})$', text, re.M)
secret = match.group(1) if match else secrets.token_urlsafe(48)
host = 'helldriver.csbootstrap.com'
external = socket.gethostbyname(host)
route = subprocess.run(['ip', '-4', 'route', 'get', external], text=True, capture_output=True, check=True).stdout
local = re.search(r'\bsrc (\d+\.\d+\.\d+\.\d+)', route).group(1)
lines = [marker, 'listening-port=3478', 'listening-ip='+local, 'relay-ip='+local,
         'external-ip='+external+'/'+local, 'realm='+host, 'server-name='+host,
         'fingerprint', 'use-auth-secret', 'static-auth-secret='+secret,
         'min-port=49160', 'max-port=49239', 'user-quota=4', 'total-quota=80',
         'max-bps=256000', 'bps-capacity=10000000', 'stale-nonce=600',
         'no-tls', 'no-dtls', 'no-tcp-relay', 'no-cli', 'no-multicast-peers',
         'log-file=syslog', 'no-stdout-log']
for block in ['0.0.0.0-0.255.255.255', '10.0.0.0-10.255.255.255', '100.64.0.0-100.127.255.255',
              '127.0.0.0-127.255.255.255', '169.254.0.0-169.254.255.255', '172.16.0.0-172.31.255.255',
              '192.0.0.0-192.0.0.255', '192.168.0.0-192.168.255.255', '198.18.0.0-198.19.255.255',
              '224.0.0.0-255.255.255.255']:
    lines.append('denied-peer-ip='+block)
# Peers can be another allocation on this relay, so do not deny its public IP.
if config.exists(): shutil.copy2(config, backup/'previous-turnserver.conf')
new = '\n'.join(lines)+'\n'
changed = not config.exists() or config.read_text() != new
config.write_text(new)
os.chown(config, 0, grp.getgrnam('turnserver').gr_gid)
config.chmod(0o640)
defaults = Path('/etc/default/coturn')
if defaults.exists(): shutil.copy2(defaults, backup/'previous-coturn-default')
defaults.write_text('TURNSERVER_ENABLED=1\n')
subprocess.run(['systemctl', 'enable', 'coturn'], check=True, capture_output=True)
subprocess.run(['systemctl', 'restart' if changed else 'start', 'coturn'], check=True)
subprocess.run(['systemctl', 'is-active', '--quiet', 'coturn'], check=True)
if shutil.which('ufw'):
    status = subprocess.run(['ufw', 'status'], text=True, capture_output=True, check=True).stdout
    if 'Status: active' in status:
        for port in ['3478/udp', '3478/tcp', '49160:49239/udp']:
            subprocess.run(['ufw', 'allow', port, 'comment', 'Anaheim authenticated calls'], check=True, capture_output=True)
for key, value in {'TURN_URL': f'turn:{host}:3478?transport=udp,turn:{host}:3478?transport=tcp', 'TURN_SECRET': secret}.items():
    pattern = r'^'+key+r'=.*$'
    text = re.sub(pattern, lambda _: key+'='+value, text, flags=re.M) if re.search(pattern, text, re.M) else text+'\n'+key+'='+value+'\n'
env.write_text(text)
env.chmod(0o640)
print('AUTHENTICATED_TURN_READY: private credentials, allocation limits, restricted peer networks.')
