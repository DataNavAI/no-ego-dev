import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {sourceRevision} from '../src/version.js';

const args=process.argv.slice(2);
if(args.length>1)throw new Error('Usage: node scripts/stamp-version.mjs [full-commit-SHA]');
const known=sourceRevision();
const revision=args[0]||known;
if(revision!==null&&!/^[a-f0-9]{40}$/.test(revision))throw new Error('Build revision must be a full commit SHA');
if(args[0]&&known&&known!==revision)throw new Error('Build revision does not match source');
writeFileSync(fileURLToPath(new URL('../build-info.json',import.meta.url)),JSON.stringify({revision})+'\n');
