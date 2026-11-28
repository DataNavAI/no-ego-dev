"""Seed a disposable, credential-free product source for a real-agent evaluation."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import sqlite3

root = Path(os.environ['HERMES_HOME']) / 'workspace'
root.mkdir(parents=True, exist_ok=True)
source = root / 'source.sqlite'
if source.exists():
    source.chmod(0o600)
    source.unlink()
db = sqlite3.connect(source)
db.executescript('CREATE TABLE events(id TEXT PRIMARY KEY,user_id TEXT,event_name TEXT,occurred_at TEXT,is_bot INTEGER,is_internal INTEGER);CREATE TABLE coverage(day TEXT PRIMARY KEY,status TEXT);')
events = [
    ('a1','acct_a','page_view','2026-01-04T12:00:00+00:00',0,0),
    ('a2','acct_a','page_view','2026-01-04T12:05:00+00:00',0,0),
    ('b1','acct_b','product_open','2026-01-04T12:06:00+00:00',0,0),
    ('a3','acct_a','purchase','2026-01-04T12:10:00+00:00',0,0),
    ('a4','acct_a','purchase','2026-01-04T12:11:00+00:00',0,0),
    ('bot','synthetic_bot','purchase','2026-01-04T12:12:00+00:00',1,0),
    ('staff','synthetic_staff','purchase','2026-01-04T12:13:00+00:00',0,1),
    ('c1','acct_c','product_open','2026-01-05T00:30:00+00:00',0,0),
    ('d1','acct_d','product_open','2026-01-05T08:30:00+00:00',0,0),
    ('d2','acct_d','purchase','2026-01-05T08:35:00+00:00',0,0),
    ('unknown','acct_e','page_view','2026-01-07T18:00:00+00:00',0,0),
    ('eight1','acct_a','product_open','2026-01-08T18:00:00+00:00',0,0),
    ('eight2','acct_b','purchase','2026-01-08T18:10:00+00:00',0,0),
    ('ten1','acct_f','page_view','2026-01-10T18:00:00+00:00',0,0),
    ('ten2','acct_f','purchase','2026-01-10T18:10:00+00:00',0,0),
]
db.executemany('INSERT INTO events VALUES(?,?,?,?,?,?)', events)
end = dt.date(2026, 1, 10)
for offset in range(120):
    day = (end - dt.timedelta(days=offset)).isoformat()
    db.execute('INSERT INTO coverage VALUES(?,?)', (day, 'missing' if day == '2026-01-07' else 'partial' if day == end.isoformat() else 'complete'))
db.commit()
db.close()
source.chmod(0o400)
(root / 'source.sha256').write_text(hashlib.sha256(source.read_bytes()).hexdigest())
(root / 'SOURCE.md').write_text('''# Synthetic product: Lantern
This disposable source is read-only and contains no real user data/credentials.
Use America/Los_Angeles reporting days. Qualifying activity is page_view,
product_open or purchase; exclude is_bot=1 and is_internal=1. DAU counts distinct
user_id; conversions count distinct user_id with purchase. If a rate is shown,
eligibility is that reporting day's active users; zero denominator is N/A.
Use coverage.status: missing => unknown/null, complete with no rows => zero;
partial => observed values clearly marked partial. The simulated reporting clock
is 2026-01-10T20:00:00Z (no claim these historical fixtures are today's real data).
Source coverage/data-through and last successful query/sync are separate facts.
The source is source.sqlite, with events and coverage tables. Do not alter it.
''')
# Repair only disposable terminal/browser settings, preserving model/provider config.
import yaml
import secrets
config_path = Path(os.environ['HERMES_HOME']) / 'config.yaml'
if config_path.exists():
    config = yaml.safe_load(config_path.read_text()) or {}
    config.setdefault('terminal', {})['cwd'] = str(root)
    config.setdefault('browser', {})['executable_path'] = '/usr/bin/google-chrome'
    # OAuth model availability is interpreted by this profile's real gateway.
    # Enable only a test-owned authenticated loopback API; never copy host keys.
    api = config.setdefault('platforms', {}).setdefault('api_server', {})
    api['enabled'] = True
    extra = api.setdefault('extra', {})
    extra.update(host='127.0.0.1', port=8642)
    extra.setdefault('key', secrets.token_urlsafe(48))
    config_path.write_text(yaml.safe_dump(config, sort_keys=False))
print(json.dumps({'fixture': 'Lantern', 'source': str(source), 'rows': len(events)}))
