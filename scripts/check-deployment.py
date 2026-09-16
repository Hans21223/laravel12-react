"""Check public HTTPS responses and deployed assets without user credentials."""
import base64
import hashlib
import html
import json
import os
import re
import socket
import ssl
import time
import urllib.request
from pathlib import Path


def websocket_status(host):
    """Reverb answers the upgrade even for an unknown app key, which proves Nginx and the service are running."""
    request = (
        f'GET /app/deployment-check?protocol=7&client=js&version=8.4.0 HTTP/1.1\r\nHost: {host}\r\n'
        'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n'
        f'Sec-WebSocket-Key: {base64.b64encode(os.urandom(16)).decode()}\r\nOrigin: https://{host}\r\n\r\n'
    )
    with socket.create_connection((host, 443), timeout=15) as raw:
        with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as tls:
            tls.sendall(request.encode())
            return tls.recv(200).decode(errors='replace').split('\r\n')[0]


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
        files = set()
        for entry in ['resources/js/app.jsx', 'resources/js/Pages/Approvals/Auth.jsx',
                      'resources/js/Pages/Approvals/Workspace.jsx', 'resources/js/Pages/Approvals/Settings.jsx']:
            files.add(manifest[entry]['file'])
            files.update(manifest[entry].get('css', []))
        for file in sorted(files):
            with urllib.request.urlopen(base + '/build/' + file, timeout=20) as response:
                deployed = response.read()
            expected = Path('public/build', file).read_bytes()
            assert hashlib.sha256(deployed).digest() == hashlib.sha256(expected).digest(), 'Asset mismatch: ' + file
        status = websocket_status('helldriver.csbootstrap.com')
        assert ' 101 ' in status, 'WebSocket upgrade failed: ' + status
        print('LIVE_PUBLIC_OK: HTTPS health, Anaheim login page, exact tested frontend assets, and WebSocket upgrade.')
        break
    except Exception:
        if attempt == 2:
            raise
        time.sleep(3)
