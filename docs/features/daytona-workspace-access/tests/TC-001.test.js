import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DaytonaClient } from '../../../../src/providers/daytona-client.js';
import { fixture, json } from './helpers.js';

test('TC-001: real clients authenticate and preserve workspace commands and binary files', { timeout: 5000 }, async (t) => {
  let base;
  const bytes = Buffer.from([0, 255, 42, 128]);
  const f = await fixture(t, ({ res, url, body }) => {
    if (url.pathname.endsWith('/toolbox-proxy-url')) return json(res, { url: `${base}/toolbox` });
    if (url.pathname.endsWith('/start')) return json(res, { id: 'a', state: 'starting' });
    if (url.pathname.startsWith('/sandbox/')) return json(res, { id: url.pathname.split('/')[2], state: 'started' });
    if (url.pathname.endsWith('/files/download')) { res.end(bytes); return; }
    if (url.pathname.endsWith('/files/upload')) { res.end('{}'); return; }
    if (url.pathname.endsWith('/process/execute')) return json(res, JSON.parse(body).envs ? { exitCode: 0, result: 'ready' } : { code: 7, result: 'legacy' });
    json(res, {}, 500);
  });
  base = f.url;
  const client = new DaytonaClient({ apiKey: 'synthetic-key', apiUrl: base, pollIntervalMs: 1 });
  const [a, b] = await Promise.all([client.get('a'), client.get('b')]);
  await a.start(1);
  await a.fs.uploadFile(bytes, '/tmp/profile.tgz');
  assert.deepEqual(await a.process.executeCommand('echo ready', '/home', { TEST: 'yes' }, 3), { exitCode: 0, result: 'ready', artifacts: { stdout: 'ready' } });
  assert.equal((await b.process.executeCommand('false', undefined, undefined, 3)).exitCode, 7);
  assert.deepEqual(await a.fs.downloadFile('/tmp/status', 3), bytes);
  assert.ok(f.requests.every((r) => r.headers.authorization === 'Bearer synthetic-key'));
  const upload = f.requests.find((r) => r.url.pathname.endsWith('/files/upload'));
  assert.equal(upload.url.searchParams.get('path'), '/tmp/profile.tgz');
  assert.ok(upload.body.includes(bytes));
  const executions = f.requests.filter((r) => r.url.pathname.endsWith('/process/execute'));
  assert.deepEqual(executions.map((r) => r.url.pathname), ['/toolbox/a/process/execute', '/toolbox/b/process/execute']);
  assert.deepEqual(JSON.parse(executions[0].body), { command: 'echo ready', cwd: '/home', envs: { TEST: 'yes' }, timeout: 3 });
  assert.equal(f.requests.filter((r) => r.url.pathname.endsWith('/start')).length, 1);
});
