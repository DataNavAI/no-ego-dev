import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('TC-004: container eval engine enforces owned lifecycle, safe credentials and truthful failures',()=>{
  const root=fileURLToPath(new URL('../../../../',import.meta.url));
  const result=spawnSync('python',['-m','pytest','docs/features/test-suites/tests/container_cases.py','-q'],{cwd:root,env:{...process.env,PYTHONPATH:root},encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/19 passed/);
  assert.doesNotMatch(result.stdout,/\b(?:skipped|xfailed|xpassed)\b/);
});
