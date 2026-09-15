#!/usr/bin/python3
import os, shutil, subprocess
from pathlib import Path

if os.geteuid()!=0: raise SystemExit('Root privileges required.')
source=Path(__file__).resolve().parent/'provision-tenant.py'
destination=Path('/usr/local/sbin/ae-provision-tenant')
backup=Path(os.environ['AE_BACKUP_DIR'])
if destination.exists(): shutil.copy2(destination,backup/'previous-tenant-provisioner.py')
shutil.copyfile(source,destination)
os.chown(destination,0,0); os.chmod(destination,0o755)
sudoers=Path('/etc/sudoers.d/anaheim-tenants')
if sudoers.exists(): shutil.copy2(sudoers,backup/'previous-tenant-sudoers')
temporary=Path('/etc/sudoers.d/.anaheim-tenants-validate')
temporary.write_text('www-data ALL=(root) NOPASSWD: /usr/local/sbin/ae-provision-tenant\n')
os.chown(temporary,0,0);os.chmod(temporary,0o440)
subprocess.run(['/usr/sbin/visudo','-cf',str(temporary)],check=True,capture_output=True)
temporary.replace(sudoers)
print('Tenant provisioner installed with a UUID-only command interface.')
