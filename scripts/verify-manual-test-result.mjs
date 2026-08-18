#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const baseSha = process.env.MANUAL_TEST_BASE_SHA;
const headSha = process.env.MANUAL_TEST_HEAD_SHA || 'HEAD';
const evidencePath = '.github/manual-test-result.json';
const documentationOnly = (path) => (
  path === evidencePath
  || path.startsWith('docs/')
  || path.startsWith('README')
  || path.startsWith('CHANGELOG')
  || path.startsWith('LICENSE')
  || path.endsWith('.md')
  || path.endsWith('.txt')
);

if (!baseSha) throw new Error('MANUAL_TEST_BASE_SHA is required');
const changed = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], { encoding: 'utf8' })
  .split('\n').map((path) => path.trim()).filter(Boolean);
const codeChanges = changed.filter((path) => !documentationOnly(path));
if (codeChanges.length === 0) {
  console.log('Manual test gate: documentation-only change; fresh manual result not required.');
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
} catch (error) {
  throw new Error(`Manual test gate: ${evidencePath} is required for code changes (${error.message})`);
}

const requiredStrings = ['candidate_sha', 'tested_at', 'environment', 'observations'];
for (const field of requiredStrings) {
  if (typeof evidence[field] !== 'string' || evidence[field].trim() === '') {
    throw new Error(`Manual test gate: ${evidencePath}.${field} must be a non-empty string`);
  }
}
if (evidence.result !== 'pass') throw new Error(`Manual test gate: result must be "pass", got ${JSON.stringify(evidence.result)}`);
if (!Array.isArray(evidence.commands) || evidence.commands.length === 0 || evidence.commands.some((command) => typeof command !== 'string' || !command.trim())) {
  throw new Error(`Manual test gate: ${evidencePath}.commands must contain at least one command`);
}
const testedAt = Date.parse(evidence.tested_at);
if (!Number.isFinite(testedAt) || testedAt > Date.now() + 5 * 60 * 1000) {
  throw new Error(`Manual test gate: tested_at must be a valid non-future ISO timestamp`);
}
const latestCodeSha = execFileSync('git', ['log', '-1', '--format=%H', headSha, '--', ...codeChanges], { encoding: 'utf8' }).trim();
if (!latestCodeSha) throw new Error('Manual test gate: could not identify the latest code-change commit');
if (evidence.candidate_sha !== latestCodeSha) {
  throw new Error(`Manual test gate: candidate_sha ${evidence.candidate_sha} does not match latest code-change commit ${latestCodeSha}; rerun the manual test after the latest code change`);
}
console.log(`Manual test gate: PASS for ${latestCodeSha}`);
console.log(`Changed code paths: ${codeChanges.join(', ')}`);
