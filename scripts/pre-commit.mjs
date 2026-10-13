import { spawnSync } from 'node:child_process';

function fail(message) {
  console.error(`NED pre-commit: ${message}`);
  process.exit(1);
}
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) fail('Git state could not be verified.');
  return result.stdout;
}
function requireCandidate() {
  if (spawnSync('git', ['diff', '--quiet']).status !== 0)
    fail('Unstaged changes exist. Stage the intended candidate before committing.');
  if (git(['ls-files', '--others', '--exclude-standard', '-z']).length)
    fail('Untracked files exist. Stage intended files or ignore local artifacts before committing.');
  return git(['write-tree']).trim();
}
const candidate = requireCandidate();
// Hooks export repository-local Git variables. Do not let nested test repos inherit them.
const checkEnv = { ...process.env };
for (const name of git(['rev-parse', '--local-env-vars']).trim().split('\n')) delete checkEnv[name];
if (spawnSync('python', ['-c', 'import pytest, yaml'], { env: checkEnv, stdio: 'ignore' }).status !== 0)
  fail('Activate a Python environment containing pytest and PyYAML.');
for (const script of ['lint', 'test:all']) {
  console.log(`NED pre-commit: npm run ${script}`);
  const result = spawnSync('npm', ['run', script], { env: checkEnv, stdio: 'inherit' });
  if (result.status !== 0) fail(`${script} failed; commit blocked.`);
}
if (requireCandidate() !== candidate) fail('The staged candidate changed during checks; rerun the commit.');
