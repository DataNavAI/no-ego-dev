import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('durable V1 documentation freezes the Daytona CLI lifecycle contract', () => {
  const docs = Object.fromEntries([
    'README.md',
    'docs/ned-create/PRD.md',
    'docs/ned-create/CUJ.md',
    'docs/ned-create/TECH_SPEC.md',
    'docs/ned-create/INSTALL.md',
    'docs/ned-create/QUICKSTART.md',
    '.projects/no-ego-dev/qa/features/ned-create-test-plan.md',
  ].map((relativePath) => [relativePath, read(relativePath)]));

  assert.match(docs['README.md'], /curl -fsSL https:\/\/raw\.githubusercontent\.com\/DataNavAI\/no-ego-dev\/main\/scripts\/install\.sh \| bash/);
  assert.match(docs['README.md'], /after installation, run `ned create` yourself/);

  for (const [relativePath, content] of Object.entries(docs)) {
    assert.match(content, /Daytona/iu, `${relativePath} must identify the V1 compute provider`);
    assert.doesNotMatch(content, /15-minute stop|15 minutes? stop|auto-stop.*15/iu, `${relativePath} must not describe the retired stop policy`);
  }

  for (const relativePath of [
    'docs/ned-create/PRD.md',
    'docs/ned-create/CUJ.md',
    'docs/ned-create/TECH_SPEC.md',
    'docs/ned-create/INSTALL.md',
    'docs/ned-create/QUICKSTART.md',
    '.projects/no-ego-dev/qa/features/ned-create-test-plan.md',
  ]) {
    const content = docs[relativePath];
    assert.match(content, /auto-stop[^\n]{0,32}0/iu, `${relativePath} must preserve always-on default`);
    assert.match(content, /ChatGPT.*OAuth|OAuth.*ChatGPT/iu, `${relativePath} must preserve ChatGPT OAuth default`);
    assert.match(content, /OpenRouter.*not required|OpenRouter.*not prompted|not required.*OpenRouter|no OpenRouter requirement/iu, `${relativePath} must not require OpenRouter`);
    assert.match(content, /runtime.*(?:Daytona SDK )?environment|Daytona SDK environment.*runtime/iu, `${relativePath} must keep Telegram token injection runtime-only`);
  }

  for (const relativePath of [
    'docs/ned-create/PRD.md',
    'docs/ned-create/CUJ.md',
    'docs/ned-create/TECH_SPEC.md',
  ]) {
    assert.match(docs[relativePath], /V2, not V1, may add (?:hosted )?browser.*AWS/isu, `${relativePath} must park browser-hosted AWS onboarding in V2`);
  }

  const browserPlan = read('docs/ned-create/BROWSER_PROVISIONING_IMPLEMENTATION_PLAN.md');
  assert.match(browserPlan, /V2/iu);
  assert.match(browserPlan, /not.*V1|rather than V1/iu);
});
