import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startCom} from '../../src/com/server.js';

test('PDF can be framed by its same-origin reader while other artifacts remain unframeable',async t=>{
 const root=await mkdtemp(join(tmpdir(),'com-pdf-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'page.pdf'),'%PDF-1.4\n');await writeFile(join(root,'report.md'),'# Report');
 const app=await startCom({root,local:true});t.after(()=>app.close());
 for(const [file,ancestors] of [['page.pdf',"'self'"],['report.md',"'none'"]]){
  const raw=new URL('api/artifact',app.url);raw.searchParams.set('path',file);
  const response=await fetch(raw);assert.equal(response.status,200);
  assert.ok(response.headers.get('content-security-policy').includes('frame-ancestors '+ancestors));
  assert.ok(response.headers.get('content-security-policy').includes("default-src 'none'"));
 }
 const shell=await fetch(app.url);assert.ok(shell.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
});
