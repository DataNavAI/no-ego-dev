import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {IdentityError} from './identity-providers.js';

const unavailable = () => new IdentityError('aws_login_failed', 'AWS console sign-in failed. Check that AWS CLI v2 supports aws login, then retry.', 422);
const regionPattern = /^(?!us-(?:gov|iso)|cn-)[a-z]{2}(?:-[a-z]+)+-[1-9][0-9]?$/;

function awsCli(args, env, {launch, signal, input, onOutput, timeout}) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(unavailable());
    const child = launch('aws', args, {env, stdio:['pipe','pipe','pipe']});
    let output = '';
    let stderr = '';
    let failed = false;
    const stop = () => {failed = true; child.kill('SIGKILL');};
    const timer = setTimeout(stop, timeout).unref();
    signal.addEventListener('abort', stop, {once:true});
    child.stdin.on('error', () => {});
    child.stdout.setEncoding('utf8').on('data', chunk => {
      output += chunk;
      if (output.length > 32768) stop();
      else onOutput?.(output, stderr);
    });
    child.stderr.setEncoding('utf8').on('data', chunk => {
      stderr += chunk;
      if (stderr.length > 32768) stop();
      else onOutput?.(output, stderr);
    });
    child.once('error', () => {failed = true;});
    child.once('close', code => {
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
      if (code === 0 && !failed) resolve(output);
      else reject(unavailable());
    });
    if (input) input.then(code => {
      if (!failed) child.stdin.end(code + '\n');
    });
    else child.stdin.end();
  });
}

function challenge(output, region) {
  const hosts = new Set(['signin.aws.amazon.com', `signin.${region}.amazonaws.com`,
    `${region}.signin.aws.amazon.com`, `${region}.signin.aws`]);
  for (const value of output.match(/https:\/\/[^\s]+/g) || []) {
    try {
      const url = new URL(value);
      if (hosts.has(url.hostname)
        && !url.username && !url.password && !url.port && !url.hash
        && /(^|\/)authorize$/.test(url.pathname) && url.search) return url.href;
    } catch { /* Ignore non-URL CLI output. */ }
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, refuse) => {resolve = accept; reject = refuse;});
  return {promise, resolve, reject};
}

export async function startAwsConsoleLogin(region, {launch = spawn, signal, env, clock}) {
  if (!regionPattern.test(region)) throw new IdentityError('invalid_input', 'Enter a commercial AWS region, such as us-east-1.');
  const home = await mkdtemp(join(tmpdir(), 'ned-aws-login-'));
  const cliEnv = {
    PATH:env?.PATH || process.env.PATH, LANG:'C.UTF-8', PYTHONUNBUFFERED:'1', HOME:home, USERPROFILE:home,
    XDG_CONFIG_HOME:home, AWS_CONFIG_FILE:join(home,'config'), AWS_SHARED_CREDENTIALS_FILE:join(home,'credentials'),
    AWS_LOGIN_CACHE_DIRECTORY:join(home,'login'), AWS_EC2_METADATA_DISABLED:'true',
    AWS_PAGER:'', AWS_CLI_AUTO_PROMPT:'off', AWS_REGION:region, AWS_DEFAULT_REGION:region,
  };
  const {promise:url, resolve:ready, reject:failed} = deferred();
  const {promise:input, resolve:submit} = deferred();
  const options = {launch, signal, timeout:30000};
  const startTimer = setTimeout(() => failed(unavailable()), 10000).unref();
  const completed = (async () => {
    try {
      await awsCli(['login','--remote','--region',region], cliEnv, {
        ...options, timeout:600000, input,
        onOutput(stdout, stderr) {
          // Wait for a complete URL line before handing it to the browser.
          const value = challenge(stdout.split('\n').slice(0,-1).join('\n'), region)
            || challenge(stderr.split('\n').slice(0,-1).join('\n'), region);
          if (value) ready(value);
        },
      });
      const credentials = JSON.parse(await awsCli(['configure','export-credentials','--format','process'], cliEnv, options));
      const {AccessKeyId, SecretAccessKey, SessionToken, Expiration} = credentials;
      const expiresAt = Date.parse(Expiration);
      if (credentials.Version !== 1 || ![AccessKeyId,SecretAccessKey,SessionToken].every(value => typeof value === 'string' && /^[!-~]{1,8192}$/.test(value))
        || !Number.isFinite(expiresAt) || expiresAt <= clock()) throw unavailable();
      const auth = {AWS_ACCESS_KEY_ID:AccessKeyId, AWS_SECRET_ACCESS_KEY:SecretAccessKey, AWS_SESSION_TOKEN:SessionToken,
        AWS_REGION:region, AWS_DEFAULT_REGION:region};
      const {Account, Arn} = JSON.parse(await awsCli(['sts','get-caller-identity','--output','json'], {...cliEnv,...auth}, options));
      if (typeof Account !== 'string' || !/^\d{12}$/.test(Account) || typeof Arn !== 'string'
        || !/^[!-~]{1,2048}$/.test(Arn) || !Arn.startsWith('arn:aws:') || Arn.split(':')[4] !== Account
        || Arn.endsWith(':root')) throw unavailable();
      return {identity:{account:Account, arn:Arn, region}, expiresAt, consoleCredentials:auth};
    } catch {
      failed(unavailable());
      throw unavailable();
    } finally {
      clearTimeout(startTimer);
      await rm(home, {recursive:true, force:true});
    }
  })();
  void completed.catch(() => {});
  return {url:await url, submit(code) {submit(code); return completed;}};
}
