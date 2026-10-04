import { homedir } from 'node:os';
import { join, dirname, isAbsolute, relative } from 'node:path';
import { mkdir, open, rename, readFile, lstat, realpath } from 'node:fs/promises';
import { artifactFile } from './artifacts.js';
export const DEFAULT_COM_STATE = join(homedir(),'.ned','com.json');
export async function saveReceipt(path,receipt) {
 await mkdir(dirname(path),{recursive:true,mode:0o700});
 const temporary=path+'.'+receipt.capability.slice(0,12)+'.tmp';
 const handle=await open(temporary,'wx',0o600);
 try {await handle.writeFile(JSON.stringify(receipt,null,2)+'\n');} finally {await handle.close();}
 await rename(temporary,path);
}
export async function artifactLink(path,state=DEFAULT_COM_STATE) {
 if (!isAbsolute(path)) throw new Error('Artifact path must be absolute');
 const info=await lstat(state);
 if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077)) throw new Error('COM receipt must be a private 0600 file');
 const receipt=JSON.parse(await readFile(state,'utf8'));
 if(receipt.status!=='running' || !/^[a-f0-9]{64}$/.test(receipt.capability) || !Number.isInteger(receipt.pid)) throw new Error('COM receipt is stale; start ned serve again');
 try {process.kill(receipt.pid,0);} catch {throw new Error('COM process is not running; start ned serve again');}
 const root=await realpath(receipt.root);
 const lexicalRoot=receipt.approvedRoot && await realpath(receipt.approvedRoot)===root ? receipt.approvedRoot : root;
 let relativePath=relative(lexicalRoot,path);
 if(relativePath.startsWith('..') || isAbsolute(relativePath)) relativePath=relative(root,path);
 const {handle}=await artifactFile(root,relativePath,receipt.maxFileBytes);await handle.close();
 const local=new URL(receipt.localOrigin);
 if(local.protocol!=='http:' || local.hostname!=='127.0.0.1' || local.pathname!=='/' || local.username || local.password || local.search || local.hash) throw new Error('Invalid COM local origin');
 const prefix=`/s/${receipt.capability}/`;
 const health=await fetch(new URL(prefix+'api/health',local),{signal:AbortSignal.timeout(2000)}).catch(()=>null);
 if (!health?.ok || (await health.json()).instanceId!==receipt.instanceId) throw new Error('COM receipt is stale or server unavailable');
 const raw=new URL(prefix+'api/artifact',local);raw.searchParams.set('path',relativePath);
 if(!(await fetch(raw,{method:'HEAD',signal:AbortSignal.timeout(2000)})).ok) throw new Error('Artifact unavailable');
 const origin=receipt.publicOrigin || receipt.localOrigin;
 if(receipt.publicOrigin && !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(receipt.publicOrigin)) throw new Error('Invalid COM public origin');
 const url=new URL(prefix,origin);url.searchParams.set('artifact',relativePath);return url.href;
}
