import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp, rm, stat} from 'node:fs/promises';
import http from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {localMaintenance} from '../../../../scripts/container/local-maintenance.mjs';

test('TC-007: only an idle local maintenance lease can atomically stop admission', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ned-local-maint-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const socketPath = join(root, 'maintenance.sock');
  const instanceId = randomUUID();
  const env = {NED_LOCAL_MAINTENANCE: '1', NED_MANAGED_INSTANCE_ID: instanceId, NED_MANAGED_GENERATION: '1'};
  let now = 1, processIdle = true;
  const server = await localMaintenance({env, databasePath: join(root, 'ned.sqlite'), path: socketPath,
    clock: () => now, processInspector: () => ({idle: processIdle, reason: 'active_command'})});
  t.after(() => server.close());
  assert.equal((await stat(socketPath)).mode & 0o777, 0o600);
  const request = {instanceId, generation: 1, requestId: randomUUID(), targetImage: 'candidate@sha256:' + 'a'.repeat(64)};
  const call = (action, body = request, method = 'POST') => new Promise((resolve, reject) => {
    const req = http.request({socketPath, path: '/' + action, method}, res => {
      let data = '';
      res.on('data', chunk => {data += chunk;});
      res.on('end', () => resolve({code: res.statusCode, ...JSON.parse(data)}));
    });
    req.on('error', reject);
    req.end(method === 'POST' ? JSON.stringify(body) : undefined);
  });

  assert.equal((await call('prepare')).reason, 'recent_activity');
  assert.equal((await call('prepare', {...request, generation: 2})).code, 400);
  assert.equal((await call('prepare', request, 'GET')).code, 400);
  now += 300_001;
  processIdle = false;
  assert.equal((await call('prepare')).reason, 'active_command');
  processIdle = true;
  assert.equal((await call('prepare')).ready, true);
  const finish = server.maintenance.enter('chat');
  assert.equal((await call('commit')).ready, false);
  finish();
  now += 300_001;
  assert.equal((await call('prepare')).state, 'prepared');
  assert.equal((await call('commit')).state, 'committed');
  assert.throws(() => server.maintenance.enter('chat'), /maintenance/);
  assert.equal((await call('release')).released, true);
  server.maintenance.enter('chat')();
});
