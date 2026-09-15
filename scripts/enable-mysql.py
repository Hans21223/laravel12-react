#!/usr/bin/python3
"""One-time SQLite migration. Switch .env only after all copied rows verify."""
import json, os, re, subprocess, uuid
from pathlib import Path

if os.geteuid() != 0: raise SystemExit('Root required.')
backup = Path(os.environ['AE_BACKUP_DIR'])
assert backup.is_dir()
env = Path('.env')
text = env.read_text()
connection = re.search(r'^DB_CONNECTION=(.*)$', text, re.M)
if connection and connection.group(1).strip('"\' ') == 'mysql':
    print('MYSQL_ALREADY_ENABLED')
    raise SystemExit(0)
if not connection or connection.group(1).strip('"\' ') != 'sqlite': raise SystemExit('Unexpected database driver.')
result = subprocess.run(['/usr/local/sbin/ae-provision-tenant', str(uuid.uuid4())], text=True, capture_output=True, check=True)
credentials = json.loads(result.stdout)
private = backup / 'central-mysql-credentials.json'
private.write_text(json.dumps(credentials))
private.chmod(0o600)
subprocess.run(['php', 'scripts/migrate-to-mysql.php', str(private)], check=True)
settings = {'DB_CONNECTION': 'mysql', 'DB_HOST': credentials['host'], 'DB_PORT': credentials['port'],
            'DB_DATABASE': credentials['database'], 'DB_USERNAME': credentials['username'], 'DB_PASSWORD': credentials['password'],
            'DB_SOCKET': '', 'DB_URL': '', 'TENANCY_ENABLED': 'true', 'TENANT_DB_DRIVER': 'mysql',
            'SESSION_LIFETIME': '120', 'SESSION_ENCRYPT': 'true'}
for key, value in settings.items():
    pattern = r'^' + key + r'=.*$'
    text = re.sub(pattern, lambda _: key+'='+value, text, flags=re.M) if re.search(pattern, text, re.M) else text+'\n'+key+'='+value+'\n'
temporary = env.with_suffix('.env-mysql-tmp')
temporary.write_text(text)
temporary.chmod(0o640)
os.chown(temporary, 0, __import__('grp').getgrnam('www-data').gr_gid)
temporary.replace(env)
print('MYSQL_ENV_SWITCHED_AFTER_VERIFICATION')
