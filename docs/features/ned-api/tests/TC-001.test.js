import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {nedApiPath,exposeNedApiPath} from '../../../../apps/core/src/api-paths.js';
import {apiFixture} from './helpers.js';

for(const kind of ['core','com'])test(`TC-001: ${kind} authenticates every API request before data or work dispatch`,async context=>{
  const fixture=await apiFixture(context,{kind});
  for(const route of ['/api/v1','/api/v1/health','/api/v1/capabilities','/api/v1/projects','/api/v1/workspace/events','/api/v1/activity/events?project='+fixture.projectId,'/api/v1/chat/sessions','/api/v1/secrets','/api/v1/context','/api/v1/task-management','/api/v1/coordinator/reconcile','/api/v1/project-registrations','/api/health','/api/projects','/api/core/v1/projects','/api/v1/unknown']){
    for(const method of ['GET','HEAD','POST']){
      const response=await fixture.request(route,{authenticated:false,method,headers:{origin:fixture.app.url}});
      assert.equal(response.status,401,`${method} ${route}`);assert.match(response.headers.get('www-authenticate'),/^Bearer realm="NED"/);
      const text=await response.text();assert.equal(text.includes(fixture.credential()),false);
    }
  }
  for(const authorization of ['Bearer wrong','Basic '+Buffer.from('ned:wrong').toString('base64'),'Basic !!!']){
    const denied=await fixture.request('/api/v1/health',{headers:{authorization}});assert.equal(denied.status,401);await denied.body.cancel();
  }
  const basic='Basic '+Buffer.from('ned:'+fixture.credential()).toString('base64');
  for(const headers of [{},{authorization:basic}]){
    const health=await fixture.request('/api/v1/health',{headers});assert.deepEqual(await health.json(),{status:'ok',service:'ned-api',version:1});
    const registry=await fixture.request('/api/v1/project-registrations',{headers});assert.equal((await registry.json()).data[0].id,fixture.projectId);
  }
  const removed=await fixture.request('/api/v1/operator/projects');assert.equal(removed.status,404);await removed.body.cancel();
  assert.deepEqual(await fixture.task.getItems(),[]);
  if(kind==='com'){
    const document=await fetch(fixture.app.url);assert.equal(document.status,200);const shell=await document.text();assert.match(shell,/id="access-gate"/);assert.equal(shell.includes(fixture.credential()),false);
    const signedIn=await fetch(fixture.app.url,{headers:{authorization:basic}});assert.equal(signedIn.status,200);await signedIn.body.cancel();
  }
});

test('TC-001: canonical and legacy exposure policy admits authenticated resources and rejects malformed or unknown families',()=>{
  for(const pathname of ['/api/v1/chat/sessions','/api/v1/projects','/api/v1/activity/events?project=id','/api/v1','/api/chat/sessions','/api/health','/app.js'])assert.equal(exposeNedApiPath(pathname),true,pathname);
  for(const pathname of ['/api/v1/operator/projects','/api/v1/operator','/api/v2/health','/api/v1/future-command','/%61pi/v1/operator/context','/api/v1/%6fperator/context','/api/v1/%256fperator/context','/api//v1/operator/context','/api/v1/chat/../operator/context','//api/v1/chat','/api/v1/chat%3f/operator','/api/v1/%ZZ','/api/v1/chat\\operator'])assert.equal(exposeNedApiPath(pathname),false,pathname);
  for(const pathname of ['/api/core/v1/health','/api/v1/context','/api/v1/task-management','/api/v1/project-registrations','/api/v1/projects/id/attempts'])assert.equal(exposeNedApiPath(pathname),true,pathname);
  for(const pathname of ['/api/secrets','/api/secrets/KEY/reveal','/api/v1/secrets','/api/v1/secrets/KEY/reveal']){
    assert.equal(exposeNedApiPath(pathname),true,pathname);
    assert.equal(exposeNedApiPath(pathname,{publicTunnel:true}),true,pathname);
  }
  assert.equal(nedApiPath('/api/v1/project-registrations?cursor=a%2Bb&limit=2').target,'/api/core/v1/projects?cursor=a%2Bb&limit=2');
  assert.equal(nedApiPath('/api/v1/chat/sessions/id/messages?offset=50').target,'/api/chat/sessions/id/messages?offset=50');
});

test('TC-001: actual listener rejects forged origins and raw-path bypasses before dispatch',async context=>{
  const fixture=await apiFixture(context);
  for(const headers of [{host:'evil.test'},{origin:'null'},{origin:'https://evil.test'}]){
    const status=await new Promise((resolve,reject)=>{const request=http.request(fixture.app.url,{path:'/api/v1/health',headers},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});assert.equal(status,403,JSON.stringify(headers));
  }
  for(const pathname of ['/api/v1/%6fperator/context','/api/v1/%256fperator/context','/api/v1//operator/context','/api/v1/chat/../operator/context']){
    const status=await new Promise((resolve,reject)=>{const request=http.request(fixture.app.url,{path:pathname,headers:{authorization:'Bearer '+fixture.credential()}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});
    assert.equal(status,400,pathname);
  }
  const unknown=await fixture.request('/api/v1/not-an-enabled-api');assert.equal(unknown.status,404);await unknown.body.cancel();
});
