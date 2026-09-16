#!/usr/bin/python3
"""Deliver password-reset and verification mail through the server's local MTA, unless a mail provider is already configured."""
import re
import shutil
import subprocess
from pathlib import Path

DOMAIN = 'helldriver.csbootstrap.com'
env = Path('/var/www/Helldriver.csbootstrap.com/laravel12-react/.env')
text = env.read_text()
mailer = (re.search(r'^MAIL_MAILER=(.*)$', text, re.M) or [None, 'log'])[1].strip('"\' ')
if mailer not in ('', 'log', 'array'):
    print(f'MAIL_ALREADY_CONFIGURED: {mailer}')
    raise SystemExit(0)
sendmail = shutil.which('sendmail') or '/usr/sbin/sendmail'
if not Path(sendmail).exists() or subprocess.run(['systemctl', 'is-active', '--quiet', 'postfix']).returncode != 0:
    print('MAIL_UNAVAILABLE: no active local MTA; messages stay in the application log')
    raise SystemExit(0)
settings = {
    'MAIL_MAILER': 'sendmail',
    'MAIL_SENDMAIL_PATH': f'"{sendmail} -bs -i"',
    'MAIL_FROM_ADDRESS': f'"no-reply@{DOMAIN}"',
    'MAIL_FROM_NAME': '"Anaheim Electronics"',
}
for key, value in settings.items():
    pattern = r'^' + key + r'=.*$'
    text = re.sub(pattern, lambda _: key + '=' + value, text, flags=re.M) if re.search(pattern, text, re.M) else text.rstrip('\n') + '\n' + key + '=' + value + '\n'
env.write_text(text)
print('MAIL_CONFIGURED: local sendmail with no-reply sender')
