import { constants } from 'node:fs';
import { lstat, realpath, readdir, open } from 'node:fs/promises';
import { extname, join, relative, isAbsolute } from 'node:path';

export const TYPES = {
 '.md': ['markdown','text/plain; charset=utf-8'], '.markdown': ['markdown','text/plain; charset=utf-8'],
 '.txt': ['text','text/plain; charset=utf-8'], '.json': ['text','text/plain; charset=utf-8'], '.csv': ['text','text/plain; charset=utf-8'],
 '.html': ['text','text/plain; charset=utf-8'], '.svg': ['text','text/plain; charset=utf-8'], '.yaml': ['text','text/plain; charset=utf-8'], '.yml': ['text','text/plain; charset=utf-8'],
 '.png': ['image','image/png'], '.jpg': ['image','image/jpeg'], '.jpeg': ['image','image/jpeg'], '.gif': ['image','image/gif'], '.webp': ['image','image/webp'],
 '.mp4': ['video','video/mp4'], '.webm': ['video','video/webm'], '.mov': ['video','video/quicktime'],
 '.mp3': ['audio','audio/mpeg'], '.wav': ['audio','audio/wav'], '.ogg': ['audio','audio/ogg'], '.m4a': ['audio','audio/mp4'], '.pdf': ['pdf','application/pdf'],
};
const PRIVATE = /(?:env|auth|private|credential|secret|backup|(?:^|[._\s-])bak(?:[._\s-]|$)|log|runtime|session|memor(?:y|ies)|owner|setting|inspection|config|token|key|password)/i;
export function approved(path) {
 return typeof path === 'string' && path.length > 0 && path.length < 4096 && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0') &&
 path.split('/').every(p => p && p !== '..' && p !== '.' && !p.startsWith('.') && !PRIVATE.test(p)) && !!TYPES[extname(path).toLowerCase()];
}
export function failure(status, message) { return Object.assign(new Error(message), { status }); }
export async function artifactFile(root, path, maxFileBytes, excluded = new Set()) {
 if (!approved(path) || excluded.has(path)) throw failure(404,'Artifact unavailable');
 let current = root;
 for (const part of path.split('/')) { current = join(current,part); const info = await lstat(current); if (info.isSymbolicLink()) throw failure(404,'Artifact unavailable'); }
 const canonical = await realpath(current);
 const rel = relative(root,canonical);
 if (rel.startsWith('..') || isAbsolute(rel)) throw failure(404,'Artifact unavailable');
 const handle = await open(current,constants.O_RDONLY | constants.O_NOFOLLOW);
 try {
  const info = await handle.stat();
  // Recheck after opening to fail closed on path replacements.
  if (await realpath(current) !== canonical || !info.isFile()) throw failure(404,'Artifact unavailable');
  const again = await lstat(current);
  if (again.dev !== info.dev || again.ino !== info.ino) throw failure(404,'Artifact unavailable');
  if (info.size > maxFileBytes) throw failure(413,'Artifact exceeds viewer size limit');
  return { handle, info, type: TYPES[extname(path).toLowerCase()] };
 } catch (error) { await handle.close(); throw error; }
}
export async function listArtifacts(root, { maxFileBytes, maxScanEntries, excluded }) {
 const artifacts = []; let scanned = 0;
 async function walk(dir, prefix = '', depth = 0) {
  if (depth > 32) throw failure(413,'Artifact directory depth limit exceeded');
  const directory = await readdir(dir,{withFileTypes:true});
  for (const entry of directory) {
   if (++scanned > maxScanEntries) throw failure(413,'Artifact scan limit exceeded; choose a smaller review directory');
   if (entry.name.startsWith('.') || PRIVATE.test(entry.name) || entry.isSymbolicLink()) continue;
   const path = prefix + entry.name;
   if (entry.isDirectory()) { await walk(join(dir,entry.name),path+'/',depth+1); continue; }
   if (!approved(path)) continue;
   try {
    const { handle, info, type } = await artifactFile(root,path,maxFileBytes,excluded); await handle.close();
    artifacts.push({path,type:type[0],size:info.size,createdAt:info.birthtime.toISOString(),modifiedAt:info.mtime.toISOString(),updatedAt:Math.max(info.birthtimeMs,info.mtimeMs)});
   } catch { /* Files can disappear during a live scan; private/oversized files stay excluded. */ }
  }
 }
 await walk(root);
 artifacts.sort((a,b)=>b.updatedAt-a.updatedAt || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
 return artifacts;
}
