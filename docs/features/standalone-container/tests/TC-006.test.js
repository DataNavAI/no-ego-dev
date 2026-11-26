import {createCommunicatorServer} from '../../ned-api/tests/auth-client.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {startContainerCom} from '../../../../scripts/container/com.mjs';
import {checkContainerHealth} from '../../../../scripts/container/health.mjs';

async function endpoint(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(async () => { await new Promise(resolve => {server.close(resolve); server.closeAllConnections();}); });
  return `http://127.0.0.1:${server.address().port}/api/health`;
}

test('TC-006: health preserves default and remapped COM Host authorities', async t => {
  const dashboardUrl = await endpoint(t, (_req,res) => res.end(JSON.stringify({ok:true,auth_required:true})));
  for (const origin of ['http://127.0.0.1:8787','http://127.0.0.1:8790','http://localhost:8790']) {
    await t.test(origin, async t => {
      const app = await startContainerCom({createServer:createCommunicatorServer,host:'127.0.0.1',port:0,origin,databasePath:'/nonexistent/container-health.sqlite'});
      t.after(() => app.close());
      const received = [];
      app.server.on('request', req => received.push(req.headers.host));
      const comUrl = `http://127.0.0.1:${app.server.address().port}/api/health`;
      await checkContainerHealth({credential:app.apiCredential,dashboardUrl,comUrl,origin});
      assert.deepEqual(received,[new URL(origin).host]);
      await assert.rejects(checkContainerHealth({credential:app.apiCredential,dashboardUrl,comUrl,origin:'http://127.0.0.1:1'}));
    });
  }
});

test('TC-006: unhealthy HTTP and payload responses fail health', async t => {
  const healthy = await endpoint(t, (_req,res) => res.end(JSON.stringify({ok:true,auth_required:true,status:'ok',service:'nedcom'})));
  for (const [name,status,body,target] of [
    ['service unavailable',503,'{}','com'],
    ['invalid JSON',200,'not json','com'],
    ['wrong service',200,'{"status":"ok","service":"other"}','com'],
    ['missing payload',200,'null','com'],
    ['dashboard authentication off',200,'{"ok":true,"auth_required":false}','dashboard'],
  ]) {
    await t.test(name, async t => {
      const bad = await endpoint(t, (_req,res) => {res.writeHead(status);res.end(body);});
      await assert.rejects(checkContainerHealth({credential:'a'.repeat(64),dashboardUrl:target === 'dashboard' ? bad : healthy,comUrl:target === 'com' ? bad : healthy}));
    });
  }
  await assert.rejects(checkContainerHealth({credential:'a'.repeat(64),dashboardUrl:healthy,comUrl:'http://127.0.0.1:1/api/health'}));
});

test('TC-006: a stalled health body obeys the request deadline', {timeout:2000}, async t => {
  const dashboardUrl = await endpoint(t, (_req,res) => res.end('{"ok":true,"auth_required":true}'));
  const comUrl = await endpoint(t, (_req,res) => {res.writeHead(200);res.write('{');});
  await assert.rejects(checkContainerHealth({credential:'a'.repeat(64),dashboardUrl,comUrl,timeout:50}), error => error.name === 'TimeoutError' || error.name === 'AbortError');
});

test('TC-006: a private credential registers the same COM listener and stops the Hub connection on shutdown', async t => {
  const {chmod, mkdtemp, rm, symlink, writeFile} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const home = await mkdtemp(join(tmpdir(), 'ned-container-hub-'));
  t.after(() => rm(home, {recursive: true, force: true}));
  const file = join(home, 'token');
  const token = 'ned_' + 'x'.repeat(32);
  await writeFile(file, token + '\n', {mode: 0o600});
  const env = {NED_ENV: 'staging', NED_INSTANCE_NAME: 'local-container-test', NED_HUB_TOKEN_FILE: file};
  let observed, stops = 0;
  const app = await startContainerCom({env, home, databasePath: join(home, 'ned.sqlite'),
    host: '127.0.0.1', port: 0, connectHub(config, url, options) {
      observed = {config, url, options};
      return {async close() {stops++;}};
    }});
  try {
    assert.equal(observed.config.slug, 'local-container-test');
    assert.equal(observed.config.hub.origin, 'https://staging.hub.datanav.app');
    assert.equal(observed.config.token, token);
    assert.equal(observed.options.apiCredential(), app.apiCredential);
    const response = await fetch(observed.url + '/api/v1/health', {
      headers: {Authorization: 'Bearer ' + app.apiCredential},
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).service, 'ned-api');
  } finally { await app.close(); }
  assert.equal(stops, 1);

  const link = join(home, 'link');
  await symlink(file, link);
  for (const overrides of [{NED_HUB_TOKEN: token}, {NED_INSTANCE_NAME: ''}, {NED_HUB_TOKEN_FILE: link}]) {
    await assert.rejects(startContainerCom({env: {...env, ...overrides}, port: 0}), /private token file/);
  }
  await chmod(file, 0o644);
  await assert.rejects(startContainerCom({env, port: 0}), /private token file/);
});
