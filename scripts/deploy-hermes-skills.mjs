#!/usr/bin/env node
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../skills');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--home' || !args[1])) {
  console.error('Usage: node scripts/deploy-hermes-skills.mjs [--home <disposable-Hermes-home>]');
  process.exit(2);
}
const home = resolve(args[1] || join(homedir(), '.hermes'));
const target = join(home, 'skills');
const lock = join(home, '.ned-skills-deploy.lock');
let locked = false;
let staging;
let backup;
const installed = [];
const saved = [];
const excluded = (name) => ['__pycache__', '.DS_Store', '.git', 'node_modules', '.pytest_cache'].includes(name) || /\.(pyc|sqlite|db)(-|$)/.test(name);
async function exists(path) {
  try { return await lstat(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
async function validate(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) throw new Error('Skill trees and target directories must not be symlinks.');
  if (info.isDirectory()) for (const entry of await readdir(path)) {
    if (!excluded(entry)) await validate(join(path, entry));
  }
  else if (!info.isFile()) throw new Error('Unsupported skill file type.');
}
try {
  // Never accept an arbitrary profile override from HERMES_HOME.
  if (home === source || home.startsWith(`${source}/`) || target === source || source.startsWith(`${target}/`)) throw new Error('Target overlaps source.');
  await mkdir(home, { recursive: true });
  if ((await lstat(home)).isSymbolicLink()) throw new Error('Hermes home must not be a symlink.');
  const realHome = await realpath(home);
  const realSource = await realpath(source);
  const realTarget = join(realHome, 'skills');
  if (realHome === realSource || realHome.startsWith(`${realSource}/`) || realTarget === realSource || realSource.startsWith(`${realTarget}/`))
    throw new Error('Resolved target overlaps source.');
  await mkdir(lock);
  locked = true;
  const targetInfo = await exists(target);
  if (targetInfo?.isSymbolicLink()) throw new Error('Skills target must not be a symlink.');
  await mkdir(target, { recursive: true });
  const names = (await readdir(source)).sort();
  const skills = [];
  for (const name of names) {
    const path = join(source, name);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error('Source skills must not be symlinks.');
    if (!info.isDirectory()) continue;
    await validate(path);
    await readFile(join(path, 'SKILL.md'), 'utf8');
    await readFile(join(path, 'EVAL.yaml'), 'utf8');
    const existing = await exists(join(target, name));
    if (existing?.isSymbolicLink()) throw new Error(`Target skill ${name} must not be a symlink.`);
    skills.push(name);
  }
  staging = await mkdtemp(join(home, '.ned-skills-stage-'));
  backup = await mkdtemp(join(home, '.ned-skills-backup-'));
  for (const name of skills) await cp(join(source, name), join(staging, name), {
    recursive: true, filter: (path) => !excluded(path.split('/').at(-1)),
  });
  for (const name of skills) {
    if (await exists(join(target, name))) {
      await rename(join(target, name), join(backup, name));
      saved.push(name);
    }
    await rename(join(staging, name), join(target, name));
    installed.push(name);
  }
  console.log(`Deployed ${skills.length} NED skills to ${target}. Backup: ${backup}. Start a fresh Hermes session to load updated instructions.`);
} catch (error) {
  // A failed replacement restores every touched skill; unrelated skills are untouched.
  for (const name of installed.reverse()) await rm(join(target, name), { recursive: true, force: true });
  for (const name of saved.reverse()) await rename(join(backup, name), join(target, name));
  console.error(`Skills deployment failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (staging) await rm(staging, { recursive: true, force: true });
  if (locked) await rm(lock, { recursive: true, force: true });
}
