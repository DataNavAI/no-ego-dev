import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {nedApiPath,exposeNedApiPath} from '../../../../apps/core/src/api-paths.js';
import {apiFixture} from './helpers.js';

test('TC-001: canonical and legacy exposure policy denies malformed, operator and unknown families',()=>{
  for(const pathname of ['/api/v1/chat/sessions','/api/v1/projects','/api/v1/activity/events?project=id','/api/v1','/api/chat/sessions','/api/health','/app.js'])assert.equal(exposeNedApiPath(pathname),true,pathname);
  for(const pathname of ['/api/v1/operator/projects','/api/v1/operator','/api/core/v1/health','/api/core/v2/health','/api/v2/health','/api/v1/future-command','/%61pi/v1/operator/context','/api/v1/%6fperator/context','/api/v1/%256fperator/context','/api//v1/operator/context','/api/v1/chat/../operator/context','//api/v1/chat','/api/v1/chat%3f/operator','/api/v1/%ZZ','/api/v1/chat\\operator'])assert.equal(exposeNedApiPath(pathname),false,pathname);
  for(const pathname of ['/api/secrets','/api/secrets/KEY/reveal','/api/v1/secrets','/api/v1/secrets/KEY/reveal']){
    assert.equal(exposeNedApiPath(pathname),true,pathname);
    assert.equal(exposeNedApiPath(pathname,{publicTunnel:true}),false,pathname);
  }
  assert.equal(nedApiPath('/api/v1/operator/projects?cursor=a%2Bb&limit=2').target,'/api/core/v1/projects?cursor=a%2Bb&limit=2');
  assert.equal(nedApiPath('/api/v1/chat/sessions/id/messages?offset=50').target,'/api/chat/sessions/id/messages?offset=50');
});

test('TC-001: actual listener rejects forged origins and raw-path bypasses before dispatch',async context=>{
  const fixture=await apiFixture(context);
  for(const headers of [{host:'evil.test'},{origin:'null'},{origin:'https://evil.test'}]){
    const status=await new Promise((resolve,reject)=>{const request=http.request(fixture.app.url,{path:'/api/v1/health',headers},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});assert.equal(status,403,JSON.stringify(headers));
  }
  for(const pathname of ['/api/v1/%6fperator/context','/api/v1/%256fperator/context','/api/v1//operator/context','/api/v1/chat/../operator/context']){
    const status=await new Promise((resolve,reject)=>{const request=http.request(fixture.app.url,{path:pathname},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});
    assert.equal(status,400,pathname);
  }
  const unknown=await fixture.request('/api/v1/not-an-enabled-api');assert.equal(unknown.status,404);await unknown.body.cancel();
});
