#!/usr/bin/env python3
"""Publish the reviewed LMS docs artifact at ipbleap.com's Pages root.

Usage: python3 tools/sync-lms.py /absolute/path/to/ipb-leap-website
Existing registration, backend, administrative tools and CNAME are retained.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]).resolve()
DIST = SOURCE / 'docs'
PREVIEW = 'https://kawanberinovasi-ops.github.io/ipb-leap-website/'
DOMAIN = 'https://ipbleap.com/'
assert (DIST / 'app/index.html').is_file(), 'Build the source docs artifact first.'
assert (ROOT / 'CNAME').read_text().strip() == 'ipbleap.com'

copied = []
for src in sorted(DIST.rglob('*')):
    if not src.is_file():
        continue
    rel = src.relative_to(DIST)
    if rel.parts[0] == 'review-penilaian' or src.name == 'CNAME' or src.name in {'local-api.mjs', 'local-banner.mjs', 'local-session.mjs'}:
        continue
    dest = ROOT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.suffix in {'.html', '.mjs', '.js', '.json', '.xml', '.txt', '.md', '.css'}:
        dest.write_text(src.read_text().replace(PREVIEW, DOMAIN))
    else:
        shutil.copyfile(src, dest)
    copied.append(str(rel))

# Legacy links retain their cohort, subject, period, record and activation token.
# Account/assignment administration and finance retain their existing server UI.
routes = {
    '/erp/': '/app/index.html',
    '/erp/beranda/': '/app/beranda-mentee.html',
    '/erp/program/progres/': '/app/progres.html',
    '/erp/program/abc/': '/app/mentoring.html',
    '/erp/program/review/': '/app/hasil-kpi.html',
    '/erp/program/poc/': '/app/poc.html',
    '/erp/program/penilaian/': '/app/penilaian.html',
    '/erp/program/raport/': '/app/raport.html',
    '/erp/kelompok/': '/app/kelompok.html',
    '/erp/kelompok/progres/': '/app/monitoring-progres.html',
    '/erp/kelompok/abc/': '/app/mentoring.html',
    '/erp/kelompok/review/': '/app/kelompok-penilaian.html',
    '/erp/kelompok/poc/': '/app/poc.html',
    '/erp/kelompok/raport/': '/app/raport.html',
}
redirect = '''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>IPB LEAP</title><script type="module" src="/assets/lms-entry.mjs"></script></head><body data-lms-destination="{target}"><p>Membuka IPB LEAP… <a href="{target}">Lanjutkan</a></p></body></html>'''
for old, target in routes.items():
    (ROOT / old.strip('/') / 'index.html').write_text(redirect.format(target=target))
(ROOT / 'login/index.html').write_text(redirect.format(target='/app/index.html'))
(ROOT / 'assets/lms-entry.mjs').write_text('''const routes = ''' + json.dumps(routes) + ''';
const target=new URL(document.body.dataset.lmsDestination,location.origin);
const params=new URLSearchParams(location.search);
if(location.pathname.replace(/\\/$/,'')==='/login'){
 const next=params.get('next');
 if(next){try{const url=new URL(next,location.origin);if(url.origin===location.origin){const key=url.pathname.replace(/\\/$/,'')+'/';const mapped=routes[key];if(mapped&&mapped!=='/app/index.html')params.set('next',mapped+url.search);else if(!url.pathname.startsWith('/app/'))params.delete('next');}else params.delete('next');}catch{params.delete('next');}}
}
target.search=params.toString();target.hash=location.hash;
document.querySelector('a').href=target.href;location.replace(target.href);
''')
commit = subprocess.check_output(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD'], text=True).strip()
(ROOT / 'lms-release.json').write_text(json.dumps({
    'source_repository': 'kawanberinovasi-ops/ipb-leap-website',
    'source_commit': commit,
    'domain': DOMAIN,
    'files': copied,
}, indent=2) + '\n')
print(f'Synced {len(copied)} production files; preserved registration, backend and administration.')
