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
      const app = await startContainerCom({host:'127.0.0.1',port:0,origin,databasePath:'/nonexistent/container-health.sqlite'});
      t.after(() => app.close());
      const received = [];
      app.server.on('request', req => received.push(req.headers.host));
      const comUrl = `http://127.0.0.1:${app.server.address().port}/api/health`;
      await checkContainerHealth({dashboardUrl,comUrl,origin});
      assert.deepEqual(received,[new URL(origin).host]);
      await assert.rejects(checkContainerHealth({dashboardUrl,comUrl,origin:'http://127.0.0.1:1'}));
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
      await assert.rejects(checkContainerHealth({dashboardUrl:target === 'dashboard' ? bad : healthy,comUrl:target === 'com' ? bad : healthy}));
    });
  }
  await assert.rejects(checkContainerHealth({dashboardUrl:healthy,comUrl:'http://127.0.0.1:1/api/health'}));
});

test('TC-006: a stalled health body obeys the request deadline', {timeout:2000}, async t => {
  const dashboardUrl = await endpoint(t, (_req,res) => res.end('{"ok":true,"auth_required":true}'));
  const comUrl = await endpoint(t, (_req,res) => {res.writeHead(200);res.write('{');});
  await assert.rejects(checkContainerHealth({dashboardUrl,comUrl,timeout:50}), error => error.name === 'TimeoutError' || error.name === 'AbortError');
});
