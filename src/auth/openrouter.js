import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function defaultOpenBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

export async function authorizeOpenRouter({
  openBrowser = defaultOpenBrowser,
  fetchImpl = globalThis.fetch,
  timeoutMs = 300_000,
} = {}) {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const callbackToken = base64url(randomBytes(24));
  const callbackPath = `/callback/${callbackToken}`;

  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname !== callbackPath) {
        response.writeHead(404).end('Not found');
        return;
      }
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' }).end('Method not allowed');
        return;
      }
      const oauthError = url.searchParams.get('error');
      if (oauthError) {
        response.writeHead(400, { 'cache-control': 'no-store' }).end('Authorization was not completed.');
        rejectCode(new Error(`OpenRouter authorization failed: ${oauthError}`));
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        response.writeHead(400).end('Authorization code missing.');
        return;
      }
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
      });
      response.end('<h1>OpenRouter connected</h1><p>You can close this window and return to NED.</p>');
      resolveCode(code);
    } catch (error) {
      response.writeHead(400).end('Authorization failed.');
      rejectCode(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const callbackUrl = `http://127.0.0.1:${address.port}${callbackPath}`;
  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('callback_url', callbackUrl);

  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const timeout = setTimeout(() => rejectCode(new Error('OpenRouter authorization timed out')), timeoutMs);
  try {
    await openBrowser(authUrl.toString());
    const code = await codePromise;
    const response = await fetchImpl('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        code_challenge_method: 'S256',
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter key exchange failed with HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload.key) {
      throw new Error('OpenRouter key exchange returned no key');
    }
    return payload.key;
  } finally {
    clearTimeout(timeout);
    await new Promise((resolve) => server.close(resolve));
  }
}
