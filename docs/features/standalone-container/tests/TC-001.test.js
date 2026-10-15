import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {startContainerCom} from '../../../../scripts/container/com.mjs';

function request(port, headers = {}, method = 'GET', path = '/api/health') {
  return new Promise((resolve,reject) => {
    const req = http.request({host:'127.0.0.1',port,path,method,headers:{Host:'127.0.0.1:8787',...headers}}, res => {
      let body = ''; res.on('data', chunk => {body += chunk;});
      res.on('end', () => resolve({status:res.statusCode,body}));
    });
    req.on('error',reject); req.end();
  });
}
test('TC-001: real COM adapter preserves request policy and closes listeners', async t => {
  const app = await startContainerCom({host:'127.0.0.1',port:0,databasePath:'/nonexistent/container-test.sqlite'});
  t.after(() => app.close());
  const port = app.server.address().port;
  assert.deepEqual(JSON.parse((await request(port)).body),{status:'ok',service:'nedcom'});
  assert.equal((await request(port)).status,200);
  assert.equal(JSON.parse((await request(port,{},'GET','/api/capabilities')).body).capabilities.projects,true);
  assert.equal((await request(port,{Origin:'http://127.0.0.1:8787'})).status,200);
  assert.equal((await request(port,{Host:'evil.example'})).status,403);
  assert.equal((await request(port,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request(port,{},'POST')).status,405);
  assert.equal((await request(port,{},'GET','/missing')).status,404);
  await app.close(); assert.equal(app.server.listening,false);
});
test('TC-001: rejects invalid origins before binding', async () => {
  for (const origin of ['https://127.0.0.1:8787','http://evil.example','http://user:pass@localhost','http://localhost/path']) {
    await assert.rejects(startContainerCom({origin}),/loopback HTTP origin/);
  }
});
test('TC-001: upstream unavailable returns 502', async t => {
  const app = await startContainerCom({host:'127.0.0.1',port:0,createServer:() => ({listen:async () => 'http://127.0.0.1:1',close:async () => {}})});
  t.after(() => app.close());
  assert.equal((await request(app.server.address().port)).status,502);
});
