import assert from 'node:assert/strict';
import { chmod, cp, lstat, mkdtemp, mkdir, readFile, readdir, readlink, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const productionInstaller = path.join(repoRoot, 'scripts/install.sh');
const readme = path.join(repoRoot, 'README.md');
const installDoc = path.join(repoRoot, 'docs/ned-create/INSTALL.md');
const syntheticSecret = 'synthetic-daytona-test-key';
const revision = '944d9b491f4e6b595adc4495d1d3299e34c92a96';
const pathBlock = '# >>> NED user commands >>>\nexport PATH="$HOME/.local/bin:$PATH"\n# <<< NED user commands <<<';

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function exists(file) {
  try { await lstat(file); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function snapshot(file) {
  if (!await exists(file)) return null;
  const info = await lstat(file);
  if (info.isSymbolicLink()) return { type: 'link', target: await readlink(file) };
  if (info.isDirectory()) {
    const entries = {};
    for (const name of (await readdir(file)).sort()) entries[name] = await snapshot(path.join(file, name));
    return { type: 'dir', entries };
  }
  return { type: 'file', mode: info.mode & 0o777, sha256: await sha256(file) };
}

async function makeHarness({ spaces = false, system = 'Linux', machine = process.arch === 'arm64' ? 'aarch64' : 'x86_64' } = {}) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'ned-installer-test-'));
  const root = spaces ? path.join(base, 'space root') : base;
  if (spaces) await mkdir(root);
  const home = path.join(root, 'home');
  const fixtures = path.join(root, 'fixtures');
  const fakeBin = path.join(root, 'bin');
  const tmpDir = path.join(root, 'tmp');
  await Promise.all([mkdir(home), mkdir(fixtures), mkdir(fakeBin), mkdir(tmpDir)]);

  const platform = `${system === 'Darwin' ? 'darwin' : 'linux'}-${machine === 'arm64' || machine === 'aarch64' ? 'arm64' : 'x64'}`;
  const nodeRoot = path.join(root, `node-v-test-${platform}`);
  await mkdir(path.join(nodeRoot, 'bin'), { recursive: true });
  await writeFile(path.join(nodeRoot, 'bin', 'node'), `#!/usr/bin/env bash\nset -eu\nif [[ \${1-} == --version ]]; then echo v22.14.0; exit 0; fi\n[[ "\$*" != *'${syntheticSecret}'* ]] || { echo credential-in-argv >&2; exit 40; }\nif [[ "\$*" == *'create --dry-run --json'* ]]; then printf '{"dryRun":true}\\n'; exit 0; fi\n[[ \${DAYTONA_API_KEY-} == '${syntheticSecret}' ]] || { echo credential-missing >&2; exit 41; }\n[[ \${NED_TEST_CREATE_FAIL-} != 1 ]] || { echo synthetic-create-failure >&2; exit 43; }\nprintf 'ned-create:%s\\n' "\${2-}" >> "$HOME/create.log"\n`);
  await chmod(path.join(nodeRoot, 'bin', 'node'), 0o755);
  await writeFile(path.join(nodeRoot, 'bin', 'npm'), '#!/usr/bin/env bash\nset -eu\n[[ ${1-} == ci ]]\n[[ $(command -v node) == "${BASH_SOURCE[0]%/*}/node" ]] || { echo system-node-used >&2; exit 42; }\ntouch .dependencies-installed\n');
  await chmod(path.join(nodeRoot, 'bin', 'npm'), 0o755);
  const nodeArchive = path.join(fixtures, 'node.tar.gz');
  let result = spawnSync('tar', ['-czf', nodeArchive, '-C', root, path.basename(nodeRoot)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  const sourceRoot = path.join(root, 'no-ego-dev-test');
  await mkdir(path.join(sourceRoot, 'bin'), { recursive: true });
  await mkdir(path.join(sourceRoot, 'src'), { recursive: true });
  await writeFile(path.join(sourceRoot, 'bin', 'ned.js'), '// synthetic fixture\n');
  await cp(path.join(repoRoot, 'src', 'telegram.js'), path.join(sourceRoot, 'src', 'telegram.js'));
  await cp(path.join(repoRoot, 'bin', 'ned-launcher.js'), path.join(sourceRoot, 'bin', 'ned-launcher.js'));
  await cp(path.join(repoRoot, 'src', 'launcher.js'), path.join(sourceRoot, 'src', 'launcher.js'));
  await mkdir(path.join(sourceRoot, 'src', 'web', 'public'), { recursive: true });
  await cp(path.join(repoRoot, 'src', 'web', 'public', 'docs'), path.join(sourceRoot, 'src', 'web', 'public', 'docs'), { recursive: true });
  await writeFile(path.join(sourceRoot, 'package.json'), '{"name":"no-ego-dev-test","type":"module"}\n');
  await writeFile(path.join(sourceRoot, 'package-lock.json'), '{"lockfileVersion":3}\n');
  const sourceArchive = path.join(fixtures, 'ned.tar.gz');
  result = spawnSync('tar', ['-czf', sourceArchive, '-C', root, path.basename(sourceRoot)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  const curlLog = path.join(root, 'curl.log');
  const curl = path.join(fakeBin, 'curl');
  await writeFile(curl, `#!/usr/bin/env bash\nset -eu\nout=\nurl=\nwhile (( $# )); do\n  case "$1" in -o) out=$2; shift 2;; -*) shift;; *) url=$1; shift;; esac\ndone\nprintf '%s\\n' "$url" >> '${curlLog}'\nif [[ \${NED_TEST_CURL_DELAY-} == 1 ]]; then : >'${path.join(root, 'curl-started')}'; sleep 2; fi\ncase "$url" in https://fixtures/node) cp '${nodeArchive}' "$out";; https://fixtures/ned) cp '${sourceArchive}' "$out";; *) exit 22;; esac\n`);
  await chmod(curl, 0o755);
  await writeFile(path.join(fakeBin, 'uname'), `#!/usr/bin/env bash\n[[ \${1-} == -s ]] && echo ${system} || echo ${machine}\n`);
  await chmod(path.join(fakeBin, 'uname'), 0o755);
  const nativeModeStat = process.platform === 'darwin' ? '/usr/bin/stat -f %Lp' : '/usr/bin/stat -c %a';
  const expectedStatArgs = system === 'Darwin'
    ? '[[ ${1-} == -f && ${2-} == %Lp ]] || exit 2'
    : '[[ ${1-} == -c && ${2-} == %a ]] || exit 2';
  await writeFile(path.join(fakeBin, 'stat'), `#!/usr/bin/env bash\nset -eu\n${expectedStatArgs}\n${nativeModeStat} "\$3"\n`);
  await chmod(path.join(fakeBin, 'stat'), 0o755);
  const profileTempModeLog = path.join(root, 'profile-temp-modes.log');
  await writeFile(path.join(fakeBin, 'mktemp'), `#!/usr/bin/env bash\nset -eu\ncreated=$(/usr/bin/mktemp "$@")\ncase "$created" in "$HOME/.profile.ned."*|"$HOME/.zprofile.ned."*|"$HOME/.bashrc.ned."*) mode=$(${nativeModeStat} "$created"); printf 'created:%s\\n' "$mode" >>'${profileTempModeLog}';; esac\nprintf '%s\\n' "$created"\n`);
  await chmod(path.join(fakeBin, 'mktemp'), 0o755);
  await writeFile(path.join(fakeBin, 'mv'), `#!/usr/bin/env bash\nset -eu\nsource=\${@: -2:1}\ndestination=\${@: -1}\ncase "$destination" in "$HOME/.profile"|"$HOME/.zprofile"|"$HOME/.bashrc") source_mode=$(${nativeModeStat} "$source"); if [[ -e "$destination" ]]; then destination_mode=$(${nativeModeStat} "$destination"); else destination_mode=600; fi; printf 'final:%s:%s\\n' "$source_mode" "$destination_mode" >>'${profileTempModeLog}'; [[ "$source_mode" == "$destination_mode" ]] || exit 91;; esac\nexec /bin/mv "$@"\n`);
  await chmod(path.join(fakeBin, 'mv'), 0o755);

  let text = await readFile(productionInstaller, 'utf8');
  text = text
    .replace(/node_url="[^"]+"/, 'node_url="https://fixtures/node"')
    .replace(/source_url="[^"]+"/, 'source_url="https://fixtures/ned"')
    .replace(new RegExp(`${platform.replace('-', '\\-')}\\) node_sha=[a-f0-9]{64}`), `${platform}) node_sha=${await sha256(nodeArchive)}`)
    .replace(/NED_SOURCE_SHA256=[a-f0-9]{64}/, `NED_SOURCE_SHA256=${await sha256(sourceArchive)}`)
    .replace("if [[ -t 0 && -r /dev/tty ]]; then", 'if true; then')
    .replace("IFS= read -r -s -p 'Daytona API key (input hidden): ' DAYTONA_API_KEY </dev/tty", 'IFS= read -r -s DAYTONA_API_KEY')
    .replace("printf '\\n' >/dev/tty", "printf '\\n'");
  const installer = path.join(root, 'install-under-test.sh');
  await writeFile(installer, text, { mode: 0o700 });

  return { root, home, curlLog, profileTempModeLog, installer, platform, env: { HOME: home, TMPDIR: tmpDir, PATH: `${fakeBin}:/usr/bin:/bin` } };
}

function runInstaller(harness, env = {}, input = `${syntheticSecret}\n`, installer = harness.installer) {
  return spawnSync('/bin/bash', [installer], { env: { ...harness.env, ...env }, input, encoding: 'utf8' });
}

async function activeGeneration(harness) {
  const current = path.join(harness.home, '.local/share/ned/current');
  return path.resolve(path.dirname(current), await readlink(current));
}

async function makeInstallerVariant(harness, replacements) {
  let text = await readFile(harness.installer, 'utf8');
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  const variant = path.join(harness.root, `variant-${Math.random().toString(16).slice(2)}.sh`);
  await writeFile(variant, text, { mode: 0o700 });
  return variant;
}

for (const file of [readme, installDoc]) {
  test(`${path.relative(repoRoot, file)} documents the canonical repository installer`, async () => {
    const text = await readFile(file, 'utf8');
    assert.match(text, /curl -fsSL https:\/\/raw\.githubusercontent\.com\/DataNavAI\/no-ego-dev\/main\/scripts\/install\.sh \| bash/);
    assert.match(text, /pinned private runtime and NED downloads/);
  });
}

test('production installer contains no runtime test override or integrity bypass', async () => {
  const text = await readFile(productionInstaller, 'utf8');
  assert.doesNotMatch(text, /NED_INSTALLER_TEST|NED_NODE_URL|NED_NODE_SHA256|NED_SOURCE_URL|NED_TEST_SOURCE_SHA256|NED_INSTALLER_PLATFORM|NED_INSTALLER_DRY_RUN/);
});

test('Node launcher contains the credential boundary and delegates version without credentials', async () => {
  const text = await readFile(path.join(repoRoot, 'src/launcher.js'), 'utf8');
  assert.match(text, /DAYTONA_API_KEY/);
  assert.match(text, /no-ego-dev\/daytona/);
  assert.match(text, /--version/);
  assert.doesNotMatch(text, /readline\.question\([^)]*DAYTONA_API_KEY/);
});

test('clean-home install uses private Node, publishes a manifest-backed generation, repairs all shell profiles, and tells the user to run create', async () => {
  const harness = await makeHarness();
  await writeFile(path.join(harness.home, '.profile'), '# Documentation: ~/.local/bin is intentionally not on PATH\n', { mode: 0o600 });
  await writeFile(path.join(harness.home, '.zprofile'), '# private zsh configuration\n', { mode: 0o640 });
  await writeFile(path.join(harness.home, '.bashrc'), '# public bash configuration\n', { mode: 0o644 });
  const result = runInstaller(harness);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(syntheticSecret));
  assert.match(result.stdout, /Next step: run `ned create`/);
  assert.match(result.stdout, /--verbose/);
  assert.equal(await exists(path.join(harness.home, 'create.log')), false);
  assert.equal(await exists(path.join(harness.home, '.config/ned/daytona-api-key')), false);
  const generation = await activeGeneration(harness);
  assert.equal(await exists(path.join(generation, 'install-manifest')), true);
  for (const [profile, mode] of [['.profile', 0o600], ['.zprofile', 0o640], ['.bashrc', 0o644]]) {
    const profilePath = path.join(harness.home, profile);
    const text = await readFile(profilePath, 'utf8');
    assert.equal(text.split(pathBlock).length - 1, 1, profile);
    assert.equal((await stat(profilePath)).mode & 0o777, mode, `${profile} mode`);
  }
  assert.deepEqual((await readFile(harness.profileTempModeLog, 'utf8')).trim().split('\n'), [
    'created:600', 'final:600:600',
    'created:600', 'final:640:640',
    'created:600', 'final:644:644',
  ]);
  const bash = spawnSync('/bin/bash', ['--noprofile', '--rcfile', path.join(harness.home, '.bashrc'), '-ic', 'command -v ned'], {
    env: { HOME: harness.home, PATH: '/usr/bin:/bin' }, encoding: 'utf8',
  });
  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout.trim(), path.join(harness.home, '.local/bin/ned'));
});

test('clean macOS arm64 and Ubuntu amd64/arm64 installs and reruns preserve BotFather copy and CLI-linked docs', async () => {
  for (const target of [
    { name: 'macOS arm64', system: 'Darwin', machine: 'arm64' },
    { name: 'Ubuntu amd64', system: 'Linux', machine: 'x86_64' },
    { name: 'Ubuntu arm64', system: 'Linux', machine: 'aarch64' },
  ]) {
    const harness = await makeHarness(target);
    const first = runInstaller(harness);
    assert.equal(first.status, 0, `${target.name}: ${first.stderr}`);
    const rerun = runInstaller(harness, {}, '');
    assert.equal(rerun.status, 0, `${target.name}: stdout=${rerun.stdout} stderr=${rerun.stderr}`);
    assert.match(rerun.stdout, /already installed/i, target.name);
    assert.equal(await exists(path.join(harness.home, 'create.log')), false, target.name);

    const generation = await activeGeneration(harness);
    const telegramModule = pathToFileURL(path.join(generation, 'app', 'src', 'telegram.js')).href;
    const probe = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { acquireTelegramConnection, QUICKSTART_DOCS_URL, TELEGRAM_DOCS_URL, CREDENTIALS_DOCS_URL } from ${JSON.stringify(telegramModule)};
      const lines=[];
      const token = '1'.repeat(10) + ':' + 'A'.repeat(35);
      await acquireTelegramConnection({
        platform: 'linux',
        log: (line) => lines.push(line),
        readStoredToken: async () => null,
        openExternal: async () => {},
        promptHidden: async () => token,
        fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, result: { id: 1, is_bot: true, username: 'clean_matrix_bot' } }) }),
      });
      console.log(JSON.stringify({ lines, urls: [QUICKSTART_DOCS_URL, TELEGRAM_DOCS_URL, CREDENTIALS_DOCS_URL] }));
    `], { encoding: 'utf8' });
    assert.equal(probe.status, 0, `${target.name}: ${probe.stderr}`);
    const contract = JSON.parse(probe.stdout);
    assert.deepEqual(contract.lines.slice(-5), [
      '1. Open BotFather: https://t.me/BotFather',
      '2. Send /newbot.',
      '3. Choose a display name for the disposable bot.',
      '4. Choose a unique username ending in bot.',
      '5. Copy the token. NED will ask for it next with hidden input.',
    ], target.name);
    assert.deepEqual(contract.urls, [
      'https://ned.datanav.app/docs/v1/quickstart/',
      'https://ned.datanav.app/docs/v1/telegram/',
      'https://ned.datanav.app/docs/v1/credentials/',
    ], target.name);
    for (const route of ['quickstart', 'telegram', 'credentials']) {
      assert.equal(await exists(path.join(generation, 'app', 'src', 'web', 'public', 'docs', 'v1', route, 'index.html')), true, `${target.name}: ${route}`);
    }
  }
});

test('completed rerun repairs removed PATH blocks before returning without redownload or recreate', async () => {
  const harness = await makeHarness();
  assert.equal(runInstaller(harness).status, 0);
  await writeFile(path.join(harness.home, '.bashrc'), '# reset by user\n');
  const rerun = runInstaller(harness, {}, '');
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.match(rerun.stdout, /already installed/i);
  assert.equal((await readFile(harness.curlLog, 'utf8')).trim().split('\n').length, 2);
  assert.equal(await exists(path.join(harness.home, 'create.log')), false);
  assert.equal((await readFile(path.join(harness.home, '.bashrc'), 'utf8')).split(pathBlock).length - 1, 1);
});

test('stale installation lock fails closed with actionable recovery guidance', async () => {
  const harness = await makeHarness();
  const lock = `/tmp/ned-install-${process.getuid()}.lock`;
  await writeFile(lock, '99999999\n', { mode: 0o600 });
  try {
    const result = runInstaller(harness);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /stale lock.*remove it only after confirming/i);
  } finally {
    await rm(lock, { force: true });
  }
});

test('two genuinely concurrent installers serialize across different TMPDIR values', async () => {
  const harness = await makeHarness();
  const otherTmp = path.join(harness.root, 'other tmp');
  await mkdir(otherTmp);
  const first = spawn('/bin/bash', [harness.installer], {
    env: { ...harness.env, NED_TEST_CURL_DELAY: '1' }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let firstStderr = '';
  first.stderr.on('data', (chunk) => { firstStderr += chunk; });
  first.stdout.resume();
  first.stdin.end(`${syntheticSecret}\n`);
  for (let attempt = 0; attempt < 100 && !await exists(path.join(harness.root, 'curl-started')); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(await exists(path.join(harness.root, 'curl-started')), true, 'first installer did not reach delayed download');
  const second = runInstaller(harness, { TMPDIR: otherTmp });
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /another installation is in progress/i);
  const firstStatus = await new Promise((resolve) => first.once('close', resolve));
  assert.equal(firstStatus, 0, firstStderr);
});

test('TERM after trap setup exits 143 and leaves no active or partial installation', async () => {
  const harness = await makeHarness();
  const interrupted = await makeInstallerVariant(harness, [[
    "trap 'cleanup 143' TERM",
    "trap 'cleanup 143' TERM\nkill -TERM $$$$",
  ]]);
  const before = await snapshot(harness.home);
  const result = runInstaller(harness, {}, '', interrupted);
  assert.equal(result.status, 143, result.stderr);
  assert.deepEqual(await snapshot(harness.home), before);
  assert.equal(await exists(`/tmp/ned-install-${process.getuid()}.lock`), false);
});

test('space-containing HOME and TMPDIR complete installation', async () => {
  const harness = await makeHarness({ spaces: true });
  const result = runInstaller(harness);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await exists(path.join(harness.home, '.local/bin/ned')), true);
});

test('caller umask 000 cannot make installer state or profiles world-readable', async () => {
  const harness = await makeHarness();
  const result = spawnSync('/bin/bash', ['-c', 'umask 000; exec /bin/bash "$1"', 'installer', harness.installer], {
    env: harness.env,
    input: `${syntheticSecret}\n`,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  for (const profile of ['.profile', '.zprofile', '.bashrc']) {
    assert.equal((await stat(path.join(harness.home, profile))).mode & 0o777, 0o600);
  }
});

test('clean integrity failure leaves runtime, app, launcher, pointers, markers, profiles, and credential absent', async () => {
  const harness = await makeHarness();
  const before = await snapshot(harness.home);
  const bad = await makeInstallerVariant(harness, [[
    new RegExp(`${harness.platform.replace('-', '\\-')}\\) node_sha=[a-f0-9]{64}`),
    `${harness.platform}) node_sha=${'0'.repeat(64)}`,
  ]]);
  const result = runInstaller(harness, {}, syntheticSecret, bad);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /integrity verification failed/i);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(syntheticSecret));
  assert.deepEqual(await snapshot(harness.home), before);
});

test('failed upgrade integrity leaves a seeded complete installation byte-for-byte active and usable', async () => {
  const harness = await makeHarness();
  assert.equal(runInstaller(harness).status, 0);
  const before = await snapshot(path.join(harness.home, '.local'));
  const nextRevision = '4'.repeat(40);
  const badUpgrade = await makeInstallerVariant(harness, [
    [new RegExp(revision, 'g'), nextRevision],
    [/NED_SOURCE_SHA256=[a-f0-9]{64}/, `NED_SOURCE_SHA256=${'0'.repeat(64)}`],
  ]);
  const result = runInstaller(harness, {}, '', badUpgrade);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /integrity verification failed/i);
  assert.deepEqual(await snapshot(path.join(harness.home, '.local')), before);
  const doctor = spawnSync(path.join(harness.home, '.local/bin/ned'), ['doctor'], {
    env: { ...harness.env, DAYTONA_API_KEY: syntheticSecret }, encoding: 'utf8',
  });
  assert.equal(doctor.status, 0, doctor.stderr);
});

test('reuse revalidates private Node, complete app tree, and launcher integrity and reinstalls on mismatch', async () => {
  for (const target of ['runtime', 'app-entry', 'app-source', 'launcher']) {
    const harness = await makeHarness();
    assert.equal(runInstaller(harness).status, 0);
    const generation = await activeGeneration(harness);
    const file = target === 'runtime' ? path.join(generation, 'runtime/bin/node')
      : target === 'app-entry' ? path.join(generation, 'app/bin/ned.js')
        : target === 'app-source' ? path.join(generation, 'app/src/cli.js')
          : path.join(harness.home, '.local/bin/ned');
    await writeFile(file, '# corrupted\n', { mode: 0o755 });
    const result = runInstaller(harness, {}, '');
    assert.equal(result.status, 0, `${target}: ${result.stderr}`);
    assert.equal((await readFile(harness.curlLog, 'utf8')).trim().split('\n').length, 4, target);
    assert.match(result.stdout, /integrity mismatch|reinstall/i);
  }
});

test('installer never asks for credentials or runs create', async () => {
  const harness = await makeHarness();
  const result = runInstaller(harness, { NED_TEST_CREATE_FAIL: '1' }, '');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /Daytona API key|credential-missing|synthetic-create-failure/i);
  assert.equal(await exists(path.join(harness.home, 'create.log')), false);
});

test('installed launcher preserves credential-free create dry-run', async () => {
  const harness = await makeHarness();
  assert.equal(runInstaller(harness).status, 0);
  const result = spawnSync(path.join(harness.home, '.local/bin/ned'), ['create', '--dry-run', '--json'], {
    env: { HOME: harness.home, PATH: '/usr/bin:/bin' }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"dryRun":true/);
});

test('production installer pins runtime and source versions with per-platform SHA-256 values', async () => {
  const text = await readFile(productionInstaller, 'utf8');
  assert.match(text, /NODE_VERSION=22\.14\.0/);
  assert.match(text, new RegExp(`NED_REVISION=${revision}`));
  for (const platform of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64']) {
    assert.match(text, new RegExp(`${platform.replace('-', '\\-')}:[a-f0-9]{64}`));
  }
});
