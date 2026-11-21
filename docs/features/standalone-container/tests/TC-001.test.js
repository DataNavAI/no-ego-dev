import {createCommunicatorServer} from '../../ned-api/tests/auth-client.js';
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
  const app = await startContainerCom({createServer:createCommunicatorServer,host:'127.0.0.1',port:0,databasePath:'/nonexistent/container-test.sqlite'});
  t.after(() => app.close());
  const port = app.server.address().port;
  const originalRequest=request;const signedRequest=(port,headers={},...rest)=>originalRequest(port,{Authorization:'Bearer '+app.apiCredential,...headers},...rest);
  assert.deepEqual(JSON.parse((await signedRequest(port)).body),{status:'ok',service:'nedcom'});
  assert.equal((await signedRequest(port)).status,200);
  assert.equal(JSON.parse((await signedRequest(port,{},'GET','/api/capabilities')).body).capabilities.projects,true);
  assert.equal((await signedRequest(port,{Origin:'http://127.0.0.1:8787'})).status,200);
  assert.equal((await signedRequest(port,{Host:'evil.example'})).status,403);
  assert.equal((await signedRequest(port,{Origin:'https://evil.example'})).status,403);
  assert.equal((await signedRequest(port,{},'POST')).status,405);
  assert.equal((await signedRequest(port,{},'GET','/missing')).status,404);
  await app.close(); assert.equal(app.server.listening,false);
});
test('TC-001: rejects invalid origins before binding', async () => {
  for (const origin of ['https://127.0.0.1:8787','http://evil.example','http://user:pass@localhost','http://localhost/path']) {
    await assert.rejects(startContainerCom({origin}),/loopback HTTP origin/);
  }
});
test('TC-001: partial explicit COM credentials fail before listener creation',async()=>{
  for(const env of [{NED_COM_USERNAME:'owner'},{NED_COM_PASSWORD:'synthetic-password'},{NED_COM_USERNAME:'owner',NED_COM_PASSWORD:''}]){
    let created=false;
    await assert.rejects(startContainerCom({env:{HERMES_DASHBOARD_BASIC_AUTH_USERNAME:'dashboard',HERMES_DASHBOARD_BASIC_AUTH_PASSWORD:'synthetic-dashboard',...env},createServer(){created=true;}}),/both COM username and password/);
    assert.equal(created,false);
  }
});
test('TC-001: upstream unavailable returns 502', async t => {
  const app = await startContainerCom({host:'127.0.0.1',port:0,createServer:() => ({listen:async () => 'http://127.0.0.1:1',close:async () => {}})});
  t.after(() => app.close());
  assert.equal((await request(app.server.address().port)).status,502);
});
