import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-037: new chat boots the served application, creates once, streams before completion and reopens persisted messages',{timeout:45000},async t=>{
  const chat=await browserChat(t,{edgeFixedFailures:1});await chat.ready();
  assert.equal(chat.network.filter(path=>path==='/api/chat/sessions/fixed').length,2);
  await expect(chat.page.locator('#transcript article')).toHaveCount(0);
  assert.equal(chat.requests.filter(row=>row.method==='POST'&&row.url==='/api/sessions').length,1);
  await chat.send('First message from a new chat');
  assert.equal(chat.turns.length,1);assert.equal(chat.messages.length,2);
  await expect(chat.page.locator('#transcript article')).toHaveCount(2);
  assert.equal(chat.network.filter(path=>/\/turns\/[^/]+\/events$/.test(path)).length,1);
  assert.equal(chat.network.filter(path=>/\/turns\/[^/]+$/.test(path)).length,0);
  await chat.page.reload();await chat.ready();
  await expect(chat.page.locator('#transcript article')).toHaveCount(2);
  await expect(chat.page.locator('#transcript')).toContainText('First message from a new chat');
  await expect(chat.page.locator('#transcript .message-content strong')).toHaveText('Completed reply 1');
  assert.equal(chat.requests.filter(row=>row.method==='POST'&&row.url==='/api/sessions').length,1);
  assert.equal(chat.turns.length,1);assert.deepEqual(chat.errors,[]);
});
