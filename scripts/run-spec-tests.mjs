import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function selectSpecTests(args = [], featuresRoot = path.join(root, 'docs/features')) {
  const filters = { feature: [], case: [], journey: [] };
  let all = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') {
      all = true;
      continue;
    }
    const key = args[i].slice(2);
    if (
      !args[i].startsWith('--') ||
      !(key in filters) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error(
        'Usage: test:spec [--all | --feature <name> --case <TC-id> --journey <CUJ-id>]',
      );
    filters[key].push(...args[++i].split(','));
  }
  if (all && Object.values(filters).some((list) => list.length))
    throw new Error('--all cannot be combined with selectors.');
  const entries = await readdir(featuresRoot, { withFileTypes: true });
  const features = [];
  for (const entry of entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    let spec;
    try {
      spec = await readFile(path.join(featuresRoot, entry.name, 'SPEC.md'), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Feature ${entry.name} is missing SPEC.md.`, { cause: error });
      throw error;
    }
    const blocks = [
      ...spec.matchAll(/^### (TC-\d{3}):[^\n]*\n([\s\S]*?)(?=^### TC-|^## |$(?![\s\S]))/gm),
    ];
    if (!blocks.length) throw new Error(`Feature ${entry.name} has no declared test cases.`);
    const ids = blocks.map((match) => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate case ID in ${entry.name}.`);
    const cases = [];
    for (const match of blocks) {
      const manual = /^- Level \/ automation: manual(?:[;.]|$)/m.test(match[2]);
      const journeys = (
        match[2].split('\n').find((line) => line.includes('Journey / requirements:')) || ''
      ).match(/CUJ-\d{3}/g) || [];
      if (manual) {
        cases.push({ feature: entry.name, id: match[1], journeys, manual: true });
        continue;
      }
      const file = path.join(featuresRoot, entry.name, 'tests', `${match[1]}.test.js`);
      try {
        await access(file);
      } catch {
        throw new Error(`Missing automated spec case: ${entry.name}/${match[1]}.`);
      }
      const source = await readFile(file, 'utf8');
      if (!source.includes(`test('${match[1]}:`) && !source.includes(`test("${match[1]}:`))
        throw new Error(`Case ${entry.name}/${match[1]} has no named TC test.`);
      const journeyLine =
        match[2].split('\n').find((line) => line.includes('Journey / requirements:')) || '';
      cases.push({
        feature: entry.name,
        id: match[1],
        file,
        journeys: journeyLine.match(/CUJ-\d{3}/g) || [],
      });
    }
    const files = await readdir(path.join(featuresRoot, entry.name, 'tests')).catch((error) => {
      if (error.code === 'ENOENT' && cases.every((entry) => entry.manual)) return [];
      throw error;
    });
    for (const file of files) {
      if (cases.some((entry) => entry.manual && file === `${entry.id}.test.js`))
        throw new Error(`Manual case has an automated file: ${entry.name}/${file}`);
      if (/^TC-.*\.test\.js$/.test(file) && !ids.includes(file.replace('.test.js', '')))
        throw new Error(`Undeclared test case: ${entry.name}/${file}`);
    }
    features.push({ name: entry.name, cases });
  }
  for (const feature of filters.feature)
    if (!features.some((entry) => entry.name === feature))
      throw new Error(`Unknown feature: ${feature}`);
  const scope = features
    .filter((entry) => !filters.feature.length || filters.feature.includes(entry.name))
    .flatMap((entry) => entry.cases);
  for (const id of filters.case)
    if (!scope.some((entry) => entry.id === id)) throw new Error(`Unknown case: ${id}`);
  for (const id of filters.journey)
    if (!scope.some((entry) => entry.journeys.includes(id)))
      throw new Error(`Unknown journey: ${id}`);
  const matching = scope.filter(
    (entry) =>
      (!filters.case.length || filters.case.includes(entry.id)) &&
      (!filters.journey.length || entry.journeys.some((id) => filters.journey.includes(id))),
  );
  const selected = matching.filter((entry) => !entry.manual);
  selected.manualCases = matching.filter((entry) => entry.manual);
  if (!selected.length) throw new Error('No matching automated spec cases; manual cases require separate evaluation.');
  return selected;
}

export function specExecutionPassed(status, output, caseId) {
  return (
    status === 0 &&
    (!caseId || new RegExp(`^ok \\d+ - ${caseId}:`, 'm').test(output)) &&
    /^# fail 0$/m.test(output) &&
    /^# tests [1-9]\d*$/m.test(output) &&
    !/^# (?:skipped|cancelled|todo) [1-9]\d*$/m.test(output)
  );
}

export async function runSpecTests(args = [], featuresRoot) {
  const selected = await selectSpecTests(args, featuresRoot);
  if (selected.manualCases.length)
    process.stdout.write(
      `Manual cases NOT RUN: ${selected.manualCases.map((entry) => `${entry.feature}/${entry.id}`).join(', ')}; separate evidence required.\n`,
    );
  process.stdout.write(
    `Spec gate: ${selected.map((entry) => `${entry.feature}/${entry.id}`).join(', ')}\n`,
  );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  // Validate each file independently: another TC or a helper must not mask missing execution.
  for (const entry of selected) {
    const child = spawn(
      process.execPath,
      ['--test', '--test-reporter=tap', entry.file],
      { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.pipe(process.stderr);
    const status = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code, signal) => resolve(signal ? 1 : code));
    });
    if (!specExecutionPassed(status, output, entry.id)) {
      process.stderr.write(
        `Spec gate failed: ${entry.feature}/${entry.id} must execute its named TC and pass without skips, cancellations, or TODOs.\n`,
      );
      return 1;
    }
  }

  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runSpecTests(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
