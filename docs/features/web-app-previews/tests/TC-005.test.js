import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewService} from '../../../../apps/core/src/preview.js';
import {apiFixture,appFixture,mutate,status} from './helpers.js';

test('TC-005: identical lost-reply retries and tombstones are stable but a stale clear cannot remove a later preview',{timeout:15000},async context=>{
  const f=await apiFixture(context,{kind:'core',backendOnly:true}),app=await appFixture(context);
  const input={project:f.project,port:app.port,expectedRevision:0};const first=await mutate(f,'PUT',input);
  assert.equal((await mutate(f,'PUT',input)).body.preview.id,first.body.preview.id);assert.equal((await status(f)).revision,1);
  const cleared=await mutate(f,'DELETE',{expectedRevision:1});assert.equal(cleared.status,200);assert.equal(cleared.body.revision,2);assert.equal(cleared.body.preview,null);
  assert.deepEqual((await mutate(f,'DELETE',{expectedRevision:1})).body,cleared.body);
  const reopened=createPreviewService({home:f.home,env:f.env,databasePath:f.databasePath});context.after(()=>reopened.close());assert.deepEqual(await reopened.status(),cleared.body);
  const later=await mutate(f,'PUT',{...input,expectedRevision:2});assert.equal(later.body.revision,3);assert.notEqual(later.body.preview.id,first.body.preview.id);
  assert.equal((await mutate(f,'DELETE',{expectedRevision:1})).status,409);assert.equal((await status(f)).preview.id,later.body.preview.id);
});
