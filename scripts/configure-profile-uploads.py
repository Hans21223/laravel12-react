"""Set a 3 MB request envelope only for the verified Helldriver virtual host."""
import os
import re
import subprocess
from pathlib import Path

DOMAIN = 'helldriver.csbootstrap.com'
ROOT = '/var/www/Helldriver.csbootstrap.com/laravel12-react/public'


def server_blocks(text):
    for match in re.finditer(r'\bserver\s*\{', text):
        depth, quote, comment, escaped = 1, None, False, False
        for index in range(match.end(), len(text)):
            char = text[index]
            if comment:
                if char == '\n': comment = False
                continue
            if escaped:
                escaped = False
                continue
            if char == '\\':
                escaped = True
                continue
            if quote:
                if char == quote: quote = None
                continue
            if char in ['"', "'"]:
                quote = char
            elif char == '#':
                comment = True
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    yield match.start(), match.end(), index + 1
                    break


def update(text):
    edits, matched = [], 0
    for start, opening, end in server_blocks(text):
        block = text[start:end]
        names = re.search(r'^\s*server_name\s+([^;]+);', block, re.M)
        root = re.search(r'^\s*root\s+([^;]+);', block, re.M)
        if not names or DOMAIN not in names[1].lower().split() or not root or root[1].strip().strip('"\'') != ROOT:
            continue
        matched += 1
        limit = re.search(r'(?m)^([ \t]*)client_max_body_size\s+(\d+)([kKmM]?)\s*;', block)
        if limit:
            # A nested limit needs a manual review, rather than changing another location.
            prefix = re.sub(r'#.*', '', block[:limit.start()])
            if prefix.count('{') - prefix.count('}') != 1:
                raise RuntimeError('Nested upload limit requires review')
            size = int(limit[2]) * {'': 1, 'k': 1024, 'm': 1024**2}[limit[3].lower()]
            if size == 0 or size >= 3 * 1024**2:
                continue
            edits.append((start + limit.start(), start + limit.end(), limit[1] + 'client_max_body_size 3m;'))
        else:
            edits.append((opening, opening, '\n    client_max_body_size 3m;'))
    for start, end, replacement in reversed(edits):
        text = text[:start] + replacement + text[end:]
    return text, matched


def main():
    config = subprocess.run(['nginx', '-T'], capture_output=True, text=True, check=True).stdout
    paths = set(re.findall(r'^# configuration file ([^:\n]+):$', config, re.M))
    candidates = []
    for name in sorted(paths):
        path = Path(name).resolve()
        if not path.is_relative_to('/etc/nginx'):
            continue
        before = path.read_text()
        after, matched = update(before)
        if matched:
            candidates.append((path, before, after))
    if len(candidates) != 1:
        raise RuntimeError('Expected exactly one config file for the verified application root')
    path, before, after = candidates[0]
    if before == after:
        print('PROFILE_UPLOAD_LIMIT_OK: existing limit supports 2 MB photos')
        return
    backup = Path(os.environ['AE_BACKUP_DIR'])
    (backup / 'nginx-before.conf').write_text(before)
    (backup / 'nginx-config-path.txt').write_text(str(path))
    try:
        path.write_text(after)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except BaseException:
        path.write_text(before)
        raise
    print('PROFILE_UPLOAD_LIMIT_OK: verified site request limit set to 3 MB')


if __name__ == '__main__':
    main()
