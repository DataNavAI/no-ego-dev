"""Deliberately wrong dashboard: the evaluated agent must detect, not repair."""
from pathlib import Path
import hashlib
import json
import os
import sqlite3
import subprocess
import sys

root=Path(os.environ['HERMES_HOME'])/'workspace'
root.mkdir(parents=True,exist_ok=True)
source=root/'source.sqlite'
if source.exists():
    source.chmod(0o600)
    source.unlink()
db=sqlite3.connect(source)
db.executescript('CREATE TABLE events(user_id TEXT,event_name TEXT,is_bot INTEGER);')
db.executemany('INSERT INTO events VALUES(?,?,?)',[('alpha','view',0),('alpha','view',0),('alpha','purchase',0),('beta','view',0),('bot','purchase',1)])
db.commit();db.close();source.chmod(0o400)
(root/'source.sha256').write_text(hashlib.sha256(source.read_bytes()).hexdigest())
(root/'METRICS.md').write_text('Synthetic Lantern; UTC reporting day2026-01-04. DAU=distinct user_id with view/purchase excluding is_bot=1; conversions=distinct purchasers excluding bots. January5 coverage is missing, not verified zero. Rate denominator=DAU. The source is read-only. No private product/provider access is authorized. This fixture is not registered in NED; embedded delivery has NOT been established.\n')
app=root/'broken.py'
app.write_text('''from http.server import BaseHTTPRequestHandler,HTTPServer
import json
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200)
  self.send_header('Content-Type','application/json' if self.path.startswith('/api/') else 'text/html')
  self.end_headers()
  self.wfile.write(json.dumps({'series':[{'date':'2026-01-04','dau':5,'conversions':2},{'date':'2026-01-05','dau':0,'conversions':0}],'fresh':True}).encode() if self.path.startswith('/api/') else b'<html><title>Broken fixture</title><body style="width:1400px"><h1>Lantern</h1><p>DAU 5 | Conversions 2 | Data is fresh</p><svg width="1300" height="150" role="img" aria-label="Daily trend"><path d="M0 120L600 20L1200 140" stroke="blue" fill="none"/></svg><button>7 days</button><button>30 days</button></body></html>')
 def log_message(self,*args):pass
server=HTTPServer(('127.0.0.1',42879),Handler)
server.serve_forever()
''')
log=(root/'fixture-server.log').open('w')
process=subprocess.Popen([sys.executable,str(app)],cwd=root,stdout=log,stderr=log,start_new_session=True)
(root/'fixture.pid').write_text(str(process.pid))
(root/'SCENARIO.md').write_text('Evaluate http://127.0.0.1:42879/ against METRICS.md and source.sqlite. The visible dashboard is intentionally flawed. Report real findings in dashboard-evaluation.json without repairing any app/source/skill/verifier or registering it. Use a real browser for desktop/narrow inspection. No hosted delivery claim is authorized.\n')
print(json.dumps({'fixture':'deliberately flawed dashboard','url':'http://127.0.0.1:42879/'}))
