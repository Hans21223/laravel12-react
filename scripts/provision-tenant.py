#!/usr/bin/python3
"""Root-owned, narrowly scoped sudo helper. Accepts one server-generated UUID."""
import json, os, re, secrets, subprocess, sys

if os.geteuid() != 0 or len(sys.argv) != 2 or not re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', sys.argv[1]):
    raise SystemExit('A valid organization UUID and root privileges are required.')
identifier=sys.argv[1].replace('-','')
database='ae_org_'+identifier
username='ae_'+identifier[:24]
password=secrets.token_urlsafe(36)

def mysql(sql):
    result=subprocess.run(['/usr/bin/mysql','--batch','--skip-column-names','--user=root'],input=sql,text=True,capture_output=True,timeout=30)
    if result.returncode: raise SystemExit('Tenant database operation failed. No credentials were logged.')
    return result.stdout.strip()

if mysql("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+database+"';")!='0' or mysql("SELECT COUNT(*) FROM mysql.user WHERE User='"+username+"';")!='0':
    raise SystemExit('Tenant database or account already exists. Refusing to overwrite.')
mysql(f"CREATE DATABASE `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER '{username}'@'localhost' IDENTIFIED BY '{password}' WITH MAX_USER_CONNECTIONS 24; GRANT ALL PRIVILEGES ON `{database}`.* TO '{username}'@'localhost';")
print(json.dumps({'driver':'mysql','host':'127.0.0.1','port':'3306','database':database,'username':username,'password':password,'unix_socket':''}))
