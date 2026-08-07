import { execFile, spawn } from 'node:child_process';

export const BOTFATHER_URL = 'https://t.me/BotFather';
export const QUICKSTART_DOCS_URL = 'https://ned.datanav.app/docs/v1/quickstart/';
export const TELEGRAM_DOCS_URL = 'https://ned.datanav.app/docs/v1/telegram/';
export const CREDENTIALS_DOCS_URL = 'https://ned.datanav.app/docs/v1/credentials/';

const TOKEN_PATTERN = /^\d{5,20}:[A-Za-z0-9_-]{30,}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{5,32}$/;

export function redactTelegramText(value) {
  const text = String(value ?? '');
  if (/api\.telegram\.org\/bot/i.test(text) || /\d{5,20}:[A-Za-z0-9_-]{30,}/.test(text)) {
    return '[REDACTED]';
  }
  return text;
}

export async function openBotFather(url = BOTFATHER_URL) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  await new Promise((resolve) => {
    try {
      const child = spawn(command, args, { detached: true, stdio: 'ignore' });
      child.once('error', resolve);
      child.once('spawn', () => { child.unref(); resolve(); });
    } catch {
      resolve();
    }
  });
}

export async function readTelegramTokenFromKeychain() {
  if (process.platform !== 'darwin') return null;
  return new Promise((resolve) => {
    execFile('security', [
      'find-generic-password', '-s', 'no-ego-dev/telegram', '-a', 'TELEGRAM_BOT_TOKEN', '-w',
    ], { encoding: 'utf8', maxBuffer: 4_096 }, (error, stdout) => {
      if (error) resolve(null);
      else resolve(String(stdout || '').trim() || null);
    });
  });
}

export async function readHiddenTelegramToken(prompt = 'Paste the Telegram bot token (input hidden): ') {
  if (!process.stdin.isTTY || !process.stdin.setRawMode || !process.stderr.isTTY) {
    throw new Error(`Telegram setup needs an interactive TTY. See ${TELEGRAM_DOCS_URL}`);
  }
  process.stderr.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u0003' || character === '\u0004') {
          return finish(new Error(`Telegram setup cancelled. See ${TELEGRAM_DOCS_URL}`));
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

function recoveryError(kind) {
  const messages = {
    cancelled: `Telegram setup cancelled. Create or retrieve a disposable bot token, then retry. See ${TELEGRAM_DOCS_URL}`,
    invalid: `Telegram bot token is invalid or revoked. Return to BotFather, create or regenerate a disposable token, then retry. See ${TELEGRAM_DOCS_URL}`,
    identity: `Telegram returned an invalid bot identity. Regenerate the disposable token and retry. See ${TELEGRAM_DOCS_URL}`,
    timeout: `Telegram bot validation timed out. Check access to api.telegram.org and retry. See ${TELEGRAM_DOCS_URL}`,
    unavailable: `NED could not validate the Telegram bot. Check network access and retry. See ${TELEGRAM_DOCS_URL}`,
  };
  return new Error(messages[kind]);
}

export async function acquireTelegramConnection({
  log = console.log,
  openExternal = openBotFather,
  promptHidden = readHiddenTelegramToken,
  readStoredToken = readTelegramTokenFromKeychain,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
} = {}) {
  let token = await readStoredToken();
  if (!token) {
    log('Telegram requires you to create a bot through its official @BotFather; NED cannot accept BotFather legal or ownership actions for you.');
    log(`1. Open BotFather: ${BOTFATHER_URL}`);
    log('2. Send /newbot.');
    log('3. Choose a display name for the disposable bot.');
    log('4. Choose a unique username ending in bot.');
    log('5. Copy the token. NED will ask for it next with hidden input.');
    await openExternal(BOTFATHER_URL);
    token = await promptHidden('Paste the Telegram bot token (input hidden): ');
  }
  token = String(token ?? '').trim();
  if (!token) throw recoveryError('cancelled');
  if (!TOKEN_PATTERN.test(token)) throw recoveryError('invalid');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let body;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    body = await response.json();
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') throw recoveryError('timeout');
    throw recoveryError('unavailable');
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok || body?.ok !== true) throw recoveryError('invalid');
  const username = body?.result?.username;
  if (body?.result?.is_bot !== true || typeof username !== 'string'
      || !USERNAME_PATTERN.test(username) || !username.toLowerCase().endsWith('bot')) {
    throw recoveryError('identity');
  }

  let credential = token;
  token = '';
  let consumed = false;
  return Object.freeze({
    botUsername: username,
    botUrl: `https://t.me/${username}`,
    consumeToken() {
      if (consumed) throw new Error('Telegram credential was already consumed');
      consumed = true;
      const value = credential;
      credential = '';
      return value;
    },
    toJSON() {
      return { botUsername: username, botUrl: `https://t.me/${username}` };
    },
  });
}
