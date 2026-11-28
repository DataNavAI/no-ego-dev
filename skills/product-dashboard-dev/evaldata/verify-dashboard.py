"""Trusted post-agent oracle: evaluate real output, never the skill's prose."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import math
import os
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

home = Path(os.environ['HERMES_HOME']).resolve()
root = home / 'workspace'
source = root / 'source.sqlite'
env = {**os.environ, 'NED_AGENT_HOME': str(home)}
assert hashlib.sha256(source.read_bytes()).hexdigest() == (root / 'source.sha256').read_text(), 'Agent modified source'
status = json.loads(subprocess.check_output(['ned','dashboard','status','--project',str(root),'--json'], env=env, text=True, timeout=20))
app = status['dashboard']
assert app and app['status'] == 'available', 'No running registered dashboard'
assert app['project']['id'] and app['id'] and status['revision'] >= 1
origin = 'http://127.0.0.1:' + str(app['port'])
report = json.loads(Path('dashboard-evaluation.json').read_text())
assert report['result'] == 'pass', 'Agent did not establish a passing evaluated dashboard'
assert report.get('checks') and not any(i.get('severity') == 'blocking' for i in report.get('issues', []))

# This oracle is independent of generated aggregation code.
db = sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)
coverage = dict(db.execute('SELECT day,status FROM coverage'))
active, converted = {}, {}
for user, event, stamp, bot, internal in db.execute('SELECT user_id,event_name,occurred_at,is_bot,is_internal FROM events'):
    if bot or internal or event not in {'page_view','product_open','purchase'}:
        continue
    day = dt.datetime.fromisoformat(stamp).astimezone(ZoneInfo('America/Los_Angeles')).date().isoformat()
    active.setdefault(day,set()).add(user)
    if event == 'purchase':
        converted.setdefault(day,set()).add(user)
db.close()
def query(start, end):
    with urllib.request.urlopen(origin+'/api/metrics?start='+start+'&end='+end, timeout=10) as response:
        assert response.status == 200
        return json.load(response)
def verify(start, end):
    data = query(start,end)
    assert data['timezone'] == 'America/Los_Angeles'
    days = (dt.date.fromisoformat(end)-dt.date.fromisoformat(start)).days+1
    assert len(data['series']) == days
    for offset,row in enumerate(data['series']):
        day = (dt.date.fromisoformat(start)+dt.timedelta(days=offset)).isoformat()
        assert row['date'] == day
        state = coverage.get(day,'missing')
        assert row['coverage'] == state
        expected = None if state == 'missing' else len(active.get(day,set()))
        conversions = None if state == 'missing' else len(converted.get(day,set()))
        assert row['dau'] == expected, (day,'DAU mismatch')
        assert row['conversions'] == conversions, (day,'conversion mismatch')
        if 'rate' in row:
            rate = conversions/expected if expected else None
            assert row['rate'] is None if rate is None else math.isclose(row['rate'],rate)
    public = json.dumps(data)
    assert not any(identity in public for identity in ['acct_a','acct_b','acct_c','acct_d','acct_e','acct_f','synthetic_bot','synthetic_staff'])
    assert data['lastSuccessfulSync'] and data['dataThrough']
    assert isinstance(data['stale'], bool)
    return data
for days in (7,30,90):
    end=dt.date(2026,1,10)
    verify((end-dt.timedelta(days=days-1)).isoformat(),end.isoformat())
verify('2026-01-04','2026-01-07')
for start,end in [('2026-01-12','2026-01-01'),('not-a-date','2026-01-10')]:
    try:
        query(start,end)
        raise AssertionError('Invalid date accepted')
    except urllib.error.HTTPError as e:
        assert e.code == 400

baseline = verify('2026-01-04','2026-01-10')['series']
for _ in range(2):
    subprocess.run(['/opt/ned/python/bin/python',str(root/'dashboard/sync.py'),'--source',str(source),'--target',str(root/'dashboard/cache.sqlite')],cwd=root,env=env,check=True,timeout=30,stdout=subprocess.DEVNULL)
    assert verify('2026-01-04','2026-01-10')['series'] == baseline
assert hashlib.sha256(source.read_bytes()).hexdigest() == (root/'source.sha256').read_text()
# Run a real, private Dashboard embedding and rendered-source/mobile oracle.
# A verifier-owned listener avoids guessing or taking over an agent's COM process.
with tempfile.TemporaryDirectory(prefix='lantern-browser-') as temporary:
    control = Path(temporary)
    expected = control / 'expected.json'
    end = dt.date(2026, 1, 10)
    first = end - dt.timedelta(days=89)
    rows = []
    for offset in range(90):
        day = (first + dt.timedelta(days=offset)).isoformat()
        state = coverage.get(day, 'missing')
        rows.append({'date': day,
                     'dau': None if state == 'missing' else len(active.get(day, set())),
                     'conversions': None if state == 'missing' else len(converted.get(day, set()))})
    expected.write_text(json.dumps(rows))
    script = control / 'com.mjs'
    script.write_text("import fs from 'node:fs';import{createCommunicatorServer}from'/opt/ned/apps/com/src/server.js';const home=process.env.HERMES_HOME;const app=createCommunicatorServer({home,env:{...process.env,NED_AGENT_HOME:home},initializeDatabase:true,identityEnabled:false});await app.listen();fs.writeFileSync(process.argv[2],JSON.stringify({url:app.url}));")
    with (control / 'com.log').open('w') as log:
        com = subprocess.Popen(['node', str(script), str(control / 'ready.json')], env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            for _ in range(100):
                if (control / 'ready.json').exists():
                    break
                assert com.poll() is None, 'Verifier-owned COM did not start'
                time.sleep(.1)
            assert (control / 'ready.json').exists(), 'Verifier-owned COM readiness timeout'
            com_url = json.loads((control / 'ready.json').read_text())['url']
            # The engine snapshots this verifier alone. Use the root-owned container
            # package dependency and bind its exact bytes into the trusted program.
            browser = Path('/opt/ned/skills/product-dashboard-dev/evaldata/browser.mjs')
            assert hashlib.sha256(browser.read_bytes()).hexdigest() == 'd3763fa07489b449e7dab5c3b5ff8b3f2ae0b9563725ba2ef866d7a0a11bb051', 'Trusted browser package changed'
            subprocess.run(['node', str(browser), origin, com_url,
                            app['id'], app['project']['id'], end.isoformat(), str(expected)],
                           cwd=root, env=env, check=True, timeout=120)
        finally:
            com.terminate()
            try:
                com.wait(timeout=5)
            except subprocess.TimeoutExpired:
                com.kill()
                com.wait(timeout=5)
print(json.dumps({'result':'pass','metric_days':[7,30,90,'custom'],'registrationId':app['id'],'revision':status['revision'],'source':'unchanged','sync':'idempotent'}))
