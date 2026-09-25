import { constants, openSync, closeSync, readFileSync, fstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DAYTONA_CREDENTIAL_ROOT = join(homedir(), '.config', 'no-ego-dev', 'secrets');
export const DAYTONA_CREDENTIAL_PATH = join(DAYTONA_CREDENTIAL_ROOT, 'daytona_api_key');

function isOwnerOnly(stat, mode) {
  return stat.uid === process.getuid() && (stat.mode & 0o777) === mode;
}

export function readDaytonaCredential({
  credentialRoot = DAYTONA_CREDENTIAL_ROOT,
  credentialPath = DAYTONA_CREDENTIAL_PATH,
  fs = { openSync, closeSync, readFileSync, fstatSync },
} = {}) {
  let rootDescriptor;
  let descriptor;
  try {
    rootDescriptor = fs.openSync(credentialRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const root = fs.fstatSync(rootDescriptor);
    if (!isOwnerOnly(root, 0o700)) throw new Error('credential root is not owner-only');
    descriptor = fs.openSync(credentialPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const credential = fs.fstatSync(descriptor);
    if (!isOwnerOnly(credential, 0o600)) throw new Error('credential file is not owner-only');
    const value = fs.readFileSync(descriptor, 'utf8').split(/\r?\n/, 1)[0].trim();
    if (!value) throw new Error('credential file is empty');
    return value;
  } catch {
    throw new Error('NED: Daytona authorization requires the owner-only runtime credential file. See QA.md; environment variables, Keychain, and alternate config files are not accepted.');
  } finally {
    if (rootDescriptor !== undefined) fs.closeSync(rootDescriptor);
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
