import test from 'node:test';
import assert from 'node:assert/strict';
import {apiFixture} from './helpers.js';

test('TC-004: canonical and legacy secret operations share privacy guards and one vault',async context=>{
  const fixture=await apiFixture(context),headers={'x-ned-secrets':'1',origin:fixture.app.url};
  const written=await fixture.request('/api/v1/secrets/SYNTHETIC_KEY',{method:'PUT',headers,body:{value:'synthetic-private-value'}});assert.equal(written.status,200);await written.body.cancel();
  const listed=await fixture.request('/api/secrets',{headers});assert.equal(listed.status,200);const list=await listed.text();assert.ok(list.includes('SYNTHETIC_KEY'));assert.ok(!list.includes('synthetic-private-value'));
  const reveal=await fixture.request('/api/v1/secrets/SYNTHETIC_KEY/reveal',{method:'POST',headers});assert.equal(reveal.status,200);assert.equal((await reveal.json()).value,'synthetic-private-value');
  for(const deniedHeaders of [{origin:fixture.app.url},{'x-ned-secrets':'1'},{...headers,'sec-fetch-site':'cross-site'}]){
    const denied=await fixture.request('/api/v1/secrets/SYNTHETIC_KEY/reveal',{method:'POST',headers:deniedHeaders});assert.equal(denied.status,403);assert.ok(!(await denied.text()).includes('synthetic-private-value'));
  }
  const removed=await fixture.request('/api/secrets/SYNTHETIC_KEY',{method:'DELETE',headers});assert.equal(removed.status,200);await removed.body.cancel();
  const missing=await fixture.request('/api/v1/secrets/SYNTHETIC_KEY/reveal',{method:'POST',headers});assert.equal(missing.status,404);await missing.body.cancel();
  const disabled=await apiFixture(context,{secretsEnabled:false});
  for(const route of ['/api/secrets','/api/v1/secrets']){const response=await disabled.request(route,{headers:{'x-ned-secrets':'1'}});assert.equal(response.status,403);await response.body.cancel();}
});
