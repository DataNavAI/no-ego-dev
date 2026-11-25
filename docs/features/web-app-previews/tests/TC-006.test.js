import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {apiFixture,appFixture,mutate,status} from './helpers.js';

test('TC-006: singleton publication and removal never rewrite or automatically register legacy project URLs',{timeout:15000},async context=>{
  const f=await apiFixture(context),app=await appFixture(context);
  const filename=path.join(f.project,'.nedcom.json'),config=JSON.stringify({version:1,previewUrl:`http://127.0.0.1:${app.port}/legacy`});await writeFile(filename,config);
  assert.equal((await status(f)).preview,null);
  await mutate(f,'PUT',{project:f.project,port:app.port,expectedRevision:0});await mutate(f,'DELETE',{expectedRevision:1});
  assert.equal(await readFile(filename,'utf8'),config);assert.equal((await status(f)).preview,null);assert.deepEqual(await f.task.getItems(),[]);
});
