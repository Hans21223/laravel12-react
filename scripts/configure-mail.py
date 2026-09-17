#!/usr/bin/python3
"""Configure outgoing mail without printing secrets.

With AE_MAIL_USERNAME/AE_MAIL_PASSWORD repository secrets, mail goes through authenticated SMTP
(Gmail by default), which Gmail and other providers accept because the message is DKIM-signed.
Without them, an unconfigured `log` mailer falls back to the local Postfix sendmail.
"""
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

DOMAIN = 'helldriver.csbootstrap.com'
env = Path(os.environ.get('AE_ENV_FILE', '/var/www/Helldriver.csbootstrap.com/laravel12-react/.env'))
text = env.read_text()


def write(settings):
    global text
    for key, value in settings.items():
        pattern = r'^' + key + r'=.*$'
        text = re.sub(pattern, lambda _: key + '=' + value, text, flags=re.M) if re.search(pattern, text, re.M) else text.rstrip('\n') + '\n' + key + '=' + value + '\n'
    env.write_text(text)


source = os.environ.get('AE_MAIL_CREDENTIALS', '')
credentials = {}
if source and Path(source).exists():
    try:
        credentials = json.loads(Path(source).read_text() or '{}')
    finally:
        Path(source).unlink()
username = credentials.get('username', '').strip()
password = re.sub(r'\s+', '', credentials.get('password', ''))  # Google shows app passwords in groups of four.
if username and password:
    if not re.fullmatch(r'[^\s\'"]+@[^\s\'"]+', username) or re.search(r"['\n\\]", password):
        raise SystemExit('MAIL_CREDENTIALS_INVALID: check the AE_MAIL_USERNAME and AE_MAIL_PASSWORD secrets.')
    host = credentials.get('host', '').strip() or 'smtp.gmail.com'
    port = str(credentials.get('port') or 587)
    write({
        'MAIL_MAILER': 'smtp',
        'MAIL_SCHEME': 'smtps' if port == '465' else 'smtp',
        'MAIL_HOST': host,
        'MAIL_PORT': port,
        'MAIL_USERNAME': f"'{username}'",
        'MAIL_PASSWORD': f"'{password}'",
        'MAIL_FROM_ADDRESS': f"'{username}'",
        'MAIL_FROM_NAME': '"Anaheim Electronics"',
        'MAIL_EHLO_DOMAIN': DOMAIN,
    })
    print(f'MAIL_CONFIGURED: authenticated SMTP via {host}:{port}')
    raise SystemExit(0)

mailer = (re.search(r'^MAIL_MAILER=(.*)$', text, re.M) or [None, 'log'])[1].strip('"\' ')
if mailer not in ('', 'log', 'array'):
    print(f'MAIL_ALREADY_CONFIGURED: {mailer}')
    raise SystemExit(0)
sendmail = shutil.which('sendmail') or '/usr/sbin/sendmail'
if not Path(sendmail).exists() or subprocess.run(['systemctl', 'is-active', '--quiet', 'postfix']).returncode != 0:
    print('MAIL_UNAVAILABLE: no active local MTA; messages stay in the application log')
    raise SystemExit(0)
write({
    'MAIL_MAILER': 'sendmail',
    'MAIL_SENDMAIL_PATH': f'"{sendmail} -bs -i"',
    'MAIL_FROM_ADDRESS': f'"no-reply@{DOMAIN}"',
    'MAIL_FROM_NAME': '"Anaheim Electronics"',
})
print('MAIL_CONFIGURED: local sendmail (Gmail rejects it without SPF/DKIM; add SMTP secrets for Gmail delivery)')
