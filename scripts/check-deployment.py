"""Check public HTTPS responses and deployed assets without user credentials."""
import hashlib
import html
import json
import re
import time
import urllib.request
from pathlib import Path

base = 'https://helldriver.csbootstrap.com'
for attempt in range(3):
    try:
        with urllib.request.urlopen(base + '/up', timeout=20) as response:
            assert response.status == 200
        with urllib.request.urlopen(base + '/', timeout=20) as response:
            markup = response.read().decode()
        match = re.search(r'data-page="([^"]+)"', markup)
        assert match, 'Missing Inertia page'
        page = json.loads(html.unescape(match.group(1)))
        assert page['component'] == 'Approvals/Auth', 'Wrong application at public URL'
        manifest = json.loads(Path('public/build/manifest.json').read_text())
        for entry in ['resources/js/app.jsx', 'resources/js/Pages/Approvals/Auth.jsx',
                      'resources/js/Pages/Approvals/Workspace.jsx']:
            file = manifest[entry]['file']
            with urllib.request.urlopen(base + '/build/' + file, timeout=20) as response:
                deployed = response.read()
            expected = Path('public/build', file).read_bytes()
            assert hashlib.sha256(deployed).digest() == hashlib.sha256(expected).digest(), 'Asset mismatch: ' + file
        print('LIVE_PUBLIC_OK: HTTPS health, Anaheim login page, and exact tested frontend assets.')
        break
    except Exception:
        if attempt == 2:
            raise
        time.sleep(3)
